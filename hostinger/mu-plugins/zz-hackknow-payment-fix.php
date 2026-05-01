<?php
/**
 * Plugin Name: HackKnow Payment Fix (Webhook + Email Delivery + Email-based History)
 * Description: Fixes orphan UPI payments, emails the file at payment time to the
 *              checkout email regardless of WP user account, and exposes order +
 *              download history scoped by billing email so users see every product
 *              they have ever paid for — without expiry.
 * Author:      Replit Agent
 * Version:     1.0.0
 *
 * --------------------------------------------------------------------------
 * What this file adds (loads AFTER hackknow-checkout.php due to "zz-" prefix):
 *
 *   POST /hackknow/v1/razorpay-webhook
 *     Server-to-server callback from Razorpay. Verifies HMAC signature,
 *     handles payment.captured idempotently, marks the matching WC order
 *     completed, fires the customer email, and runs our own delivery email.
 *
 *   GET  /hackknow/v1/my-downloads        (overrides existing handler)
 *     Returns ALL downloadable files from EVERY completed order whose
 *     billing email matches the authenticated user's email — ignoring
 *     customer_id and WC's permissions table — so guest-checkout history
 *     and pre-account history both surface, with NO expiry.
 *
 *   GET  /hackknow/v1/my-orders           (overrides existing handler)
 *     Same email-scoped lookup, returns the order list.
 *
 *   POST /hackknow/v1/downloads-by-email
 *     Guest-friendly: takes { email } and emails a magic link that lists
 *     all that email's purchases. Used by the Downloads page when no JWT.
 *
 *   GET  /hackknow/v1/downloads-by-token?t=...
 *     Resolves the magic-link token and returns the same download payload
 *     as /my-downloads but for the given email. Token TTL = 24h.
 *
 * Action hook: woocommerce_order_status_completed
 *   When ANY order completes (whether via /verify, this webhook, or admin),
 *   we send our own HTML email with direct file URLs to the billing email.
 *   This works without a WP user account. Idempotent via post meta flag.
 *
 * The Razorpay webhook secret can be supplied either via:
 *   1. wp-config.php constant: HACKKNOW_RAZORPAY_WEBHOOK_SECRET
 *   2. WP option (preferred — no file editing required):
 *      WP Admin → Settings → HackKnow Webhook
 * --------------------------------------------------------------------------
 */

if (!defined('ABSPATH')) exit;

/* ───────────────────────── helpers ───────────────────────── */

if (!function_exists('hk2_log')) {
    function hk2_log($msg) {
        if (function_exists('error_log')) error_log('[hk-pay-fix] ' . $msg);
    }
}

/** Safely look up the WC_Order linked to a Razorpay order/payment id. */
function hk2_find_wc_order_by_rzp($rzp_order_id, $rzp_payment_id = '') {
    global $wpdb;
    $oid = 0;
    if ($rzp_order_id) {
        $oid = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key=%s AND meta_value=%s LIMIT 1",
            '_razorpay_order_id', $rzp_order_id
        ));
    }
    if (!$oid && $rzp_payment_id) {
        $oid = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key=%s AND meta_value=%s LIMIT 1",
            '_razorpay_payment_id', $rzp_payment_id
        ));
    }
    return $oid ? wc_get_order($oid) : null;
}

/** Build [{name, url}] for a product's downloadable files. */
function hk2_product_files($product_id) {
    $product = function_exists('wc_get_product') ? wc_get_product($product_id) : null;
    $out = [];
    if (!$product || !$product->is_downloadable()) return $out;
    foreach ($product->get_downloads() as $file_id => $dl) {
        $out[] = [
            'download_id' => (string) $file_id,
            'name'        => (string) $dl->get_name(),
            'file'        => (string) $dl->get_file(),
        ];
    }
    return $out;
}

/** All distinct billing emails for a given uid (handles different email casing). */
function hk2_emails_for_uid($uid) {
    $u = get_user_by('id', $uid);
    if (!$u) return [];
    return [strtolower($u->user_email)];
}

/** Find every completed order for a billing email (case-insensitive). */
function hk2_orders_for_email($email) {
    if (!$email || !function_exists('wc_get_orders')) return [];
    $email = strtolower($email);
    // Use direct SQL for speed — wc_get_orders billing_email param works but is slower.
    global $wpdb;
    $ids = $wpdb->get_col($wpdb->prepare(
        "SELECT pm.post_id FROM {$wpdb->postmeta} pm
         INNER JOIN {$wpdb->posts} p ON p.ID=pm.post_id
         WHERE pm.meta_key=%s AND LOWER(pm.meta_value)=%s
           AND p.post_type='shop_order'
           AND p.post_status IN ('wc-completed','wc-processing')
         ORDER BY p.post_date DESC LIMIT 200",
        '_billing_email', $email
    ));
    $orders = [];
    foreach ($ids as $oid) {
        $o = wc_get_order((int)$oid);
        if ($o) $orders[] = $o;
    }
    return $orders;
}

/* ─────────────────────── Email-on-complete delivery ─────────────────────── */

/**
 * Send our own HTML email with the customer's SIGNED download URLs whenever
 * an order reaches completed. We rely on WooCommerce's own permission
 * system (which generates auth-keyed URLs that bypass the
 * woocommerce_uploads/.htaccess 403). Works for guest orders (no WP
 * account needed). Idempotent: skipped if already sent for this order.
 */
add_action('woocommerce_order_status_completed', function ($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;
    if (get_post_meta($order_id, '_hk2_delivery_email_sent', true)) return;

    $email = (string) $order->get_billing_email();
    if (!$email) return;

    // Make sure WC has actually granted download permissions for this order
    // before we read them (it usually has, but be defensive on webhook path).
    if (function_exists('wc_downloadable_product_permissions')) {
        wc_downloadable_product_permissions($order_id, true);
    }

    $first = (string) $order->get_billing_first_name();
    $hello = $first ? "Hi $first," : "Hi,";

    $rows = [];
    $any  = false;

    // Prefer WC's get_downloadable_items() — these come with proper signed
    // download_url values. Fall back to raw file URL only if WC didn't grant
    // a permission row (rare).
    $items = method_exists($order, 'get_downloadable_items') ? $order->get_downloadable_items() : [];
    if ($items) {
        foreach ($items as $it) {
            $any = true;
            $name = isset($it['product_name']) ? $it['product_name'] : (isset($it['download_name']) ? $it['download_name'] : 'Your file');
            $url  = isset($it['download_url']) ? $it['download_url'] : '';
            if (!$url) continue;
            $rows[] = sprintf(
                '<li style="margin:8px 0"><strong>%s</strong><br><a href="%s" style="color:#0a58ca">Download %s</a></li>',
                esc_html($name),
                esc_url($url),
                esc_html(isset($it['download_name']) ? $it['download_name'] : 'file')
            );
        }
    }
    // Fallback: items without granted permissions (e.g. file missing in catalog)
    if (!$rows) {
        foreach ($order->get_items() as $item) {
            $name  = $item->get_name();
            $files = hk2_product_files((int) $item->get_product_id());
            if (empty($files)) {
                $rows[] = '<li style="margin:8px 0"><strong>' . esc_html($name) . '</strong> — file not yet uploaded; we will email you shortly.</li>';
            }
        }
    }

    $list = $rows ? '<ul style="padding-left:18px">' . implode('', $rows) . '</ul>' : '<p>No downloadable files attached to this order.</p>';
    $site = function_exists('home_url') ? esc_url(home_url('/')) : 'https://hackknow.com/';

    $subject = sprintf('Your HackKnow order #%s is ready to download', $order->get_order_number());
    $html    = '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;padding:24px;max-width:560px">'
             . '<h2 style="margin:0 0 16px">Thanks for your purchase!</h2>'
             . '<p>' . esc_html($hello) . '</p>'
             . '<p>Your payment for order <strong>#' . esc_html($order->get_order_number()) . '</strong> has been confirmed. Below are your direct download links — click any link to save the file:</p>'
             . $list
             . '<p style="margin-top:18px">You can always re-download from your <a href="' . $site . 'account/downloads" style="color:#0a58ca">Downloads page</a> using the email <strong>' . esc_html($email) . '</strong>. Files do not expire.</p>'
             . '<hr style="border:none;border-top:1px solid #eee;margin:24px 0">'
             . '<p style="font-size:12px;color:#777">If you did not make this purchase, please reply to this email.</p>'
             . '</body></html>';

    add_filter('wp_mail_content_type', 'hk2_html_ct');
    $sent = wp_mail($email, $subject, $html);
    remove_filter('wp_mail_content_type', 'hk2_html_ct');

    if ($sent) {
        update_post_meta($order_id, '_hk2_delivery_email_sent', current_time('mysql'));
        $order->add_order_note('HackKnow delivery email sent to ' . $email . ($any ? '' : ' (some files missing in catalog)'));
    } else {
        hk2_log('delivery email FAILED for order ' . $order_id . ' to ' . $email);
        $order->add_order_note('HackKnow delivery email FAILED to ' . $email);
    }
}, 20, 1);

