<?php
/**
 * Plugin Name: HackKnow — Free-Order Direct Delivery
 * Description: Registers POST /wp-json/hackknow/v1/order-free that creates
 *              a WooCommerce order with status=completed for carts whose
 *              every line item has price=0 AND is downloadable AND has a
 *              file attached. Bypasses Razorpay entirely. On success,
 *              fires the `hackknow_free_order_completed` action which the
 *              DLQ-backed mailer (zz-hk-mail-dlq.php) listens to in order
 *              to deliver the download links via authenticated SMTP with
 *              automatic retry on transient failures.
 *
 *              Loads AFTER hackknow-checkout.php thanks to the zz- prefix,
 *              so its hackknow_verify_token() / hackknow_extract_bearer()
 *              helpers are available.
 *
 * Version:     1.0.0
 *
 * Standing-rules safety:
 *   - hackknow-checkout.php is NOT modified (this is a separate file)
 *   - zz-hackknow-payment-fix.php is NOT modified
 *   - The paid /order route is left untouched
 *   - Server-side hard assertion: any item with non-zero price → 422
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Ensure the dedicated free-grant reservation table exists.
 *
 * Created once via dbDelta on init when the schema-version option
 * doesn't match. The table has a UNIQUE KEY on (user_id, product_id),
 * giving us a true atomic CAS primitive: INSERT IGNORE returns
 * affected_rows=1 if we won the race, 0 if another worker already
 * reserved this (user, product). No lock-then-check race window
 * possible — the InnoDB unique-key constraint IS the lock.
 *
 * Schema:
 *   id          PK auto-increment (audit trail)
 *   user_id     BIGINT  the WP user
 *   product_id  BIGINT  the WC product
 *   granted_at  DATETIME when the reservation was won
 *   order_id    BIGINT  the WC order_id once the order is committed
 *                       (NULL while in flight; stamped after
 *                       update_status('completed') in the same request)
 *   UNIQUE KEY uniq_uid_pid (user_id, product_id)
 */
function hk_free_ensure_grants_table() {
    global $wpdb;
    $opt = 'hk_free_grants_schema_v1';
    if ( get_option( $opt ) === '1' ) return;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset_collate = $wpdb->get_charset_collate();
    $table = $wpdb->prefix . 'hk_free_grants';
    $sql = "CREATE TABLE {$table} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        order_id BIGINT UNSIGNED DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_uid_pid (user_id, product_id),
        KEY idx_order (order_id)
    ) {$charset_collate};";
    dbDelta( $sql );
    update_option( $opt, '1', false );
}
add_action( 'init', 'hk_free_ensure_grants_table', 1 );

add_action( 'rest_api_init', function () {
    register_rest_route( 'hackknow/v1', '/order-free', [
        'methods'  => 'POST',
        'callback' => 'hk_free_order_create',
        'permission_callback' => '__return_true',  // auth done inside (returns 401 with JSON)
    ] );
} );

/**
 * Pull bearer token from the Authorization header. Mirrors
 * hackknow_extract_bearer() but works with our own WP_REST_Request.
 */
function hk_free_extract_bearer( WP_REST_Request $req ) {
    $h = $req->get_header( 'authorization' );
    if ( ! $h && function_exists( 'apache_request_headers' ) ) {
        $hdrs = apache_request_headers();
        $h = $hdrs['Authorization'] ?? ( $hdrs['authorization'] ?? '' );
    }
    if ( ! $h || stripos( $h, 'Bearer ' ) !== 0 ) { return ''; }
    return trim( substr( $h, 7 ) );
}

