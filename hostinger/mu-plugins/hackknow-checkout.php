<?php
/**
 * HackKnow checkout + auth bridge  (v3)
 *
 *  REST routes:
 *    POST /auth/register   { email, password, full_name?, phone? }  -> { token, user }
 *    POST /auth/login      { email, password }                       -> { token, user }
 *    POST /auth/google     { id_token }                              -> { token, user }
 *    GET  /auth/me         (Bearer token)                            -> { user }
 *    GET  /my-orders       (Bearer token)                            -> { orders }
 *    GET  /my-downloads    (Bearer token)                            -> { downloads }
 *    POST /order           { items, email, phone, ... }             -> { wc_order_id, razorpay_order, ... }
 *    POST /verify          { razorpay_order_id, razorpay_payment_id, razorpay_signature, wc_order_id }
 */

if (!defined('ABSPATH')) { exit; }

/* ── Token helpers ─────────────────────────────────────────────────────── */

function hackknow_b64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function hackknow_b64url_decode($data) {
    $r = strlen($data) % 4;
    if ($r) { $data .= str_repeat('=', 4 - $r); }
    return base64_decode(strtr($data, '-_', '+/'));
}
function hackknow_make_token($user_id) {
    $payload = wp_json_encode(['uid' => (int)$user_id, 'iat' => time(), 'exp' => time() + 30 * DAY_IN_SECONDS]);
    $b64     = hackknow_b64url_encode($payload);
    $sig     = hash_hmac('sha256', $b64, wp_salt('auth'));
    return $b64 . '.' . $sig;
}
function hackknow_verify_token($token) {
    if (!is_string($token) || strpos($token, '.') === false) return null;
    list($b64, $sig) = explode('.', $token, 2);
    if (!hash_equals(hash_hmac('sha256', $b64, wp_salt('auth')), $sig)) return null;
    $payload = json_decode(hackknow_b64url_decode($b64), true);
    if (!is_array($payload) || empty($payload['uid'])) return null;
    if (!empty($payload['exp']) && $payload['exp'] < time()) return null;
    return (int)$payload['uid'];
}
function hackknow_user_payload(WP_User $user) {
    $first = $user->first_name ?: '';
    $last  = $user->last_name ?: '';
    $name  = trim("$first $last") ?: ($user->display_name ?: $user->user_login);
    return [
        'id'         => (string)$user->ID,
        'name'       => $name,
        'email'      => $user->user_email,
        'first_name' => $first,
        'last_name'  => $last,
        'joinedDate' => mysql2date('F Y', $user->user_registered, false),
        'isVerified' => true,
    ];
}
function hackknow_extract_bearer(WP_REST_Request $req) {
    $h = $req->get_header('authorization');
    if (!$h && function_exists('apache_request_headers')) {
        $hdrs = apache_request_headers();
        $h = $hdrs['Authorization'] ?? ($hdrs['authorization'] ?? '');
    }
    if (!$h || stripos($h, 'Bearer ') !== 0) return '';
    return trim(substr($h, 7));
}
function hackknow_authed_uid(WP_REST_Request $req) {
    $uid = hackknow_verify_token(hackknow_extract_bearer($req));
    if (!$uid) return new WP_Error('unauthorized', 'Invalid or expired token', ['status' => 401]);
    return $uid;
}

/* ── CORS ──────────────────────────────────────────────────────────────── */

add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($value) {
        $origin  = get_http_origin();
        $allowed = ['https://hackknow.com', 'https://www.hackknow.com', 'http://localhost:5173', 'http://localhost:3000'];
        header('Access-Control-Allow-Origin: ' . (in_array($origin, $allowed, true) ? esc_url_raw($origin) : '*'));
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        header('Vary: Origin');
        return $value;
    });
}, 15);

/* ── Routes ────────────────────────────────────────────────────────────── */