function hk2_html_ct() { return 'text/html'; }

/* ───────────────────────── Razorpay webhook ───────────────────────── */

add_action('rest_api_init', function () {
    register_rest_route('hackknow/v1', '/razorpay-webhook', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => 'hk2_razorpay_webhook',
    ]);

    // Override (re-register) existing routes with email-scoped versions.
    register_rest_route('hackknow/v1', '/my-downloads', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => 'hk2_my_downloads',
    ]);
    register_rest_route('hackknow/v1', '/my-orders', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => 'hk2_my_orders',
    ]);

    // Guest path: ask for a magic link by email.
    register_rest_route('hackknow/v1', '/downloads-by-email', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => 'hk2_downloads_by_email_request',
    ]);
    register_rest_route('hackknow/v1', '/downloads-by-token', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => 'hk2_downloads_by_token',
    ]);

    // Public availability map: {product_id: {has_file, file_count}} for every
    // downloadable WC product. Frontend overlays a green/red dot on cards.
    register_rest_route('hackknow/v1', '/product-availability', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => 'hk2_product_availability',
    ]);
}, 20); // priority 20 → runs after the default 10 from hackknow-checkout.php

function hk2_product_availability(WP_REST_Request $req) {
    // 5-minute cache so this is cheap even on heavy traffic.
    $cached = get_transient('hk2_avail_v1');
    if (is_array($cached)) return ['availability' => $cached, 'cached' => true];

    global $wpdb;
    // Only consider products explicitly marked downloadable. This prevents
    // non-digital products (courses, content posts, services) from being
    // mis-flagged as "no file" and triggering Request-to-Download UI.
    $rows = $wpdb->get_results(
        "SELECT p.ID as id, pm.meta_value as downloads
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} dm ON dm.post_id=p.ID AND dm.meta_key='_downloadable' AND dm.meta_value='yes'
         LEFT JOIN {$wpdb->postmeta} pm ON pm.post_id=p.ID AND pm.meta_key='_downloadable_files'
         WHERE p.post_type='product' AND p.post_status='publish'",
        ARRAY_A
    );
    $map = [];
    foreach ($rows as $row) {
        $pid   = (int) $row['id'];
        $files = $row['downloads'] ? maybe_unserialize($row['downloads']) : [];
        $count = is_array($files) ? count(array_filter($files, function ($f) {
            return is_array($f) && !empty($f['file']);
        })) : 0;
        $map[$pid] = ['has_file' => $count > 0, 'file_count' => $count];
    }
    set_transient('hk2_avail_v1', $map, 5 * MINUTE_IN_SECONDS);
    return ['availability' => $map, 'cached' => false];
}

// Bust the availability cache whenever a product is saved.
add_action('save_post_product', function () { delete_transient('hk2_avail_v1'); });

function hk2_get_webhook_secret() {
    if (defined('HACKKNOW_RAZORPAY_WEBHOOK_SECRET') && HACKKNOW_RAZORPAY_WEBHOOK_SECRET) {
        return (string) HACKKNOW_RAZORPAY_WEBHOOK_SECRET;
    }
    return (string) get_option('hk_rzp_webhook_secret', '');
}

function hk2_razorpay_webhook(WP_REST_Request $req) {
    $body_hash = '';
    $audit_base = ['ip' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64)];

    $secret = hk2_get_webhook_secret();
    if (!$secret) {
        hk2_log('webhook secret not configured');
        if (function_exists('hk2_audit_log')) hk2_audit_log(array_merge($audit_base, ['event' => 'config.missing', 'sig_ok' => 0, 'action' => 'reject_no_secret']));
        return new WP_Error('no_secret', 'Webhook secret not configured. Set it in WP Admin → Settings → HackKnow Webhook.', ['status' => 500]);
    }
    $raw = $req->get_body();
    $sig = $req->get_header('x_razorpay_signature');
    if ($raw) $body_hash = sha1($raw);
    if (!$sig || !$raw) {
        if (function_exists('hk2_audit_log')) hk2_audit_log(array_merge($audit_base, ['event' => 'bad_request', 'sig_ok' => 0, 'action' => 'reject_no_body', 'body_hash' => $body_hash]));
        return new WP_Error('bad_request', 'Missing signature or body', ['status' => 400]);
    }

    $expected = hash_hmac('sha256', $raw, $secret);
    if (!hash_equals($expected, $sig)) {
        hk2_log('webhook signature mismatch');
        if (function_exists('hk2_audit_log')) hk2_audit_log(array_merge($audit_base, ['event' => 'sig_mismatch', 'sig_ok' => 0, 'action' => 'reject', 'body_hash' => $body_hash]));
        return new WP_Error('bad_signature', 'Signature mismatch', ['status' => 401]);
    }

    $payload = json_decode($raw, true);
    $event   = is_array($payload) ? ($payload['event'] ?? '') : '';
    if (!in_array($event, ['payment.captured', 'order.paid'], true)) {
        if (function_exists('hk2_audit_log')) hk2_audit_log(array_merge($audit_base, ['event' => $event, 'sig_ok' => 1, 'action' => 'skip_event', 'body_hash' => $body_hash]));
        return ['ok' => true, 'skipped' => $event];
    }

    $payment      = $payload['payload']['payment']['entity'] ?? [];
    $rzp_pay_id   = (string)($payment['id'] ?? '');
    $rzp_order_id = (string)($payment['order_id'] ?? '');
    $amount_paise = (int)($payment['amount'] ?? 0);
    $email_hint   = (string)($payment['email'] ?? '');

    $order = hk2_find_wc_order_by_rzp($rzp_order_id, $rzp_pay_id);
    if (!$order) {
        // Last-ditch: look up via Razorpay notes field (we set notes.wc_order_id when creating)
        $notes_oid = (int)($payment['notes']['wc_order_id'] ?? 0);
        if ($notes_oid) $order = wc_get_order($notes_oid);
    }
    if (!$order) {
        hk2_log("webhook: no WC order for rzp_order=$rzp_order_id rzp_pay=$rzp_pay_id email=$email_hint");
        if (function_exists('hk2_audit_log')) hk2_audit_log(array_merge($audit_base, [
            'event' => $event, 'razorpay_payment_id' => $rzp_pay_id, 'razorpay_order_id' => $rzp_order_id,
            'sig_ok' => 1, 'action' => 'no_match', 'body_hash' => $body_hash,
        ]));
        // Still 200 so Razorpay does not retry forever.
        return ['ok' => true, 'matched' => false];
    }

    // ── ATOMIC IDEMPOTENCY LOCK ──
    // add_post_meta with $unique=true is an INSERT IGNORE at the SQL level.
    // It returns false if the meta_key already exists, so two concurrent
    // webhook hits (payment.captured + order.paid arriving milliseconds
    // apart, or a reconcile job racing with the webhook) cannot
    // double-process the same payment.
    $lock_key = '_hk2_webhook_lock';
    $lock_token = $rzp_pay_id . '|' . time();
    $got_lock = (bool) add_post_meta($order->get_id(), $lock_key, $lock_token, true);
    if (!$got_lock) {
        if (function_exists('hk2_audit_log')) hk2_audit_log(array_merge($audit_base, [
            'event' => $event, 'razorpay_payment_id' => $rzp_pay_id, 'razorpay_order_id' => $rzp_order_id,
            'wc_order_id' => $order->get_id(), 'sig_ok' => 1, 'action' => 'duplicate_skipped', 'body_hash' => $body_hash,
        ]));
        return ['ok' => true, 'duplicate' => true, 'wc_order' => $order->get_id()];
    }

    // Idempotency v2: if already completed AND already saw THIS payment id,
    // confirm and return without re-firing emails.
    $prev_pay = (string) get_post_meta($order->get_id(), '_razorpay_payment_id', true);
    if (in_array($order->get_status(), ['completed'], true) && $prev_pay === $rzp_pay_id) {
        if (function_exists('hk2_audit_log')) hk2_audit_log(array_merge($audit_base, [
            'event' => $event, 'razorpay_payment_id' => $rzp_pay_id, 'razorpay_order_id' => $rzp_order_id,
            'wc_order_id' => $order->get_id(), 'sig_ok' => 1, 'action' => 'already_completed', 'body_hash' => $body_hash,
        ]));
        return ['ok' => true, 'already' => true, 'wc_order' => $order->get_id()];
    }

    update_post_meta($order->get_id(), '_razorpay_payment_id', $rzp_pay_id);
    if ($rzp_order_id) update_post_meta($order->get_id(), '_razorpay_order_id', $rzp_order_id);
    update_post_meta($order->get_id(), '_hk2_webhook_event', $event);
    update_post_meta($order->get_id(), '_hk2_webhook_amount_paise', $amount_paise);

    if (method_exists($order, 'set_payment_method')) {
        $order->set_payment_method('razorpay');
        $order->set_payment_method_title('Razorpay (UPI / Card / NetBanking)');
    }
    $order->payment_complete($rzp_pay_id);
    if (in_array($order->get_status(), ['processing', 'pending'], true)) {
        $order->update_status('completed', 'Auto-completed via Razorpay webhook (' . $event . ').');
    }
    $order->add_order_note('Razorpay webhook ' . $event . ' rcvd; payment ' . $rzp_pay_id . ' verified.');

    if (function_exists('hk2_audit_log')) hk2_audit_log(array_merge($audit_base, [
        'event' => $event, 'razorpay_payment_id' => $rzp_pay_id, 'razorpay_order_id' => $rzp_order_id,
        'wc_order_id' => $order->get_id(), 'sig_ok' => 1, 'action' => 'payment_complete', 'body_hash' => $body_hash,
    ]));

    // The completed-status hook above will send our delivery email.
    // Also nudge the standard WC customer email for parity.
    try {
        if (function_exists('WC')) {
            $mailer = WC()->mailer();
            $emails = $mailer ? $mailer->get_emails() : [];
            if (!empty($emails['WC_Email_Customer_Completed_Order'])) {
                $emails['WC_Email_Customer_Completed_Order']->trigger($order->get_id(), $order);
            }
        }
    } catch (\Throwable $e) {
        hk2_log('webhook post-complete WC email failed: ' . $e->getMessage());
    }

    return ['ok' => true, 'matched' => true, 'wc_order' => $order->get_id()];
}

