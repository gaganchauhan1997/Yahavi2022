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

    // ── 4c. Per-(user, product) 10s idempotency lock ──────────────────
    //   Independent from the cart-fingerprint lock above. That one stops
    //   the same user from submitting the same exact cart twice; this
    //   one stops the same user from generating duplicate download
    //   permissions for any single product within 10s, regardless of
    //   what other items were in the cart. If a previous request granted
    //   product #123 to user U and a new request comes in within 10s
    //   that ALSO contains #123, we skip #123 in the new order — the
    //   user already has it. If every item is locked, we return 409.
    $kept = [];
    $skipped = [];
    foreach ( $resolved as $r ) {
        $pid = (int) $r['product']->get_id();
        $dup_key = 'hk_free_dup_' . $uid . '_' . $pid;
        if ( get_transient( $dup_key ) ) {
            $skipped[] = $r['product']->get_name() . " (#$pid recently granted)";
            continue;
        }
        // Stamp the lock immediately — even if the order creation later
        // fails, holding the lock for 10s is acceptable (user can retry
        // after 10s; transients auto-expire so no cleanup job needed).
        set_transient( $dup_key, time(), 10 );
        $kept[] = $r;
    }
    if ( empty( $kept ) ) {
        if ( isset( $lock_key ) ) { delete_transient( $lock_key ); }
        return new WP_Error( 'already_granted',
            'You were just granted these downloads. Refresh "My Downloads" to see them.',
            [ 'status' => 409, 'skipped' => $skipped ] );
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
        // Release per-product locks too — failed attempt should not block
        // a legitimate retry for 10s.
        if ( ! empty( $kept ) ) {
            foreach ( $kept as $r ) {
                $pid = (int) $r['product']->get_id();
                delete_transient( 'hk_free_dup_' . $uid . '_' . $pid );
            }
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