function hk_free_order_create( WP_REST_Request $req ) {
    // ── 1. Auth ────────────────────────────────────────────────────────
    if ( ! function_exists( 'hackknow_verify_token' ) ) {
        return new WP_Error( 'config_error', 'Auth helper not available', [ 'status' => 500 ] );
    }
    $uid = hackknow_verify_token( hk_free_extract_bearer( $req ) );
    if ( ! $uid ) {
        return new WP_Error( 'unauthorized', 'Please log in to claim free downloads.', [ 'status' => 401 ] );
    }
    $user = get_user_by( 'id', $uid );
    if ( ! $user ) {
        return new WP_Error( 'unauthorized', 'Account not found.', [ 'status' => 401 ] );
    }

    // ── 2. WooCommerce sanity ──────────────────────────────────────────
    if ( ! function_exists( 'wc_create_order' ) || ! function_exists( 'wc_get_product' ) ) {
        return new WP_Error( 'no_woocommerce', 'Store is not available right now.', [ 'status' => 503 ] );
    }

    // ── 2b. Idempotency lock (server-side dedupe) ─────────────────────
    //   Computes a SHA1 of (user_id + sorted cart fingerprint) and uses
    //   set_transient as a 30-second mutex. A second click that reaches
    //   here within 30s while the first request is still processing —
    //   even if the React ref-guard somehow lets it through — gets a
    //   409 immediately, not a second order. The transient auto-expires
    //   so we never need a cleanup job.
    $items_for_fp = $req->get_param( 'items' );
    if ( is_array( $items_for_fp ) ) {
        $fp_input = array_map( function ( $i ) {
            return absint( $i['product_id'] ?? 0 ) . 'x' . max( 1, absint( $i['quantity'] ?? 1 ) );
        }, $items_for_fp );
        sort( $fp_input );
        $fingerprint = sha1( $uid . '|' . implode( ',', $fp_input ) );
        $lock_key    = 'hk_free_lock_' . $fingerprint;
        if ( get_transient( $lock_key ) ) {
            return new WP_Error( 'duplicate_request',
                'A previous identical request is still being processed. Please wait a few seconds.',
                [ 'status' => 409 ] );
        }
        set_transient( $lock_key, time(), 30 );  // 30s mutex
    }

    // ── 3. Validate input shape ────────────────────────────────────────
    $items = $req->get_param( 'items' );
    if ( ! is_array( $items ) || empty( $items ) ) {
        return new WP_Error( 'bad_request', 'Cart is empty.', [ 'status' => 400 ] );
    }
    $email = sanitize_email( (string) ( $req->get_param( 'email' ) ?? $user->user_email ) );
    $first = sanitize_text_field( (string) ( $req->get_param( 'first_name' ) ?? $user->first_name ?? '' ) );
    $last  = sanitize_text_field( (string) ( $req->get_param( 'last_name' )  ?? $user->last_name  ?? '' ) );
    if ( ! $email ) {
        return new WP_Error( 'bad_request', 'A valid email is required.', [ 'status' => 400 ] );
    }

    // ── 4. Hard validation: every item must be price=0 + downloadable + has file
    $not_free      = [];
    $undeliverable = [];
    $resolved      = [];
    foreach ( $items as $i ) {
        $pid = absint( $i['product_id'] ?? 0 );
        $qty = max( 1, absint( $i['quantity'] ?? 1 ) );
        if ( ! $pid ) { continue; }
        $product = wc_get_product( $pid );
        if ( ! $product ) {
            $undeliverable[] = "#$pid (not found)";
            continue;
        }
        // Price assertion — handles both '' and '0' and '0.00'
        $price_raw = $product->get_price();
        $price_num = ( $price_raw === '' || $price_raw === null ) ? 0.0 : (float) $price_raw;
        if ( $price_num > 0 ) {
            $not_free[] = $product->get_name() . " (#$pid, ₹$price_num)";
            continue;
        }
        // Downloadable + file assertion (mirrors the guard in hackknow_create_order)
        if ( ! $product->is_downloadable() ) {
            $undeliverable[] = $product->get_name() . " (#$pid not downloadable)";
            continue;
        }
        $has_any = false;
        foreach ( (array) $product->get_downloads() as $f ) {
            if ( is_object( $f ) && method_exists( $f, 'get_file' ) && $f->get_file() ) {
                $has_any = true; break;
            }
        }
        if ( ! $has_any ) {
            $undeliverable[] = $product->get_name() . " (#$pid no file)";
            continue;
        }
        // FREE-PRODUCT INVARIANT (server-side authoritative): one digital
        // file = one download permission row. Hard-cap qty=1 regardless
        // of what the client sent. Prevents the My-Downloads-shows-N-copies
        // bug where a stale cart with quantity>1 would multiply rows.
        $resolved[] = [ 'product' => $product, 'qty' => 1 ];
    }

    if ( ! empty( $not_free ) ) {
        return new WP_Error( 'paid_in_free_cart',
            'These items are not free — please use the standard Checkout: ' . implode( ', ', $not_free ),
            [ 'status' => 422 ] );
    }
    if ( ! empty( $undeliverable ) ) {
        return new WP_Error( 'undeliverable',
            'These items are not currently available for direct download: ' . implode( ', ', $undeliverable ),
            [ 'status' => 422 ] );
    }
    if ( empty( $resolved ) ) {
        return new WP_Error( 'bad_request', 'No valid items in cart.', [ 'status' => 400 ] );
    }

    // ── 4b. De-dupe resolved list by product_id (defence in depth) ───
    //   The client already de-dupes, but treat that as untrusted. If two
    //   items in the resolved list refer to the same product, collapse to
    //   one — guarantees one product → one download row.
    $resolved_unique = [];
    $seen_pids = [];
    foreach ( $resolved as $r ) {
        $pid = (int) $r['product']->get_id();
        if ( in_array( $pid, $seen_pids, true ) ) { continue; }
        $seen_pids[] = $pid;
        $resolved_unique[] = $r;
    }
    $resolved = $resolved_unique;

    // ── 4c. ABSOLUTE IDEMPOTENCY — atomic INSERT IGNORE on reservation row
    //
    //   Architect-flagged race window (corrected here): the prior
    //   GET_LOCK + COUNT(*) approach released the MySQL session lock
    //   BEFORE wc_create_order ran the actual permission insert. Two
    //   workers could both pass the COUNT check (locks serialize but
    //   the row insert happens AFTER the lock release), then both
    //   create orders, both grant permissions for the same
    //   (user, product) — duplicate downloads + duplicate emails.
    //
    //   This block uses InnoDB's UNIQUE KEY constraint as the atomic
    //   compare-and-swap primitive. The reservation table
    //   {prefix}hk_free_grants has UNIQUE KEY (user_id, product_id).
    //   For each requested product:
    //
    //     1. INSERT IGNORE INTO {prefix}hk_free_grants (user_id, product_id, granted_at)
    //        VALUES (%d, %d, NOW())
    //
    //     2. If $wpdb->rows_affected === 1 → we won the race, this
    //        worker owns the grant. Proceed to add_product / create order.
    //
    //     3. If $wpdb->rows_affected === 0 → row already exists. ANOTHER
    //        worker already reserved (or has previously granted) this
    //        (user, product). Skip this product entirely — the other
    //        worker will create the permission row.
    //
    //   The reservation IS the lock. There is no window between check
    //   and write — InnoDB enforces the unique-key constraint at the
    //   row level, atomically. Two concurrent INSERT IGNOREs from
    //   different workers cannot both succeed.
    //
    //   On order-creation failure, the catch block below DELETEs our
    //   winning reservations (where order_id IS NULL, i.e. still
    //   in-flight) so a legitimate retry can re-acquire them. On
    //   success, the order_id column is stamped after
    //   update_status('completed') for audit.
    global $wpdb;
    $grants_table = $wpdb->prefix . 'hk_free_grants';

    $kept = [];
    $skipped = [];
    $reserved_pids = [];   // pids THIS worker successfully reserved
    foreach ( $resolved as $r ) {
        $pid = (int) $r['product']->get_id();

        // ATOMIC compare-and-swap via UNIQUE KEY constraint
        $wpdb->query( $wpdb->prepare(
            "INSERT IGNORE INTO {$grants_table} (user_id, product_id, granted_at)
             VALUES (%d, %d, %s)",
            $uid, $pid, current_time( 'mysql', 1 )
        ) );

        if ( (int) $wpdb->rows_affected === 1 ) {
            // We won the race for this (user, product)
            $reserved_pids[] = $pid;
            $kept[] = $r;
        } else {
            // Either we previously granted it OR a concurrent worker
            // just won the race. Either way: SKIP — the user owns
            // (or is about to own) this product.
            $skipped[] = $r['product']->get_name() . " (#$pid already reserved)";
        }
    }

    if ( empty( $kept ) ) {
        if ( isset( $lock_key ) ) { delete_transient( $lock_key ); }
        // 200 OK with already_granted flag — frontend treats this as a
        // SUCCESS path (no error toast). The user already owns these
        // downloads (we hold reservation rows for every requested item).
        return new WP_REST_Response( [
            'ok'              => true,
            'already_granted' => true,
            'skipped'         => $skipped,
            'message'         => 'You already own these downloads. Refresh "My Downloads" to see them.',
        ], 200 );
    }
    $resolved = $kept;

    // ── 5. Create the order, attach items, set billing ─────────────────
    try {
        $order = wc_create_order( [ 'status' => 'pending', 'customer_id' => $uid ] );
        foreach ( $resolved as $r ) {
            $order->add_product( $r['product'], $r['qty'] );
        }
        $order->set_billing_email( $email );
        $order->set_billing_first_name( $first );
        $order->set_billing_last_name( $last );
        $order->set_payment_method( 'hk_free' );
        $order->set_payment_method_title( 'YAVI Free Delivery' );
        $order->calculate_totals();

        // ── 6. Hard server-side parity check ───────────────────────────
        $total = (float) $order->get_total();
        if ( $total > 0.0001 ) {
            $order->update_status( 'cancelled', 'HackKnow free-order: total > 0 after calc (' . $total . '), aborting.' );
            return new WP_Error( 'price_drift',
                'Cart total is not zero after calculation. Please refresh and try again.',
                [ 'status' => 422 ] );
        }

        // ── 7. Complete the order — triggers WC's grant_download_permissions
        //      and our wp_mail-based delivery via the action below.
        $order->update_status( 'completed', 'HackKnow free order — auto-granted at ' . current_time( 'mysql' ) );
        $order->save();

        // Stamp the just-created order_id onto our reservation rows so
        // they are no longer eligible for catch-block rollback. order_id
        // stays NULL between INSERT IGNORE (step 4c) and this line so
        // the rollback can safely DELETE only un-stamped (in-flight) rows.
        if ( ! empty( $reserved_pids ) ) {
            $placeholders = implode( ',', array_fill( 0, count( $reserved_pids ), '%d' ) );
            $params = array_merge( [ (int) $order->get_id(), $uid ], $reserved_pids );
            $wpdb->query( $wpdb->prepare(
                "UPDATE {$grants_table} SET order_id = %d
                  WHERE user_id = %d AND product_id IN ({$placeholders})
                    AND order_id IS NULL",
                $params
            ) );
        }

        // ── 8. Build the download list to return + email ───────────────
        $downloads = hk_free_collect_downloads( $order );

        // ── 9. Fire the action the DLQ mailer listens to (async-friendly) ──
        do_action( 'hackknow_free_order_completed', $order->get_id(), $uid, [
            'email'     => $email,
            'first'     => $first,
            'downloads' => $downloads,
        ] );

        if ( isset( $lock_key ) ) { delete_transient( $lock_key ); }
        return rest_ensure_response( [
            'ok'           => true,
            'wc_order_id'  => $order->get_id(),
            'order_number' => (string) $order->get_order_number(),
            'email'        => $email,
            'downloads'    => $downloads,
        ] );
    } catch ( Throwable $e ) {
        if ( isset( $lock_key ) ) { delete_transient( $lock_key ); }
        // Roll back the reservation rows this worker won so a legitimate
        // retry can re-acquire them. order_id IS NULL guarantees we only
        // delete still-in-flight reservations (never a successfully-stamped
        // grant from a parallel worker that already committed).
        if ( ! empty( $reserved_pids ) ) {
            $placeholders = implode( ',', array_fill( 0, count( $reserved_pids ), '%d' ) );
            $params = array_merge( [ $uid ], $reserved_pids );
            $wpdb->query( $wpdb->prepare(
                "DELETE FROM {$grants_table}
                  WHERE user_id = %d AND product_id IN ({$placeholders})
                    AND order_id IS NULL",
                $params
            ) );
        }
        error_log( '[hk-free-order] EXCEPTION: ' . $e->getMessage() );
        return new WP_Error( 'server_error', 'Could not complete the free order. Please try again.', [ 'status' => 500 ] );
    }
}