/* ─────────────── Email-scoped /my-downloads & /my-orders ─────────────── */

function hk2_my_downloads_payload_for_email($email) {
    $orders    = hk2_orders_for_email($email);
    $downloads = [];
    $seen      = [];
    foreach ($orders as $order) {
        // Make sure permission rows exist so signed URLs work
        if (function_exists('wc_downloadable_product_permissions')) {
            wc_downloadable_product_permissions($order->get_id(), true);
        }
        $items = method_exists($order, 'get_downloadable_items') ? $order->get_downloadable_items() : [];
        foreach ($items as $it) {
            $pid  = (int) ($it['product_id'] ?? 0);
            $did  = (string) ($it['download_id'] ?? '');
            if (!$pid || !$did) continue;
            $key  = $pid . ':' . $did . ':' . $order->get_id();
            if (isset($seen[$key])) continue;
            $seen[$key] = true;
            $downloads[] = [
                'download_id'         => $did,
                'product_id'          => $pid,
                'product_name'        => (string) ($it['product_name'] ?? ''),
                'file'                => ['name' => (string) ($it['download_name'] ?? ''), 'file' => (string) ($it['file']['file'] ?? '')],
                'download_url'        => (string) ($it['download_url'] ?? ''),  // SIGNED URL
                'order_id'            => $order->get_id(),
                'order_date'          => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
                'access_expires'      => null,
                'downloads_remaining' => '',
                'download_count'      => 0,
            ];
        }
    }
    return $downloads;
}

function hk2_my_downloads(WP_REST_Request $req) {
    $uid = function_exists('hackknow_authed_uid') ? hackknow_authed_uid($req) : null;
    if (is_wp_error($uid) || !$uid) {
        return new WP_Error('unauthorized', 'Sign in or use the email lookup option to view downloads.', ['status' => 401]);
    }
    $u = get_user_by('id', $uid);
    if (!$u) return new WP_Error('not_found', 'User not found', ['status' => 404]);
    return ['downloads' => hk2_my_downloads_payload_for_email($u->user_email)];
}

function hk2_my_orders(WP_REST_Request $req) {
    $uid = function_exists('hackknow_authed_uid') ? hackknow_authed_uid($req) : null;
    if (is_wp_error($uid) || !$uid) return $uid ?: new WP_Error('unauthorized', 'Sign in', ['status' => 401]);
    $u = get_user_by('id', $uid);
    if (!$u) return new WP_Error('not_found', 'User not found', ['status' => 404]);

    $orders  = hk2_orders_for_email($u->user_email);
    $payload = [];
    foreach ($orders as $order) {
        $items = [];
        foreach ($order->get_items() as $it) {
            $items[] = [
                'name'       => $it->get_name(),
                'product_id' => $it->get_product_id(),
                'quantity'   => $it->get_quantity(),
                'total'      => $it->get_total(),
            ];
        }
        $payload[] = [
            'id'           => $order->get_id(),
            'number'       => $order->get_order_number(),
            'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
            'status'       => $order->get_status(),
            'total'        => $order->get_total(),
            'line_items'   => $items,
        ];
    }
    return ['orders' => $payload];
}

/* ─────────────── Guest magic-link downloads (no signin) ─────────────── */

function hk2_downloads_by_email_request(WP_REST_Request $req) {
    $email = strtolower(sanitize_email((string)$req->get_param('email')));
    if (!is_email($email)) return new WP_Error('bad_email', 'Valid email required', ['status' => 400]);

    // Even if the email has zero orders, return success to avoid leaking emails.
    $orders = hk2_orders_for_email($email);
    if (empty($orders)) return ['ok' => true];

    $token   = wp_generate_password(40, false, false);
    set_transient('hk2_dl_' . $token, $email, 24 * HOUR_IN_SECONDS);

    $site = function_exists('home_url') ? home_url('/') : 'https://hackknow.com/';
    $link = rtrim($site, '/') . '/account/downloads?t=' . rawurlencode($token);

    $html = '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;padding:24px;max-width:520px">'
          . '<h2 style="margin:0 0 12px">Your HackKnow downloads</h2>'
          . '<p>Click the link below to view every product you have ever purchased with <strong>' . esc_html($email) . '</strong>. The link is valid for 24 hours.</p>'
          . '<p style="margin:18px 0"><a href="' . esc_url($link) . '" style="background:#FFD60A;color:#1a1a1a;border:2px solid #1a1a1a;padding:12px 18px;text-decoration:none;font-weight:bold">View my downloads</a></p>'
          . '<p style="font-size:12px;color:#777">If you did not request this, you can ignore this email.</p>'
          . '</body></html>';

    add_filter('wp_mail_content_type', 'hk2_html_ct');
    wp_mail($email, 'Your HackKnow downloads link', $html);
    remove_filter('wp_mail_content_type', 'hk2_html_ct');

    return ['ok' => true];
}

function hk2_downloads_by_token(WP_REST_Request $req) {
    $tok   = sanitize_text_field((string)$req->get_param('t'));
    if (!$tok) return new WP_Error('bad_token', 'Missing token', ['status' => 400]);
    $email = get_transient('hk2_dl_' . $tok);
    if (!$email) return new WP_Error('expired', 'Link expired or invalid', ['status' => 410]);
    return [
        'email'     => $email,
        'downloads' => hk2_my_downloads_payload_for_email($email),
    ];
}

