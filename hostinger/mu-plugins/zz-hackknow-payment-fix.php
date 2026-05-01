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
 * Required wp-config.php constant for webhook signature verification:
 *   define('HACKKNOW_RAZORPAY_WEBHOOK_SECRET', 'your-webhook-secret-from-rzp-dashboard');
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
 * Send our own HTML email with direct download URLs whenever an order
 * reaches completed. Works for guest orders (no WP account needed).
 * Idempotent: skipped if already sent for this order.
 */
add_action('woocommerce_order_status_completed', function ($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;
    if (get_post_meta($order_id, '_hk2_delivery_email_sent', true)) return;

    $email = (string) $order->get_billing_email();
    if (!$email) return;

    $first = (string) $order->get_billing_first_name();
    $hello = $first ? "Hi $first," : "Hi,";

    $rows = [];
    $any  = false;
    foreach ($order->get_items() as $item) {
        $pid   = (int) $item->get_product_id();
        $name  = $item->get_name();
        $files = hk2_product_files($pid);
        if (empty($files)) {
            $rows[] = '<li style="margin:8px 0"><strong>' . esc_html($name) . '</strong> — file not yet uploaded; we will email you shortly.</li>';
            continue;
        }
        $any = true;
        foreach ($files as $f) {
            $rows[] = sprintf(
                '<li style="margin:8px 0"><strong>%s</strong><br><a href="%s" style="color:#0a58ca">Download %s</a></li>',
                esc_html($name),
                esc_url($f['file']),
                esc_html($f['name'] ?: 'file')
            );
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
    $rows = $wpdb->get_results(
        "SELECT p.ID as id, pm.meta_value as downloads
         FROM {$wpdb->posts} p
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

function hk2_razorpay_webhook(WP_REST_Request $req) {
    $secret = defined('HACKKNOW_RAZORPAY_WEBHOOK_SECRET') ? HACKKNOW_RAZORPAY_WEBHOOK_SECRET : '';
    if (!$secret) {
        hk2_log('webhook secret not configured');
        return new WP_Error('no_secret', 'Webhook secret not configured', ['status' => 500]);
    }
    $raw = $req->get_body();
    $sig = $req->get_header('x_razorpay_signature');
    if (!$sig || !$raw) return new WP_Error('bad_request', 'Missing signature or body', ['status' => 400]);

    $expected = hash_hmac('sha256', $raw, $secret);
    if (!hash_equals($expected, $sig)) {
        hk2_log('webhook signature mismatch');
        return new WP_Error('bad_signature', 'Signature mismatch', ['status' => 401]);
    }

    $payload = json_decode($raw, true);
    $event   = is_array($payload) ? ($payload['event'] ?? '') : '';
    if (!in_array($event, ['payment.captured', 'order.paid'], true)) {
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
        // Still 200 so Razorpay does not retry forever.
        return ['ok' => true, 'matched' => false];
    }

    // Idempotency: if already completed, just confirm.
    if (in_array($order->get_status(), ['completed'], true)) {
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
        foreach ($order->get_items() as $item) {
            $pid = (int) $item->get_product_id();
            if (!$pid) continue;
            foreach (hk2_product_files($pid) as $f) {
                $key = $pid . ':' . $f['download_id'] . ':' . $order->get_id();
                if (isset($seen[$key])) continue;
                $seen[$key] = true;
                $downloads[] = [
                    'download_id'         => $f['download_id'],
                    'product_id'          => $pid,
                    'product_name'        => $item->get_name(),
                    'file'                => ['name' => $f['name'], 'file' => $f['file']],
                    'download_url'        => $f['file'],   // direct, no expiry
                    'order_id'            => $order->get_id(),
                    'order_date'          => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
                    'access_expires'      => null,
                    'downloads_remaining' => '',
                    'download_count'      => 0,
                ];
            }
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