/**
 * Returns a normalized list of {product_id, product_name, download_name, download_url}
 * for every WC download permission the order just granted. Matches the
 * shape used by /verify so the React side can render either result with
 * the same component (VerifyDownloadFile interface in checkout-api.ts).
 */
function hk_free_collect_downloads( WC_Order $order ): array {
    $out = [];
    if ( ! function_exists( 'wc_get_customer_download_permissions' ) ) { return $out; }

    // WC stores download permissions per order — fetch them after the
    // status flip above. download_id is keyed per file inside the product.
    foreach ( $order->get_items() as $item ) {
        $product = $item->get_product();
        if ( ! $product ) { continue; }
        $pid = $product->get_id();
        foreach ( (array) $product->get_downloads() as $download_id => $f ) {
            if ( ! is_object( $f ) || ! method_exists( $f, 'get_file' ) || ! $f->get_file() ) { continue; }
            $name = method_exists( $f, 'get_name' ) ? $f->get_name() : 'download';
            // Build a customer-specific download URL (signed by WC).
            $url = '';
            if ( function_exists( 'wc_get_endpoint_url' ) ) {
                $url = $product->get_file_download_path( $download_id );
            }
            $out[] = [
                'product_id'    => $pid,
                'product_name'  => $product->get_name(),
                'download_name' => (string) $name,
                'download_url'  => (string) $url,
            ];
        }
    }
    return $out;
}