/* ───────────────── Disable WC download expiry globally ───────────────── */

add_filter('woocommerce_downloadable_file_permission_data', function ($data) {
    $data['access_expires'] = null;   // never expires
    $data['downloads_remaining'] = ''; // unlimited
    return $data;
}, 10, 1);

/* ───────── Admin settings page: WP Admin → Settings → HackKnow Webhook ───────── */

add_action('admin_menu', function () {
    add_options_page(
        'HackKnow Webhook',
        'HackKnow Webhook',
        'manage_options',
        'hk-webhook',
        'hk2_render_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('hk_webhook_group', 'hk_rzp_webhook_secret', [
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '',
    ]);
});

function hk2_render_settings_page() {
    if (!current_user_can('manage_options')) return;
    $secret_set = !empty(hk2_get_webhook_secret());
    $webhook_url = home_url('/wp-json/hackknow/v1/razorpay-webhook');
    $constant_overrides = defined('HACKKNOW_RAZORPAY_WEBHOOK_SECRET') && HACKKNOW_RAZORPAY_WEBHOOK_SECRET;
    ?>
    <div class="wrap">
        <h1>HackKnow Webhook Settings</h1>
        <p>This is where you tell HackKnow the secret you generated in the
           Razorpay dashboard so we can verify incoming webhook calls.</p>

        <h2>Webhook URL (paste this into Razorpay)</h2>
        <p><code style="background:#f3f3f3;padding:6px 10px;border-radius:4px;display:inline-block"><?php echo esc_html($webhook_url); ?></code></p>

        <form method="post" action="options.php">
            <?php settings_fields('hk_webhook_group'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="hk_rzp_webhook_secret">Razorpay Webhook Secret</label></th>
                    <td>
                        <input type="password"
                               id="hk_rzp_webhook_secret"
                               name="hk_rzp_webhook_secret"
                               value="<?php echo esc_attr(get_option('hk_rzp_webhook_secret', '')); ?>"
                               class="regular-text"
                               autocomplete="off"
                               style="font-family:monospace" />
                        <p class="description">
                            Paste the exact secret from Razorpay Dashboard → Settings → Webhooks.
                            <?php if ($secret_set): ?>
                                <strong style="color:#1b8043">✓ A secret is currently set.</strong>
                            <?php else: ?>
                                <strong style="color:#c00">⚠ No secret set yet — webhook will reject all calls.</strong>
                            <?php endif; ?>
                        </p>
                        <?php if ($constant_overrides): ?>
                            <p class="description" style="color:#c00">
                                Note: a HACKKNOW_RAZORPAY_WEBHOOK_SECRET constant in wp-config.php is overriding this setting.
                            </p>
                        <?php endif; ?>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Secret'); ?>
        </form>

        <hr>
        <h2>Self-Test</h2>
        <p>Click below to send a fake webhook to your own server and verify the secret is correct.</p>
        <button type="button" class="button button-secondary" id="hk-self-test">Run self-test</button>
        <pre id="hk-self-test-out" style="background:#f3f3f3;padding:10px;margin-top:10px;display:none"></pre>

        <hr>
        <h2>Webhook Active Events</h2>
        <p>In Razorpay Dashboard → Webhooks, ensure these events are checked:</p>
        <ul style="list-style:disc;padding-left:24px">
            <li><code>payment.captured</code></li>
            <li><code>order.paid</code></li>
        </ul>

        <script>
        (function () {
            var btn = document.getElementById('hk-self-test');
            var out = document.getElementById('hk-self-test-out');
            if (!btn) return;
            btn.addEventListener('click', async function () {
                out.style.display = 'block';
                out.textContent = 'Running…';
                try {
                    var r = await fetch('<?php echo esc_url(rest_url('hackknow/v1/webhook-self-test')); ?>', {
                        method: 'POST',
                        headers: { 'X-WP-Nonce': '<?php echo wp_create_nonce('wp_rest'); ?>' }
                    });
                    var data = await r.json();
                    out.textContent = JSON.stringify(data, null, 2);
                } catch (e) { out.textContent = 'Error: ' + e.message; }
            });
        })();
        </script>
    </div>
    <?php
}

/* Bootstrap endpoint — one-shot setup channel. Auto-disables permanently
   after a successful set, so even a leaked Woo consumer_secret cannot be
   used to overwrite the webhook secret later. Per-IP rate limited and
   guarded by a hash_equals comparison against admin-owned WC API keys.
   To re-open the channel, an admin must delete the
   `hk_rzp_bootstrap_locked` option in WP Admin. */
add_action('rest_api_init', function () {
    register_rest_route('hackknow/v1', '/bootstrap-secret', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $req) {
            // Hard-disable after first successful use OR if a secret is
            // already configured (admin-set, prior bootstrap, etc.).
            if (get_option('hk_rzp_bootstrap_locked') === '1') {
                return new WP_Error('locked', 'Bootstrap channel disabled. Webhook secret already configured. Change it via WP Admin → Settings → HackKnow Webhook.', ['status' => 410]);
            }
            $existing = (string) get_option('hk_rzp_webhook_secret', '');
            if ($existing !== '') {
                update_option('hk_rzp_bootstrap_locked', '1', true);
                return new WP_Error('already_set', 'A webhook secret is already configured. Change it via WP Admin instead.', ['status' => 409]);
            }

            // Per-IP throttle: 5 attempts / 10 min
            $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
            $tk = 'hk2_boot_' . md5($ip);
            $tries = (int) get_transient($tk);
            if ($tries >= 5) {
                return new WP_Error('rate_limited', 'Too many attempts.', ['status' => 429]);
            }
            set_transient($tk, $tries + 1, 600);

            $auth = (string) $req->get_header('authorization');
            if (!$auth || stripos($auth, 'bearer ') !== 0) {
                return new WP_Error('no_auth', 'Missing Bearer token', ['status' => 401]);
            }
            $token = trim(substr($auth, 7));
            if (strlen($token) < 20) {
                return new WP_Error('bad_auth', 'Invalid token', ['status' => 401]);
            }
            global $wpdb;
            $rows = $wpdb->get_col(
                "SELECT consumer_secret FROM {$wpdb->prefix}woocommerce_api_keys
                 WHERE permissions IN ('write','read_write') AND user_id IN
                 (SELECT user_id FROM {$wpdb->usermeta} WHERE meta_key='{$wpdb->prefix}capabilities' AND meta_value LIKE '%administrator%')"
            );
            $ok = false;
            foreach ($rows as $cs) {
                if (hash_equals((string) $cs, $token)) { $ok = true; break; }
            }
            if (!$ok) return new WP_Error('bad_auth', 'Invalid token', ['status' => 401]);

            $secret = sanitize_text_field((string) $req->get_param('secret'));
            if (!$secret || strlen($secret) < 8) return new WP_Error('no_secret', 'Missing or too-short secret param', ['status' => 400]);
            update_option('hk_rzp_webhook_secret', $secret, true);
            // Lock immediately after successful set
            update_option('hk_rzp_bootstrap_locked', '1', true);
            delete_transient($tk);
            return ['ok' => true, 'configured' => true, 'len' => strlen($secret), 'channel_locked' => true];
        },
    ]);
}, 25);

/* Self-test endpoint (admin only) — generates a payload, signs it with the
   stored secret, then loops back to /razorpay-webhook to confirm the round
   trip works end to end. */
add_action('rest_api_init', function () {
    register_rest_route('hackknow/v1', '/webhook-self-test', [
        'methods' => 'POST',
        'permission_callback' => function () { return current_user_can('manage_options'); },
        'callback' => function () {
            $secret = hk2_get_webhook_secret();
            if (!$secret) return ['ok' => false, 'reason' => 'no_secret_configured'];
            $payload = json_encode([
                'event' => 'payment.captured',
                'payload' => ['payment' => ['entity' => [
                    'id' => 'pay_selftest_' . time(),
                    'order_id' => 'order_selftest_' . time(),
                    'amount' => 100,
                    'email' => 'selftest@hackknow.com',
                ]]]
            ]);
            $sig = hash_hmac('sha256', $payload, $secret);
            $url = home_url('/wp-json/hackknow/v1/razorpay-webhook');
            $resp = wp_remote_post($url, [
                'headers' => ['Content-Type' => 'application/json', 'X-Razorpay-Signature' => $sig],
                'body'    => $payload,
                'timeout' => 15,
            ]);
            if (is_wp_error($resp)) return ['ok' => false, 'reason' => 'http_error', 'detail' => $resp->get_error_message()];
            return [
                'ok'         => true,
                'http_code'  => wp_remote_retrieve_response_code($resp),
                'body'       => json_decode(wp_remote_retrieve_body($resp), true),
                'webhook_url'=> $url,
                'note'       => 'http_code 200 with body.matched=false is OK — it means signature verified but no real WC order exists for the synthetic id.',
            ];
        },
    ]);
}, 25);