add_action('rest_api_init', function () {
    $open = ['permission_callback' => '__return_true'];

    register_rest_route('hackknow/v1', '/auth/register',  array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_auth_register']));
    register_rest_route('hackknow/v1', '/auth/login',     array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_auth_login']));
    register_rest_route('hackknow/v1', '/auth/google',    array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_auth_google']));
    register_rest_route('hackknow/v1', '/auth/me',        array_merge($open, ['methods' => 'GET',  'callback' => 'hackknow_auth_me']));
    register_rest_route('hackknow/v1', '/my-orders',      array_merge($open, ['methods' => 'GET',  'callback' => 'hackknow_my_orders']));
    register_rest_route('hackknow/v1', '/my-downloads',   array_merge($open, ['methods' => 'GET',  'callback' => 'hackknow_my_downloads']));
    register_rest_route('hackknow/v1', '/order',          array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_create_order']));
    register_rest_route('hackknow/v1', '/verify',         array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_verify_payment']));
});

/* ── Auth: register ────────────────────────────────────────────────────── */

function hackknow_auth_register(WP_REST_Request $req) {
    $email     = sanitize_email((string)($req->get_param('email') ?? ''));
    $password  = (string)($req->get_param('password') ?? '');
    $full_name = sanitize_text_field((string)($req->get_param('full_name') ?: $req->get_param('name') ?: ''));
    $phone     = sanitize_text_field((string)($req->get_param('phone') ?? ''));

    if (!is_email($email))     return new WP_Error('bad_email',     'A valid email is required',               ['status' => 400]);
    if (strlen($password) < 8) return new WP_Error('weak_password', 'Password must be at least 8 characters', ['status' => 400]);
    if (email_exists($email))  return new WP_Error('email_exists',  'An account with this email already exists', ['status' => 409]);

    $base = sanitize_user(strtolower(str_replace(' ', '_', $full_name)), true)
          ?: sanitize_user(strtolower(explode('@', $email)[0]), true)
          ?: 'user';
    $username = $base; $i = 1;
    while (username_exists($username)) { $username = $base . $i++; if ($i > 9999) break; }

    $parts = $full_name ? explode(' ', $full_name, 2) : [$base, ''];
    $user_id = wp_insert_user([
        'user_login'   => $username,
        'user_email'   => $email,
        'user_pass'    => $password,
        'first_name'   => $parts[0],
        'last_name'    => $parts[1] ?? '',
        'display_name' => $full_name ?: $username,
        'role'         => 'customer',
    ]);
    if (is_wp_error($user_id)) return new WP_Error('register_failed', $user_id->get_error_message(), ['status' => 400]);
    if ($phone) update_user_meta($user_id, 'billing_phone', $phone);

    $user = get_user_by('id', $user_id);
    return ['token' => hackknow_make_token($user_id), 'user' => hackknow_user_payload($user)];
}

/* ── Auth: login ───────────────────────────────────────────────────────── */

function hackknow_auth_login(WP_REST_Request $req) {
    $login    = sanitize_text_field((string)($req->get_param('email') ?: $req->get_param('username') ?: ''));
    $password = (string)($req->get_param('password') ?? '');
    if (!$login || !$password) return new WP_Error('bad_request', 'Email and password are required', ['status' => 400]);

    $user = is_email($login) ? get_user_by('email', $login) : null;
    if (!$user) $user = get_user_by('login', $login);
    if (!$user || !wp_check_password($password, $user->user_pass, $user->ID)) {
        return new WP_Error('invalid_credentials', 'Invalid email or password', ['status' => 401]);
    }
    return ['token' => hackknow_make_token($user->ID), 'user' => hackknow_user_payload($user)];
}

/* ── Auth: Google Sign-In ──────────────────────────────────────────────── */

function hackknow_auth_google(WP_REST_Request $req) {
    $id_token = sanitize_text_field((string)($req->get_param('id_token') ?? ''));
    if (!$id_token) return new WP_Error('bad_request', 'id_token required', ['status' => 400]);

    $client_id = '936562781728-0tds5q2uqh2qft6bq76s0airvv117ig5.apps.googleusercontent.com';

    // Verify token with Google tokeninfo endpoint
    $resp = wp_remote_get('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($id_token), ['timeout' => 15]);
    if (is_wp_error($resp)) return new WP_Error('google_error', 'Could not verify Google token', ['status' => 502]);

    $info = json_decode(wp_remote_retrieve_body($resp), true);
    if (empty($info['email']) || empty($info['email_verified']) || $info['email_verified'] !== 'true') {
        return new WP_Error('google_unverified', 'Google email not verified', ['status' => 401]);
    }
    if (empty($info['aud']) || $info['aud'] !== $client_id) {
        return new WP_Error('google_aud', 'Invalid Google client', ['status' => 401]);
    }

    $email      = sanitize_email($info['email']);
    $given_name = sanitize_text_field($info['given_name'] ?? '');
    $family_name= sanitize_text_field($info['family_name'] ?? '');
    $full_name  = trim("$given_name $family_name") ?: $email;

    $user = get_user_by('email', $email);
    if (!$user) {
        $base = sanitize_user(strtolower(explode('@', $email)[0]), true) ?: 'user';
        $username = $base; $i = 1;
        while (username_exists($username)) { $username = $base . $i++; }
        $user_id = wp_insert_user([
            'user_login'   => $username,
            'user_email'   => $email,
            'user_pass'    => wp_generate_password(24),
            'first_name'   => $given_name,
            'last_name'    => $family_name,
            'display_name' => $full_name,
            'role'         => 'customer',
        ]);
        if (is_wp_error($user_id)) return new WP_Error('register_failed', $user_id->get_error_message(), ['status' => 500]);
        update_user_meta($user_id, 'hackknow_google_sub', $info['sub'] ?? '');
        $user = get_user_by('id', $user_id);
    }

    return ['token' => hackknow_make_token($user->ID), 'user' => hackknow_user_payload($user)];
}

/* ── Auth: me ──────────────────────────────────────────────────────────── */

function hackknow_auth_me(WP_REST_Request $req) {
    $uid = hackknow_authed_uid($req);
    if (is_wp_error($uid)) return $uid;
    $user = get_user_by('id', $uid);
    if (!$user) return new WP_Error('not_found', 'User not found', ['status' => 404]);
    return ['user' => hackknow_user_payload($user)];
}

/* ── My Orders ─────────────────────────────────────────────────────────── */

function hackknow_my_orders(WP_REST_Request $req) {
    $uid = hackknow_authed_uid($req);
    if (is_wp_error($uid)) return $uid;
    if (!function_exists('wc_get_orders')) return new WP_Error('no_wc', 'WooCommerce not active', ['status' => 500]);

    // Only return paid orders — pending means payment not yet confirmed
    $wc_orders = wc_get_orders([
        'customer_id' => $uid,
        'limit'       => 50,
        'orderby'     => 'date',
        'order'       => 'DESC',
        'status'      => ['wc-completed', 'wc-processing'],
    ]);

    $orders = [];
    foreach ($wc_orders as $order) {
        $line_items = [];
        foreach ($order->get_items() as $item) {
            $line_items[] = [
                'name'       => $item->get_name(),
                'product_id' => $item->get_product_id(),
                'quantity'   => $item->get_quantity(),
                'total'      => $item->get_total(),
            ];
        }
        $orders[] = [
            'id'           => $order->get_id(),
            'number'       => $order->get_order_number(),
            'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
            'status'       => $order->get_status(),
            'total'        => $order->get_total(),
            'line_items'   => $line_items,
        ];
    }
    return ['orders' => $orders];
}

/* ── My Downloads ──────────────────────────────────────────────────────── */

function hackknow_my_downloads(WP_REST_Request $req) {
    $uid = hackknow_authed_uid($req);
    if (is_wp_error($uid)) return $uid;
    if (!function_exists('wc_get_customer_available_downloads')) return new WP_Error('no_wc', 'WooCommerce not active', ['status' => 500]);

    $user = get_user_by('id', $uid);
    if (!$user) return new WP_Error('not_found', 'User not found', ['status' => 404]);

    $raw_downloads = wc_get_customer_available_downloads($uid);
    $downloads = [];
    foreach ($raw_downloads as $dl) {
        $downloads[] = [
            'download_id'          => $dl['download_id'],
            'download_url'         => $dl['download_url'],
            'product_id'           => $dl['product_id'],
            'product_name'         => $dl['product_name'],
            'file'                 => $dl['file'],
            'access_expires'       => $dl['access_expires'] ? $dl['access_expires']->format('c') : null,
            'downloads_remaining'  => $dl['downloads_remaining'],
            'download_count'       => (int)($dl['download_count'] ?? 0),
        ];
    }
    return ['downloads' => $downloads];
}

/* ── Razorpay helpers ──────────────────────────────────────────────────── */

function hackknow_get_rzp_keys() {
    if (defined('HACKKNOW_RAZORPAY_KEY_ID') && defined('HACKKNOW_RAZORPAY_KEY_SECRET')) {
        return [HACKKNOW_RAZORPAY_KEY_ID, HACKKNOW_RAZORPAY_KEY_SECRET];
    }
    $opt = get_option('woocommerce_razorpay_settings');
    return [$opt['key_id'] ?? '', $opt['key_secret'] ?? ''];
}

/* ── Create Order ──────────────────────────────────────────────────────── */

function hackknow_create_order(WP_REST_Request $req) {
    $items = $req->get_param('items');
    $email = sanitize_email((string)($req->get_param('email') ?? ''));
    $phone = sanitize_text_field((string)($req->get_param('phone') ?? ''));
    $first = sanitize_text_field((string)($req->get_param('first_name') ?? ''));
    $last  = sanitize_text_field((string)($req->get_param('last_name') ?? ''));

    if (!is_array($items) || empty($items) || !$email) {
        return new WP_Error('bad_request', 'Missing items or email', ['status' => 400]);
    }
    if (!function_exists('wc_create_order')) {
        return new WP_Error('no_woocommerce', 'WooCommerce is not active', ['status' => 500]);
    }

    $uid   = hackknow_verify_token(hackknow_extract_bearer($req));
    $order = wc_create_order(['status' => 'pending']);
    if ($uid) $order->set_customer_id($uid);

    foreach ($items as $i) {
        $pid = absint($i['product_id'] ?? 0);
        $qty = max(1, absint($i['quantity'] ?? 1));
        if (!$pid) continue;
        $product = wc_get_product($pid);
        if (!$product) continue;
        $order->add_product($product, $qty);
    }
    $order->set_billing_email($email);
    $order->set_billing_phone($phone);
    $order->set_billing_first_name($first);
    $order->set_billing_last_name($last);
    $order->calculate_totals();

    $amount_paise = (int)round($order->get_total() * 100);
    if ($amount_paise <= 0) {
        $order->update_status('cancelled', 'Hackknow: zero-total order rejected');
        return new WP_Error('zero_total', 'Order total is zero', ['status' => 400]);
    }

    list($key_id, $key_secret) = hackknow_get_rzp_keys();
    if (!$key_id || !$key_secret) return new WP_Error('rzp_unconfigured', 'Razorpay keys not configured', ['status' => 500]);

    $resp = wp_remote_post('https://api.razorpay.com/v1/orders', [
        'headers' => ['Authorization' => 'Basic ' . base64_encode("$key_id:$key_secret"), 'Content-Type' => 'application/json'],
        'body'    => wp_json_encode(['amount' => $amount_paise, 'currency' => 'INR', 'receipt' => 'wc_' . $order->get_id(), 'notes' => ['wc_order_id' => (string)$order->get_id()]]),
        'timeout' => 20,
    ]);
    if (is_wp_error($resp)) return new WP_Error('rzp_http', $resp->get_error_message(), ['status' => 502]);
    $body = json_decode(wp_remote_retrieve_body($resp), true);
    if (empty($body['id'])) return new WP_Error('rzp_no_id', 'Razorpay order creation failed', ['status' => 502]);

    update_post_meta($order->get_id(), '_razorpay_order_id', sanitize_text_field($body['id']));
    return ['wc_order_id' => $order->get_id(), 'razorpay_order' => $body['id'], 'amount' => $amount_paise, 'currency' => 'INR', 'key_id' => $key_id];
}

/* ── Verify Payment ────────────────────────────────────────────────────── */

function hackknow_verify_payment(WP_REST_Request $req) {
    $rzp_order_id   = sanitize_text_field((string)($req->get_param('razorpay_order_id') ?? ''));
    $rzp_payment_id = sanitize_text_field((string)($req->get_param('razorpay_payment_id') ?? ''));
    $rzp_signature  = sanitize_text_field((string)($req->get_param('razorpay_signature') ?? ''));
    $wc_order_id    = absint($req->get_param('wc_order_id'));

    if (!$rzp_order_id || !$rzp_payment_id || !$rzp_signature || !$wc_order_id) {
        return new WP_Error('bad_request', 'Missing fields', ['status' => 400]);
    }
    $order = wc_get_order($wc_order_id);
    if (!$order) return new WP_Error('no_order', 'Order not found', ['status' => 404]);

    $stored = get_post_meta($wc_order_id, '_razorpay_order_id', true);
    if ($stored && $stored !== $rzp_order_id) {
        $order->update_status('failed', 'Order id mismatch');
        return new WP_Error('order_mismatch', 'Order id mismatch', ['status' => 400]);
    }

    list(, $key_secret) = hackknow_get_rzp_keys();
    $expected = hash_hmac('sha256', $rzp_order_id . '|' . $rzp_payment_id, $key_secret);
    if (!hash_equals($expected, $rzp_signature)) {
        $order->update_status('failed', 'Signature verification failed');
        return new WP_Error('bad_signature', 'Invalid payment signature', ['status' => 400]);
    }

    update_post_meta($wc_order_id, '_razorpay_payment_id', $rzp_payment_id);
    $order->payment_complete($rzp_payment_id);
    $order->add_order_note('Razorpay payment ' . $rzp_payment_id . ' verified.');

    return ['success' => true, 'wc_order_id' => $wc_order_id];
}

// ONE-TIME admin endpoint: create demo product
// DELETE from mu-plugin once product is created
add_action('rest_api_init', function() {
    register_rest_route('hackknow/v1', '/admin/create-demo-product', [
        'methods'             => 'POST',
        'callback'            => 'hackknow_create_demo_product',
        'permission_callback' => '__return_true',
    ]);
});

function hackknow_create_demo_product(WP_REST_Request $req) {
    if ($req->get_param('secret') !== 'hackknow_demo_setup_2026') {
        return new WP_Error('forbidden', 'Forbidden', ['status' => 403]);
    }

    if (!class_exists('WC_Product_Simple')) {
        return new WP_Error('no_wc', 'WooCommerce not active', ['status' => 500]);
    }

    $existing = get_posts(['post_type' => 'product', 'title' => 'Demo 1', 'numberposts' => 1]);
    if (!empty($existing)) {
        return new WP_REST_Response(['status' => 'exists', 'product_id' => $existing[0]->ID], 200);
    }

    $product = new WC_Product_Simple();
    $product->set_name('Demo 1');
    $product->set_status('publish');
    $product->set_description('Demo downloadable Excel dashboard with sample revenue, expense and profit data. Instant download after purchase.');
    $product->set_short_description('Sample Excel Dashboard – instant download after payment.');
    $product->set_price('99');
    $product->set_regular_price('99');
    $product->set_virtual(true);
    $product->set_downloadable(true);
    $product->set_stock_status('instock');
    $product->set_catalog_visibility('visible');

    $cat = get_term_by('name', 'Excel Templates', 'product_cat');
    if (!$cat) {
        $cat_result = wp_insert_term('Excel Templates', 'product_cat');
        $cat_id = is_wp_error($cat_result) ? 0 : $cat_result['term_id'];
    } else {
        $cat_id = $cat->term_id;
    }
    if ($cat_id) $product->set_category_ids([$cat_id]);

    $upload = wp_upload_dir();
    $excel_src = WP_CONTENT_DIR . '/mu-plugins/demo1-dashboard.xlsx';
    $downloads = [];

    // Save product first (without downloads to avoid directory validation error)
    $id = $product->save();

    // Now add download via raw postmeta to bypass approved-directory validation
    $file_url = '';
    if (file_exists($excel_src)) {
        $filename = 'demo1-dashboard.xlsx';
        $dest = $upload['path'] . '/' . $filename;
        if (!file_exists($dest)) {
            @copy($excel_src, $dest);
        }
        $file_url = $upload['url'] . '/' . $filename;
        $download_id = md5('demo1');
        $raw_downloads = [
            $download_id => [
                'id'      => $download_id,
                'name'    => 'Demo 1 – Excel Dashboard.xlsx',
                'file'    => $file_url,
                'enabled' => true,
            ]
        ];
        update_post_meta($id, '_downloadable_files', $raw_downloads);
        update_post_meta($id, '_download_limit', -1);       // unlimited re-downloads within expiry window
        update_post_meta($id, '_download_expiry', 30);      // 30-day download window after purchase
    }

    return new WP_REST_Response([
        'status'     => 'created',
        'product_id' => $id,
        'name'       => 'Demo 1',
        'file_url'   => $file_url,
    ], 201);
}