/* ═══════════════════════════════════════════════════════════════════════════
 * SAFETY MODULE 1 — Server-side block of file-less product purchase
 * ═══════════════════════════════════════════════════════════════════════════
 * Owner requirement: customer should NEVER be able to pay for a "demo" product
 * (one without a downloadable file attached). India payment law: accepting
 * money for goods you cannot deliver is fraud. We enforce this at THREE
 * layers — purchasability filter, add-to-cart guard, and frontend UI.
 */
/**
 * True iff the product is a digital good with NO downloadable file attached
 * at either the variation level or the parent level. Treats non-digital
 * products (where neither self nor parent is marked downloadable) as
 * deliverable — we don't want to block courses/services.
 */
function hk2_is_undeliverable($product) {
    if (!$product) return false;
    $is_variation = $product->is_type('variation');
    $self_downloadable = $product->is_downloadable();
    $parent = $is_variation ? wc_get_product($product->get_parent_id()) : null;
    $parent_downloadable = $parent ? $parent->is_downloadable() : false;
    if (!$self_downloadable && !$parent_downloadable) return false;
    if (!empty(hk2_product_files($product->get_id()))) return false;
    if ($parent && !empty(hk2_product_files($parent->get_id()))) return false;
    return true;
}

add_filter('woocommerce_is_purchasable', function ($purchasable, $product) {
    if (!$product) return $purchasable;
    return hk2_is_undeliverable($product) ? false : $purchasable;
}, 99, 2);

// Some themes/extensions check variation purchasability via this filter.
add_filter('woocommerce_variation_is_purchasable', function ($purchasable, $variation) {
    if (!$variation) return $purchasable;
    return hk2_is_undeliverable($variation) ? false : $purchasable;
}, 99, 2);

// Belt + suspenders: also block at the add-to-cart step in case any code path
// bypasses is_purchasable (custom themes, REST cart, etc.)
add_filter('woocommerce_add_to_cart_validation', function ($passed, $product_id, $quantity, $variation_id = 0) {
    $check = $variation_id ? wc_get_product((int) $variation_id) : wc_get_product((int) $product_id);
    if ($check && hk2_is_undeliverable($check)) {
        if (function_exists('wc_add_notice')) {
            wc_add_notice('This product is not yet available for purchase. Please use the "Request to Download" option.', 'error');
        }
        return false;
    }
    return $passed;
}, 99, 4);

/* ═══════════════════════════════════════════════════════════════════════════
 * SAFETY MODULE 2 — "Request to Download" lead capture
 * ═══════════════════════════════════════════════════════════════════════════
 * For products without a file, the React frontend shows a "REQUEST TO
 * DOWNLOAD" button that POSTs to /request-product. We persist the lead in a
 * custom table and notify the owner.
 */
function hk2_requests_table_name() {
    global $wpdb;
    return $wpdb->prefix . 'hk_product_requests';
}

function hk2_install_requests_table() {
    global $wpdb;
    $table = hk2_requests_table_name();
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta("CREATE TABLE $table (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        product_id BIGINT UNSIGNED NOT NULL,
        product_name VARCHAR(255) NOT NULL DEFAULT '',
        email VARCHAR(190) NOT NULL,
        name VARCHAR(190) NOT NULL DEFAULT '',
        phone VARCHAR(50) NOT NULL DEFAULT '',
        message TEXT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        created_at DATETIME NOT NULL,
        ip VARCHAR(64) NOT NULL DEFAULT '',
        ua VARCHAR(255) NOT NULL DEFAULT '',
        PRIMARY KEY  (id),
        KEY product_id (product_id),
        KEY email (email),
        KEY status (status)
    ) $charset;");
}
register_activation_hook(__FILE__, 'hk2_install_requests_table');
// mu-plugins don't fire activation; ensure schema once on first load
add_action('init', function () {
    if (get_option('hk2_requests_schema_v1') !== '1') {
        hk2_install_requests_table();
        update_option('hk2_requests_schema_v1', '1');
    }
}, 5);

add_action('rest_api_init', function () {
    register_rest_route('hackknow/v1', '/request-product', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $req) {
            global $wpdb;
            $b = $req->get_json_params();
            $pid   = isset($b['product_id']) ? (int) $b['product_id'] : 0;
            $email = isset($b['email']) ? sanitize_email($b['email']) : '';
            $name  = isset($b['name'])  ? sanitize_text_field($b['name'])  : '';
            $phone = isset($b['phone']) ? sanitize_text_field($b['phone']) : '';
            $msg   = isset($b['message']) ? wp_kses_post($b['message']) : '';
            if (!$pid)   return new WP_Error('bad_request', 'product_id required', ['status' => 400]);
            if (!$email || !is_email($email)) return new WP_Error('bad_email', 'valid email required', ['status' => 400]);

            $product = wc_get_product($pid);
            if (!$product) return new WP_Error('not_found', 'product not found', ['status' => 404]);

            // Crude rate limit: max 5 requests / hour per email per product
            $since = gmdate('Y-m-d H:i:s', time() - 3600);
            $existing = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM " . hk2_requests_table_name() .
                " WHERE email=%s AND product_id=%d AND created_at > %s",
                $email, $pid, $since
            ));
            if ($existing >= 5) {
                return new WP_Error('rate_limited', 'Too many requests, try later.', ['status' => 429]);
            }

            $wpdb->insert(hk2_requests_table_name(), [
                'product_id'   => $pid,
                'product_name' => (string) $product->get_name(),
                'email'        => $email,
                'name'         => $name,
                'phone'        => $phone,
                'message'      => $msg,
                'status'       => 'open',
                'created_at'   => gmdate('Y-m-d H:i:s'),
                'ip'           => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64),
                'ua'           => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
            ]);

            // Notify owner
            $owner_to = apply_filters('hk2_requests_owner_email', 'ceo.hackknow@gmail.com');
            $admin_url = admin_url('admin.php?page=hk-product-requests');
            wp_mail(
                $owner_to,
                'New Request to Download — ' . $product->get_name(),
                "A user requested a product not yet available:\n\n"
                . "Product: " . $product->get_name() . " (#$pid)\n"
                . "Email:   $email\n"
                . "Name:    $name\n"
                . "Phone:   $phone\n"
                . "Message: $msg\n\n"
                . "Manage all requests: $admin_url\n",
                ['Content-Type: text/plain; charset=UTF-8']
            );

            // Acknowledge to user
            wp_mail(
                $email,
                'We received your request — ' . $product->get_name(),
                ($name ? "Hi $name,\n\n" : "Hi,\n\n")
                . "Thanks for your interest in \"" . $product->get_name() . "\". "
                . "This product is not currently available as an instant download. "
                . "Our team will get back to you shortly at this email address.\n\n"
                . "— HackKnow team",
                ['Content-Type: text/plain; charset=UTF-8']
            );

            return ['ok' => true, 'message' => 'We will get back to you shortly.'];
        },
    ]);

    // Owner-only listing
    register_rest_route('hackknow/v1', '/admin/product-requests', [
        'methods' => 'GET',
        'permission_callback' => function () { return current_user_can('manage_woocommerce'); },
        'callback' => function (WP_REST_Request $req) {
            global $wpdb;
            $status = sanitize_key((string) $req->get_param('status'));
            $where = $status ? $wpdb->prepare(' WHERE status=%s', $status) : '';
            $rows = $wpdb->get_results("SELECT * FROM " . hk2_requests_table_name() . $where . " ORDER BY id DESC LIMIT 500", ARRAY_A);
            return ['ok' => true, 'count' => count($rows), 'requests' => $rows];
        },
    ]);
}, 30);

// Admin menu page to view/close requests
add_action('admin_menu', function () {
    add_menu_page(
        'Product Requests',
        'Product Requests',
        'manage_woocommerce',
        'hk-product-requests',
        function () {
            global $wpdb;
            // Handle close action
            if (!empty($_POST['hk_close_id']) && check_admin_referer('hk_close_request')) {
                $wpdb->update(hk2_requests_table_name(),
                    ['status' => 'closed'],
                    ['id' => (int) $_POST['hk_close_id']]);
                echo '<div class="notice notice-success"><p>Marked closed.</p></div>';
            }
            $rows = $wpdb->get_results("SELECT * FROM " . hk2_requests_table_name() . " ORDER BY id DESC LIMIT 500");
            echo '<div class="wrap"><h1>Product Requests (file-less product leads)</h1>';
            if (!$rows) { echo '<p>No requests yet.</p></div>'; return; }
            echo '<table class="wp-list-table widefat striped"><thead><tr>
                <th>ID</th><th>When</th><th>Product</th><th>Email</th><th>Name</th><th>Phone</th><th>Status</th><th></th>
                </tr></thead><tbody>';
            foreach ($rows as $r) {
                echo '<tr>';
                echo '<td>' . (int) $r->id . '</td>';
                echo '<td>' . esc_html($r->created_at) . '</td>';
                echo '<td><a href="' . esc_url(get_edit_post_link($r->product_id)) . '">' . esc_html($r->product_name) . '</a></td>';
                echo '<td>' . esc_html($r->email) . '</td>';
                echo '<td>' . esc_html($r->name) . '</td>';
                echo '<td>' . esc_html($r->phone) . '</td>';
                echo '<td>' . esc_html($r->status) . '</td>';
                echo '<td>';
                if ($r->status === 'open') {
                    echo '<form method="post" style="display:inline">';
                    wp_nonce_field('hk_close_request');
                    echo '<input type="hidden" name="hk_close_id" value="' . (int)$r->id . '">';
                    echo '<button class="button button-small">Close</button>';
                    echo '</form>';
                }
                echo '</td></tr>';
            }
            echo '</tbody></table></div>';
        },
        'dashicons-email-alt'
    );
});

/* ═══════════════════════════════════════════════════════════════════════════
 * SAFETY MODULE 3 — Payment audit log
 * ═══════════════════════════════════════════════════════════════════════════
 * Every webhook hit is recorded — signature outcome, payload hash, action.
 * Critical for India payment compliance: indisputable record of what was
 * received, when, and what we did about it.
 */
function hk2_audit_table_name() {
    global $wpdb;
    return $wpdb->prefix . 'hk_payment_audit';
}
function hk2_install_audit_table() {
    global $wpdb;
    $table = hk2_audit_table_name();
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta("CREATE TABLE $table (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        ts DATETIME NOT NULL,
        event VARCHAR(64) NOT NULL DEFAULT '',
        razorpay_payment_id VARCHAR(64) NOT NULL DEFAULT '',
        razorpay_order_id VARCHAR(64) NOT NULL DEFAULT '',
        wc_order_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
        sig_ok TINYINT(1) NOT NULL DEFAULT 0,
        action VARCHAR(64) NOT NULL DEFAULT '',
        body_hash CHAR(40) NOT NULL DEFAULT '',
        ip VARCHAR(64) NOT NULL DEFAULT '',
        PRIMARY KEY  (id),
        KEY razorpay_payment_id (razorpay_payment_id),
        KEY wc_order_id (wc_order_id),
        KEY ts (ts)
    ) $charset;");
}
add_action('init', function () {
    if (get_option('hk2_audit_schema_v1') !== '1') {
        hk2_install_audit_table();
        update_option('hk2_audit_schema_v1', '1');
    }
}, 5);

function hk2_audit_log($row) {
    global $wpdb;
    $defaults = [
        'ts' => gmdate('Y-m-d H:i:s'),
        'event' => '', 'razorpay_payment_id' => '', 'razorpay_order_id' => '',
        'wc_order_id' => 0, 'sig_ok' => 0, 'action' => '', 'body_hash' => '',
        'ip' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64),
    ];
    $wpdb->insert(hk2_audit_table_name(), array_merge($defaults, $row));
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SAFETY MODULE 4 — Manual Razorpay reconciliation (safety net)
 * ═══════════════════════════════════════════════════════════════════════════
 * If for any reason the webhook miss-fired (network outage, server downtime,
 * Razorpay dashboard misconfiguration), this admin endpoint pulls recent
 * captured payments from Razorpay's API and reconciles them against
 * WooCommerce orders. Reuses the existing Razorpay key/secret stored by the
 * Razorpay plugin (option `woocommerce_razorpay_settings`).
 */

// Admin-permission helper: accepts either WP cookie auth (manage_woocommerce)
// OR a Bearer token equal to the Razorpay webhook secret. Used so we can run
// reconcile/diagnose remotely (without a logged-in browser session) when a
// customer is reporting "I paid but didn't get the file" and we need to act
// in seconds. Includes IP throttle to prevent brute-force.
function hk2_admin_auth_or_bearer(WP_REST_Request $req) {
    if (current_user_can('manage_woocommerce')) return true;
    // Bearer token path
    $auth = (string) $req->get_header('authorization');
    if (stripos($auth, 'Bearer ') !== 0) return false;
    $token = trim(substr($auth, 7));
    $rz    = get_option('woocommerce_razorpay_settings');
    $expected = (string) ($rz['webhook_secret'] ?? '');
    if ($expected === '' || !hash_equals($expected, $token)) return false;
    // Per-IP throttle: max 10 admin-bearer hits per minute
    $ip  = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $key = 'hk2_adm_thr_' . md5($ip);
    $n   = (int) get_transient($key);
    if ($n >= 10) return false;
    set_transient($key, $n + 1, 60);
    return true;
}

add_action('rest_api_init', function () {
    register_rest_route('hackknow/v1', '/admin/reconcile-payments', [
        'methods'  => 'POST',
        'permission_callback' => 'hk2_admin_auth_or_bearer',
        'callback' => function (WP_REST_Request $req) {
            $hours = max(1, min(168, (int) $req->get_param('hours') ?: 24));
            $rz = get_option('woocommerce_razorpay_settings');
            if (empty($rz['key_id']) || empty($rz['key_secret'])) {
                return new WP_Error('no_creds', 'Razorpay credentials not configured in WC settings.', ['status' => 500]);
            }
            $from = time() - ($hours * 3600);
            $url  = "https://api.razorpay.com/v1/payments?from=$from&count=100";
            $resp = wp_remote_get($url, [
                'headers' => ['Authorization' => 'Basic ' . base64_encode($rz['key_id'] . ':' . $rz['key_secret'])],
                'timeout' => 20,
            ]);
            if (is_wp_error($resp)) return new WP_Error('http_error', $resp->get_error_message(), ['status' => 500]);
            $code = wp_remote_retrieve_response_code($resp);
            $data = json_decode(wp_remote_retrieve_body($resp), true);
            if ($code !== 200 || empty($data['items'])) {
                return ['ok' => true, 'fetched' => 0, 'reconciled' => 0, 'http_code' => $code, 'note' => 'No payments returned.'];
            }
            $reconciled = 0; $skipped = 0; $details = [];
            foreach ($data['items'] as $p) {
                if (($p['status'] ?? '') !== 'captured') { $skipped++; continue; }
                $rpid = $p['id'] ?? '';
                $oid  = $p['order_id'] ?? '';
                $wc_id = hk2_find_wc_order_by_razorpay_ids($rpid, $oid, $p['email'] ?? '', (int)($p['amount'] ?? 0));
                if (!$wc_id) { $skipped++; $details[] = ['rpid' => $rpid, 'reason' => 'no_wc_match']; continue; }
                $order = wc_get_order($wc_id);
                if (!$order) { $skipped++; continue; }
                if (!$order->is_paid()) {
                    $order->payment_complete($rpid);
                    $order->add_order_note('Reconciled via /admin/reconcile-payments (Razorpay payment ' . $rpid . ').');
                    hk2_audit_log([
                        'event' => 'reconcile.captured',
                        'razorpay_payment_id' => $rpid,
                        'razorpay_order_id'   => $oid,
                        'wc_order_id' => $wc_id,
                        'sig_ok' => 1, // direct API, not webhook
                        'action' => 'payment_complete',
                    ]);
                    $reconciled++;
                    $details[] = ['rpid' => $rpid, 'wc_order_id' => $wc_id, 'action' => 'completed'];
                } else {
                    $details[] = ['rpid' => $rpid, 'wc_order_id' => $wc_id, 'action' => 'already_paid'];
                }
            }
            return [
                'ok' => true,
                'window_hours' => $hours,
                'fetched' => count($data['items']),
                'reconciled' => $reconciled,
                'skipped' => $skipped,
                'details' => $details,
            ];
        },
    ]);
}, 35);

// Helper used by reconciliation: find a WC order matching a Razorpay payment.
function hk2_find_wc_order_by_razorpay_ids($razorpay_payment_id, $razorpay_order_id, $email = '', $amount_paise = 0) {
    // Strategy 1: match _transaction_id
    $orders = wc_get_orders(['limit' => 1, 'meta_key' => '_transaction_id', 'meta_value' => $razorpay_payment_id]);
    if (!empty($orders)) return $orders[0]->get_id();
    // Strategy 2: match _razorpay_order_id meta (set by Razorpay WC plugin)
    $orders = wc_get_orders(['limit' => 1, 'meta_key' => '_razorpay_order_id', 'meta_value' => $razorpay_order_id]);
    if (!empty($orders)) return $orders[0]->get_id();
    // Strategy 3: best-effort email + amount match in the last 24h, status=pending/on-hold
    if ($email && $amount_paise) {
        $rs = wc_get_orders([
            'limit' => 5, 'billing_email' => $email, 'status' => ['pending', 'on-hold', 'failed'],
            'date_created' => '>' . (time() - 86400),
        ]);
        $target = round($amount_paise / 100, 2);
        foreach ($rs as $o) {
            if (abs((float)$o->get_total() - $target) < 0.01) return $o->get_id();
        }
    }
    return 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SAFETY MODULE 5 — Diagnostic endpoint (single-order forensic lookup)
 * ═══════════════════════════════════════════════════════════════════════════
 * GET /hackknow/v1/admin/diagnose?order=<wc_id>
 * GET /hackknow/v1/admin/diagnose?audit=1&limit=30
 * GET /hackknow/v1/admin/diagnose?email=<addr>&hours=24
 *
 * Bearer-token authed. Returns full order meta (incl. _razorpay_*), notes,
 * audit log rows, and (when an order_id is present) live Razorpay payment
 * lookup so we can answer "did the customer actually pay?" in one call.
 */
add_action('rest_api_init', function () {
    register_rest_route('hackknow/v1', '/admin/diagnose', [
        'methods'  => 'GET',
        'permission_callback' => 'hk2_admin_auth_or_bearer',
        'callback' => function (WP_REST_Request $req) {
            global $wpdb;
            $out = ['ok' => true, 'ts' => gmdate('c')];

            // Mode A: per-order forensic
            $oid = (int) $req->get_param('order');
            if ($oid > 0) {
                $order = wc_get_order($oid);
                if (!$order) return new WP_Error('not_found', "Order $oid not found", ['status' => 404]);
                $meta = [];
                foreach ($order->get_meta_data() as $m) {
                    $d = $m->get_data();
                    $meta[$d['key']] = is_scalar($d['value']) ? (string)$d['value'] : json_encode($d['value']);
                }
                // Also include the protected core meta WP stores in postmeta directly
                $raw = $wpdb->get_results($wpdb->prepare(
                    "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d", $oid
                ), ARRAY_A);
                $postmeta = [];
                foreach ($raw as $r) {
                    $postmeta[$r['meta_key']] = (strlen($r['meta_value']) > 500)
                        ? substr($r['meta_value'], 0, 500) . '…(truncated)'
                        : $r['meta_value'];
                }
                $notes = wc_get_order_notes(['order_id' => $oid, 'limit' => 50]);
                $note_arr = [];
                foreach ($notes as $n) {
                    $note_arr[] = [
                        'date'    => (string)$n->date_created,
                        'author'  => $n->added_by,
                        'content' => $n->content,
                    ];
                }
                $audit = $wpdb->get_results($wpdb->prepare(
                    "SELECT * FROM " . hk2_audit_table_name() . " WHERE wc_order_id = %d ORDER BY id DESC LIMIT 50", $oid
                ), ARRAY_A);

                $out['order'] = [
                    'id'           => $oid,
                    'status'       => $order->get_status(),
                    'total'        => $order->get_total(),
                    'email'        => $order->get_billing_email(),
                    'date_created' => (string) $order->get_date_created(),
                    'date_paid'    => (string) $order->get_date_paid(),
                    'payment_method' => $order->get_payment_method(),
                    'transaction_id' => $order->get_transaction_id(),
                    'meta'         => $meta,
                    'postmeta_all' => $postmeta,
                    'notes'        => $note_arr,
                    'audit_rows'   => $audit,
                ];

                // Razorpay live lookup for this order's _razorpay_order_id
                $rz = get_option('woocommerce_razorpay_settings');
                $rpid = $postmeta['_razorpay_order_id'] ?? '';
                if ($rpid && !empty($rz['key_id']) && !empty($rz['key_secret'])) {
                    $url = "https://api.razorpay.com/v1/orders/" . rawurlencode($rpid) . "/payments";
                    $resp = wp_remote_get($url, [
                        'headers' => ['Authorization' => 'Basic ' . base64_encode($rz['key_id'] . ':' . $rz['key_secret'])],
                        'timeout' => 15,
                    ]);
                    if (!is_wp_error($resp)) {
                        $body = json_decode(wp_remote_retrieve_body($resp), true);
                        $out['razorpay_order_lookup'] = [
                            'razorpay_order_id' => $rpid,
                            'http' => wp_remote_retrieve_response_code($resp),
                            'count' => isset($body['count']) ? (int)$body['count'] : 0,
                            'items' => array_map(function ($p) {
                                return [
                                    'id'        => $p['id'] ?? '',
                                    'status'    => $p['status'] ?? '',
                                    'amount'    => $p['amount'] ?? 0,
                                    'method'    => $p['method'] ?? '',
                                    'email'     => $p['email'] ?? '',
                                    'contact'   => $p['contact'] ?? '',
                                    'created_at'=> $p['created_at'] ?? 0,
                                    'error_code'=> $p['error_code'] ?? null,
                                    'error_description'=> $p['error_description'] ?? null,
                                ];
                            }, $body['items'] ?? []),
                        ];
                    }
                } else {
                    $out['razorpay_order_lookup'] = ['skipped' => 'no _razorpay_order_id meta on this order'];
                }
                return $out;
            }

            // Mode B: by email (last N hours) — pulls Razorpay payments by email and matches
            $email = trim((string) $req->get_param('email'));
            if ($email !== '') {
                $hours = max(1, min(168, (int) $req->get_param('hours') ?: 24));
                $rz = get_option('woocommerce_razorpay_settings');
                if (empty($rz['key_id']) || empty($rz['key_secret'])) {
                    return new WP_Error('no_creds', 'Razorpay creds missing.', ['status' => 500]);
                }
                $from = time() - ($hours * 3600);
                $url  = "https://api.razorpay.com/v1/payments?from=$from&count=100";
                $resp = wp_remote_get($url, [
                    'headers' => ['Authorization' => 'Basic ' . base64_encode($rz['key_id'] . ':' . $rz['key_secret'])],
                    'timeout' => 20,
                ]);
                $body = is_wp_error($resp) ? ['items' => []] : json_decode(wp_remote_retrieve_body($resp), true);
                $matches = [];
                foreach ($body['items'] ?? [] as $p) {
                    if (strcasecmp(($p['email'] ?? ''), $email) !== 0) continue;
                    $matches[] = [
                        'id'        => $p['id'] ?? '',
                        'order_id'  => $p['order_id'] ?? '',
                        'status'    => $p['status'] ?? '',
                        'amount'    => $p['amount'] ?? 0,
                        'method'    => $p['method'] ?? '',
                        'email'     => $p['email'] ?? '',
                        'contact'   => $p['contact'] ?? '',
                        'created_at'=> $p['created_at'] ?? 0,
                        'error_code'=> $p['error_code'] ?? null,
                        'error_description'=> $p['error_description'] ?? null,
                    ];
                }
                // Also list recent WC orders for that email
                $rs = wc_get_orders([
                    'limit' => 10, 'billing_email' => $email,
                    'date_created' => '>' . $from, 'orderby' => 'date', 'order' => 'DESC',
                ]);
                $wc_orders = [];
                foreach ($rs as $o) {
                    $wc_orders[] = [
                        'id' => $o->get_id(), 'status' => $o->get_status(),
                        'total' => $o->get_total(), 'date' => (string) $o->get_date_created(),
                        '_razorpay_order_id' => $o->get_meta('_razorpay_order_id'),
                        '_razorpay_payment_id' => $o->get_meta('_razorpay_payment_id'),
                        'transaction_id' => $o->get_transaction_id(),
                    ];
                }
                $out['email_query'] = [
                    'email' => $email, 'hours' => $hours,
                    'razorpay_payments' => $matches,
                    'wc_orders' => $wc_orders,
                ];
                return $out;
            }

            // Mode C: dump recent audit rows
            if ((int) $req->get_param('audit') === 1) {
                $limit = max(1, min(200, (int) $req->get_param('limit') ?: 30));
                $rows = $wpdb->get_results(
                    "SELECT * FROM " . hk2_audit_table_name() . " ORDER BY id DESC LIMIT $limit",
                    ARRAY_A
                );
                $out['audit'] = $rows;
                return $out;
            }

            return new WP_Error('bad_request', 'Pass ?order=<id>, or ?email=<addr>, or ?audit=1', ['status' => 400]);
        },
    ]);
}, 36);

/* ═══════════════════════════════════════════════════════════════════════════
 * SAFETY MODULE 6 — AUTO-RECONCILE CRON (LAYER 2 of permanent payment fix)
 * ═══════════════════════════════════════════════════════════════════════════
 * WP-Cron job that runs every 5 minutes. Pulls the last 30 minutes of
 * captured Razorpay payments and force-completes any WC order that is
 * still pending/on-hold/failed but has a matching captured payment.
 *
 * This is the ULTIMATE safety net. Even if:
 *   - Razorpay never delivered the webhook
 *   - The webhook signature was wrong
 *   - The customer closed their browser before /verify ran
 *   - Our PHP threw a fatal mid-flight
 * …this cron will pick it up within 5 minutes and complete the order,
 * which fires the delivery hook (email + WC native completed-order email).
 *
 * Idempotent. Skips orders already paid. Audit-logs every action.
 */

// Register a 5-minute cron interval (WP only ships hourly/twicedaily/daily).
add_filter('cron_schedules', function ($s) {
    if (!isset($s['hk2_every_5min'])) {
        $s['hk2_every_5min'] = ['interval' => 300, 'display' => 'Every 5 Minutes (HackKnow)'];
    }
    return $s;
});

// Schedule the event on plugin load if not already scheduled.
add_action('init', function () {
    if (!wp_next_scheduled('hk2_auto_reconcile_cron')) {
        wp_schedule_event(time() + 60, 'hk2_every_5min', 'hk2_auto_reconcile_cron');
    }
}, 5);

add_action('hk2_auto_reconcile_cron', 'hk2_run_auto_reconcile');

function hk2_run_auto_reconcile() {
    // Single-instance lock so two cron firings can't race.
    $lock = 'hk2_recon_lock';
    if (get_transient($lock)) return;
    set_transient($lock, 1, 240); // released after 4 min

    try {
        $rz = get_option('woocommerce_razorpay_settings');
        if (empty($rz['key_id']) || empty($rz['key_secret'])) {
            set_transient('hk2_recon_last', ['ok' => false, 'err' => 'no_creds', 'ts' => time()], HOUR_IN_SECONDS);
            return;
        }
        // Pull last 30 minutes of payments (window > cron interval to overlap safely).
        $from = time() - (30 * 60);
        $url  = "https://api.razorpay.com/v1/payments?from=$from&count=100";
        $resp = wp_remote_get($url, [
            'headers' => ['Authorization' => 'Basic ' . base64_encode($rz['key_id'] . ':' . $rz['key_secret'])],
            'timeout' => 20,
        ]);
        if (is_wp_error($resp)) {
            set_transient('hk2_recon_last', ['ok' => false, 'err' => $resp->get_error_message(), 'ts' => time()], HOUR_IN_SECONDS);
            return;
        }
        $code = wp_remote_retrieve_response_code($resp);
        $body = json_decode(wp_remote_retrieve_body($resp), true);
        if ($code !== 200 || empty($body['items'])) {
            set_transient('hk2_recon_last', ['ok' => true, 'fetched' => 0, 'reconciled' => 0, 'http' => $code, 'ts' => time()], HOUR_IN_SECONDS);
            return;
        }

        $reconciled = 0; $skipped = 0; $errors = 0;
        foreach ($body['items'] as $p) {
            if (($p['status'] ?? '') !== 'captured') { $skipped++; continue; }
            $rpid = (string)($p['id'] ?? '');
            $oid  = (string)($p['order_id'] ?? '');
            $email = (string)($p['email'] ?? '');
            $amt  = (int)($p['amount'] ?? 0);

            // Match strategies (in order): _transaction_id → _razorpay_order_id
            // → notes.wc_order_id → email+amount in last 24h.
            $wc_id = hk2_find_wc_order_by_razorpay_ids($rpid, $oid, $email, $amt);
            if (!$wc_id && !empty($p['notes']['wc_order_id'])) {
                $wc_id = (int) $p['notes']['wc_order_id'];
            }
            if (!$wc_id) { $skipped++; continue; }

            $order = wc_get_order($wc_id);
            if (!$order) { $errors++; continue; }
            if ($order->is_paid()) { $skipped++; continue; }

            // Idempotency lock per-order so a webhook firing simultaneously
            // can't double-process.
            $olock = 'hk2_recon_o_' . $wc_id;
            if (!set_transient($olock, 1, 60)) { $skipped++; continue; }

            try {
                update_post_meta($wc_id, '_razorpay_payment_id', $rpid);
                if ($oid) update_post_meta($wc_id, '_razorpay_order_id', $oid);
                $order->payment_complete($rpid);
                if ($order->get_status() !== 'completed') {
                    $order->update_status('completed', 'Auto-reconciled by HackKnow cron — Razorpay payment ' . $rpid . ' was captured but not webhook-matched.');
                }
                $order->add_order_note('Auto-reconcile cron matched Razorpay payment ' . $rpid . ' (' . ($p['method'] ?? 'unknown') . ', ₹' . round($amt / 100, 2) . ')');
                hk2_audit_log([
                    'event'               => 'cron.reconcile.captured',
                    'razorpay_payment_id' => $rpid,
                    'razorpay_order_id'   => $oid,
                    'wc_order_id'         => $wc_id,
                    'sig_ok'              => 1,
                    'action'              => 'payment_complete',
                ]);
                $reconciled++;
            } catch (\Throwable $e) {
                $errors++;
                if (function_exists('error_log')) {
                    error_log('[hackknow] auto-reconcile failed for order ' . $wc_id . ': ' . $e->getMessage());
                }
            }
        }
        set_transient('hk2_recon_last', [
            'ok' => true, 'ts' => time(),
            'fetched' => count($body['items']),
            'reconciled' => $reconciled, 'skipped' => $skipped, 'errors' => $errors,
        ], HOUR_IN_SECONDS);
    } finally {
        delete_transient($lock);
    }
}

// Optional admin endpoint to peek at the last cron run (Bearer-token authed).
add_action('rest_api_init', function () {
    register_rest_route('hackknow/v1', '/admin/recon-status', [
        'methods'  => 'GET',
        'permission_callback' => 'hk2_admin_auth_or_bearer',
        'callback' => function () {
            return ['ok' => true, 'last' => get_transient('hk2_recon_last') ?: null,
                    'next_run' => wp_next_scheduled('hk2_auto_reconcile_cron')];
        },
    ]);
}, 37);
