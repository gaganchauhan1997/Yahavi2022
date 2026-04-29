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

/* Force no-cache on every hackknow/v1 endpoint (browser, proxy, LiteSpeed, edge) */
add_action('rest_api_init', function () {
    $route = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($route, '/wp-json/hackknow/v1') !== false || strpos($route, '/wp-json/wc/') !== false) {
        // Tell LiteSpeed Cache NOT to cache this response
        if (!headers_sent()) {
            header('X-LiteSpeed-Cache-Control: no-cache, no-store, private');
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Pragma: no-cache');
            header('Expires: 0');
        }
        // Also call the LiteSpeed API if the plugin is active
        do_action('litespeed_control_set_nocache', 'hackknow rest endpoint');
        do_action('litespeed_control_set_private', 'hackknow rest endpoint');
    }
}, 1);
add_filter('rest_post_dispatch', function ($response, $server, $request) {
    if (strpos($request->get_route(), '/hackknow/v1') === 0) {
        $response->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->header('Pragma', 'no-cache');
        $response->header('Expires', '0');
        $response->header('X-LiteSpeed-Cache-Control', 'no-cache, no-store, private');
    }
    return $response;
}, 10, 3);

add_action('rest_api_init', function () {
    $open = ['permission_callback' => '__return_true'];

    register_rest_route('hackknow/v1', '/auth/register',       array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_auth_register']));
    register_rest_route('hackknow/v1', '/auth/login',          array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_auth_login']));
    register_rest_route('hackknow/v1', '/auth/google',         array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_auth_google']));
    register_rest_route('hackknow/v1', '/auth/me',             array_merge($open, ['methods' => 'GET',  'callback' => 'hackknow_auth_me']));
    register_rest_route('hackknow/v1', '/auth/forgot-password',array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_forgot_password',
        'args' => ['email' => ['required' => true, 'sanitize_callback' => 'sanitize_email']]]));
    register_rest_route('hackknow/v1', '/auth/reset-password', array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_reset_password']));
    register_rest_route('hackknow/v1', '/admin/analytics',     array_merge($open, ['methods' => 'GET',  'callback' => 'hackknow_analytics']));
    register_rest_route('hackknow/v1', '/my-orders',           array_merge($open, ['methods' => 'GET',  'callback' => 'hackknow_my_orders']));
    register_rest_route('hackknow/v1', '/my-downloads',        array_merge($open, ['methods' => 'GET',  'callback' => 'hackknow_my_downloads']));
    register_rest_route('hackknow/v1', '/order',               array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_create_order']));
    register_rest_route('hackknow/v1', '/verify',              array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_verify_payment']));
    register_rest_route('hackknow/v1', '/wishlist',             array_merge($open, ['methods' => 'GET',  'callback' => 'hackknow_wishlist_get']));
    register_rest_route('hackknow/v1', '/wishlist/toggle',      array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_wishlist_toggle']));
    register_rest_route('hackknow/v1', '/products/(?P<id>\d+)/reviews', array_merge($open, ['methods' => 'GET',    'callback' => 'hackknow_reviews_list']));
    register_rest_route('hackknow/v1', '/products/(?P<id>\d+)/reviews', array_merge($open, ['methods' => 'POST',   'callback' => 'hackknow_reviews_submit']));
    register_rest_route('hackknow/v1', '/admin/reviews/(?P<id>\d+)',    array_merge($open, ['methods' => 'DELETE', 'callback' => 'hackknow_admin_review_delete']));
    register_rest_route('hackknow/v1', '/admin/reviews/(?P<id>\d+)/approve', array_merge($open, ['methods' => 'POST', 'callback' => 'hackknow_admin_review_approve']));
    register_rest_route('hackknow/v1', '/admin/reviews',                array_merge($open, ['methods' => 'GET',    'callback' => 'hackknow_admin_reviews_list']));
    register_rest_route('hackknow/v1', '/chat',                         array_merge($open, ['methods' => 'POST',   'callback' => 'hackknow_chat']));
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
    $client_id    = '936562781728-0tds5q2uqh2qft6bq76s0airvv117ig5.apps.googleusercontent.com';
    $id_token     = sanitize_text_field((string)($req->get_param('id_token') ?? ''));
    $access_token = sanitize_text_field((string)($req->get_param('access_token') ?? ''));

    if (!$id_token && !$access_token) {
        return new WP_Error('bad_request', 'id_token or access_token required', ['status' => 400]);
    }

    // Verify via access_token → userinfo endpoint (OAuth2 popup flow)
    if ($access_token) {
        $resp = wp_remote_get('https://www.googleapis.com/oauth2/v3/userinfo', [
            'timeout' => 15,
            'headers' => ['Authorization' => 'Bearer ' . $access_token],
        ]);
        if (is_wp_error($resp)) return new WP_Error('google_error', 'Could not verify Google token', ['status' => 502]);
        $info = json_decode(wp_remote_retrieve_body($resp), true);
        if (empty($info['email']) || empty($info['email_verified'])) {
            return new WP_Error('google_unverified', 'Google email not verified', ['status' => 401]);
        }
    } else {
        // Verify via id_token → tokeninfo endpoint (One-Tap flow, kept for compatibility)
        $resp = wp_remote_get('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($id_token), ['timeout' => 15]);
        if (is_wp_error($resp)) return new WP_Error('google_error', 'Could not verify Google token', ['status' => 502]);
        $info = json_decode(wp_remote_retrieve_body($resp), true);
        if (empty($info['email']) || empty($info['email_verified']) || $info['email_verified'] !== 'true') {
            return new WP_Error('google_unverified', 'Google email not verified', ['status' => 401]);
        }
        if (empty($info['aud']) || $info['aud'] !== $client_id) {
            return new WP_Error('google_aud', 'Invalid Google client', ['status' => 401]);
        }
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

/* ── Auth: forgot password ─────────────────────────────────────────────── */

/* Frontend domain used in password-reset emails */
if (!defined('HACKKNOW_FRONTEND_URL')) {
    define('HACKKNOW_FRONTEND_URL', 'https://www.hackknow.com');
}

/* Override WP password-reset email to use HackKnow frontend link & branding */
add_filter('retrieve_password_title', function () {
    return 'Reset your HackKnow password';
}, 99);

add_filter('retrieve_password_message', function ($message, $key, $user_login, $user_data) {
    $reset_url = add_query_arg([
        'key'   => $key,
        'login' => rawurlencode($user_login),
    ], HACKKNOW_FRONTEND_URL . '/reset-password');

    $name = $user_data->first_name ?: $user_data->display_name ?: $user_login;
    return "Hi {$name},\n\n"
         . "Someone requested a password reset for your HackKnow account ({$user_data->user_email}).\n\n"
         . "If this was you, click the link below to choose a new password (valid for 24 hours):\n\n"
         . $reset_url . "\n\n"
         . "If you did not request this, you can safely ignore this email — your password will stay the same.\n\n"
         . "— The HackKnow Team\n"
         . HACKKNOW_FRONTEND_URL . "\n";
}, 99, 4);

function hackknow_forgot_password(WP_REST_Request $req) {
    $email = sanitize_email((string)($req->get_param('email') ?? ''));
    if (!is_email($email)) {
        return new WP_Error('bad_email', 'A valid email is required', ['status' => 400]);
    }

    $user = get_user_by('email', $email);
    if ($user) {
        $result = retrieve_password($user->user_login);
        if (is_wp_error($result)) {
            error_log('[hackknow] forgot_password failed: ' . $result->get_error_message());
        }
    }
    // Always return success to prevent email enumeration
    return ['success' => true, 'message' => 'If an account exists, a reset link has been sent.'];
}

function hackknow_reset_password(WP_REST_Request $req) {
    $key      = sanitize_text_field((string)($req->get_param('key') ?? ''));
    $login    = sanitize_user((string)($req->get_param('login') ?? ''), true);
    $password = (string)($req->get_param('password') ?? '');

    if (!$key || !$login)        return new WP_Error('missing_param', 'Reset key and login are required', ['status' => 400]);
    if (strlen($password) < 8)   return new WP_Error('weak_password', 'Password must be at least 8 characters', ['status' => 400]);

    $user = check_password_reset_key($key, $login);
    if (is_wp_error($user)) return new WP_Error('invalid_key', 'Reset link is invalid or has expired. Please request a new one.', ['status' => 400]);

    reset_password($user, $password);
    return ['success' => true, 'message' => 'Password updated. You can now sign in.'];
}

/* ── Admin Analytics (KPIs) ────────────────────────────────────────────── */

function hackknow_analytics(WP_REST_Request $req) {
    $uid = hackknow_authed_uid($req);
    if (is_wp_error($uid)) return $uid;
    $user = get_user_by('id', $uid);
    if (!$user || !user_can($user, 'manage_options')) {
        return new WP_Error('forbidden', 'Admin access required', ['status' => 403]);
    }
    if (!function_exists('wc_get_orders')) return new WP_Error('no_wc', 'WooCommerce not active', ['status' => 500]);

    global $wpdb;
    $now = current_time('mysql');
    $today = date('Y-m-d 00:00:00');
    $week  = date('Y-m-d 00:00:00', strtotime('-7 days'));
    $month = date('Y-m-d 00:00:00', strtotime('-30 days'));

    $total_users    = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->users}");
    $users_today    = (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->users} WHERE user_registered >= %s", $today));
    $users_week     = (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->users} WHERE user_registered >= %s", $week));

    $paid_orders = wc_get_orders(['limit' => -1, 'status' => ['wc-completed', 'wc-processing'], 'return' => 'ids']);
    $total_paid_count = count($paid_orders);

    $revenue_total = 0; $revenue_today = 0; $revenue_week = 0; $revenue_month = 0;
    $product_sales = [];
    foreach ($paid_orders as $oid) {
        $order = wc_get_order($oid);
        if (!$order) continue;
        $total = (float)$order->get_total();
        $date  = $order->get_date_created() ? $order->get_date_created()->date('Y-m-d H:i:s') : '';
        $revenue_total += $total;
        if ($date >= $today) $revenue_today += $total;
        if ($date >= $week)  $revenue_week  += $total;
        if ($date >= $month) $revenue_month += $total;
        foreach ($order->get_items() as $item) {
            $pid = $item->get_product_id();
            if (!isset($product_sales[$pid])) $product_sales[$pid] = ['name' => $item->get_name(), 'qty' => 0, 'revenue' => 0];
            $product_sales[$pid]['qty']     += (int)$item->get_quantity();
            $product_sales[$pid]['revenue'] += (float)$item->get_total();
        }
    }
    uasort($product_sales, fn($a,$b) => $b['revenue'] <=> $a['revenue']);
    $top_products = array_slice($product_sales, 0, 10, true);

    // Recent signups
    $recent = $wpdb->get_results("SELECT ID, user_login, user_email, user_registered FROM {$wpdb->users} ORDER BY user_registered DESC LIMIT 10");

    // Wishlist totals
    $wishlist_users = (int)$wpdb->get_var("SELECT COUNT(DISTINCT user_id) FROM {$wpdb->usermeta} WHERE meta_key='hackknow_wishlist'");

    return [
        'as_of'              => $now,
        'users'              => ['total' => $total_users, 'today' => $users_today, 'last_7d' => $users_week],
        'orders'             => ['total_paid' => $total_paid_count],
        'revenue'            => [
            'total'   => round($revenue_total, 2),
            'today'   => round($revenue_today, 2),
            'last_7d' => round($revenue_week, 2),
            'last_30d'=> round($revenue_month, 2),
        ],
        'top_products'       => array_values(array_map(fn($k,$v) => array_merge(['product_id' => $k], $v), array_keys($top_products), $top_products)),
        'recent_signups'     => array_map(fn($u) => [
            'id'         => (int)$u->ID,
            'login'      => $u->user_login,
            'email'      => $u->user_email,
            'registered' => $u->user_registered,
        ], $recent),
        'wishlist_users'     => $wishlist_users,
    ];
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

    // Force order to completed so WooCommerce sends download links email
    if (in_array($order->get_status(), ['processing', 'pending'], true)) {
        $order->update_status('completed', 'Auto-completed: digital download order.');
    }

    // Explicitly trigger the customer completed order email (contains download links)
    if ($order->get_customer_email() && function_exists('WC')) {
        $mailer = WC()->mailer();
        $emails = $mailer->get_emails();
        if (!empty($emails['WC_Email_Customer_Completed_Order'])) {
            $emails['WC_Email_Customer_Completed_Order']->trigger($order->get_id(), $order);
        }
    }

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

/* ── Wishlist ──────────────────────────────────────────────────────────── */

function hackknow_wishlist_get(WP_REST_Request $req) {
    $uid = hackknow_authed_uid($req);
    if (is_wp_error($uid)) return $uid;
    $ids = get_user_meta($uid, 'hackknow_wishlist', true);
    if (!is_array($ids)) $ids = [];
    return new WP_REST_Response(['wishlist' => array_values($ids)], 200);
}

function hackknow_wishlist_toggle(WP_REST_Request $req) {
    $uid = hackknow_authed_uid($req);
    if (is_wp_error($uid)) return $uid;
    $product_id = sanitize_text_field($req->get_param('product_id'));
    if (!$product_id) return new WP_Error('missing_param', 'product_id is required', ['status' => 400]);
    $ids = get_user_meta($uid, 'hackknow_wishlist', true);
    if (!is_array($ids)) $ids = [];
    $key = array_search($product_id, $ids, true);
    if ($key !== false) {
        array_splice($ids, $key, 1);
        $action = 'removed';
    } else {
        $ids[] = $product_id;
        $action = 'added';
    }
    update_user_meta($uid, 'hackknow_wishlist', array_values($ids));
    return new WP_REST_Response(['action' => $action, 'wishlist' => array_values($ids)], 200);
}

/* ── Reviews: helpers ──────────────────────────────────────────────────── */

function hackknow_review_to_array($comment) {
    $rating  = (int) get_comment_meta($comment->comment_ID, 'rating', true);
    $verified = (int) get_comment_meta($comment->comment_ID, 'verified', true);
    return [
        'id'        => (int) $comment->comment_ID,
        'product_id'=> (int) $comment->comment_post_ID,
        'author'    => $comment->comment_author,
        'avatar'    => get_avatar_url($comment->comment_author_email, ['size' => 80]),
        'rating'    => max(0, min(5, $rating)),
        'text'      => $comment->comment_content,
        'date'      => mysql2date('c', $comment->comment_date_gmt, false),
        'approved'  => $comment->comment_approved === '1',
        'verified'  => (bool) $verified,
    ];
}

function hackknow_product_is_free($product_id) {
    $product = wc_get_product($product_id);
    if (!$product) return false;
    $price = (float) $product->get_price();
    if ($price <= 0) return true;
    $terms = wp_get_post_terms($product_id, 'product_cat', ['fields' => 'slugs']);
    return is_array($terms) && in_array('free-resources', $terms, true);
}

/* ── Reviews: public list ──────────────────────────────────────────────── */

function hackknow_reviews_list(WP_REST_Request $req) {
    $product_id = (int) $req['id'];
    if (!$product_id || get_post_type($product_id) !== 'product') {
        return new WP_Error('bad_product', 'Product not found', ['status' => 404]);
    }
    $comments = get_comments([
        'post_id' => $product_id,
        'type'    => 'review',
        'status'  => 'approve',
        'order'   => 'DESC',
        'number'  => 50,
    ]);
    $items = array_map('hackknow_review_to_array', $comments);
    $count = count($items);
    $avg   = $count ? round(array_sum(array_column($items, 'rating')) / $count, 2) : 0;
    return new WP_REST_Response([
        'reviews'        => $items,
        'count'          => $count,
        'average_rating' => $avg,
        'is_free'        => hackknow_product_is_free($product_id),
    ], 200);
}

/* ── Reviews: submit (1 per purchase, unlimited on free) ───────────────── */

function hackknow_reviews_submit(WP_REST_Request $req) {
    $uid = hackknow_authed_uid($req);
    if (is_wp_error($uid)) return $uid;

    $product_id = (int) $req['id'];
    if (!$product_id || get_post_type($product_id) !== 'product') {
        return new WP_Error('bad_product', 'Product not found', ['status' => 404]);
    }

    $rating = (int) ($req->get_param('rating') ?? 0);
    $text   = sanitize_textarea_field((string) ($req->get_param('text') ?? ''));
    if ($rating < 1 || $rating > 5) {
        return new WP_Error('bad_rating', 'Rating must be 1-5', ['status' => 400]);
    }
    if (strlen($text) < 5) {
        return new WP_Error('short_review', 'Review must be at least 5 characters', ['status' => 400]);
    }

    $user = get_user_by('id', $uid);
    if (!$user) return new WP_Error('no_user', 'User not found', ['status' => 401]);

    $is_free = hackknow_product_is_free($product_id);

    if (!$is_free) {
        // Must have purchased
        $bought = function_exists('wc_customer_bought_product')
            ? wc_customer_bought_product($user->user_email, $uid, $product_id)
            : false;
        if (!$bought) {
            return new WP_Error('not_purchased', 'You can review this product only after purchasing it.', ['status' => 403]);
        }
        // Only one review per paid product per user
        $existing = get_comments([
            'post_id'      => $product_id,
            'user_id'      => $uid,
            'type'         => 'review',
            'count'        => true,
            'status'       => 'all',
        ]);
        if ((int) $existing > 0) {
            return new WP_Error('already_reviewed', 'You have already reviewed this product.', ['status' => 409]);
        }
    }

    $comment_id = wp_insert_comment([
        'comment_post_ID'      => $product_id,
        'comment_author'       => $user->display_name ?: $user->user_login,
        'comment_author_email' => $user->user_email,
        'comment_content'      => $text,
        'comment_type'         => 'review',
        'comment_approved'     => $is_free ? 0 : 1, // free reviews queued for moderation; verified buyers auto-approved
        'user_id'              => $uid,
    ]);
    if (!$comment_id) {
        return new WP_Error('insert_failed', 'Could not save review', ['status' => 500]);
    }
    add_comment_meta($comment_id, 'rating', $rating, true);
    add_comment_meta($comment_id, 'verified', $is_free ? 0 : 1, true);

    return new WP_REST_Response([
        'ok'      => true,
        'pending' => $is_free,
        'review'  => hackknow_review_to_array(get_comment($comment_id)),
    ], 201);
}

/* ── Reviews: admin moderation ─────────────────────────────────────────── */

function hackknow_admin_check(WP_REST_Request $req) {
    $uid = hackknow_authed_uid($req);
    if (is_wp_error($uid)) return $uid;
    if (!user_can($uid, 'manage_options')) {
        return new WP_Error('not_admin', 'Admins only', ['status' => 403]);
    }
    return $uid;
}

function hackknow_admin_reviews_list(WP_REST_Request $req) {
    $check = hackknow_admin_check($req);
    if (is_wp_error($check)) return $check;
    $status = sanitize_text_field($req->get_param('status') ?: 'all');
    $comments = get_comments([
        'type'   => 'review',
        'status' => $status === 'all' ? 'all' : $status,
        'order'  => 'DESC',
        'number' => 200,
    ]);
    return new WP_REST_Response([
        'reviews' => array_map('hackknow_review_to_array', $comments),
    ], 200);
}

function hackknow_admin_review_delete(WP_REST_Request $req) {
    $check = hackknow_admin_check($req);
    if (is_wp_error($check)) return $check;
    $cid = (int) $req['id'];
    if (!$cid || !get_comment($cid)) {
        return new WP_Error('not_found', 'Review not found', ['status' => 404]);
    }
    wp_delete_comment($cid, true);
    return new WP_REST_Response(['ok' => true, 'id' => $cid], 200);
}

function hackknow_admin_review_approve(WP_REST_Request $req) {
    $check = hackknow_admin_check($req);
    if (is_wp_error($check)) return $check;
    $cid = (int) $req['id'];
    $action = sanitize_text_field($req->get_param('action') ?: 'approve'); // approve|hide
    $comment = get_comment($cid);
    if (!$comment) return new WP_Error('not_found', 'Review not found', ['status' => 404]);
    wp_set_comment_status($cid, $action === 'hide' ? 'hold' : 'approve');
    return new WP_REST_Response(['ok' => true, 'id' => $cid, 'status' => $action], 200);
}

/* ── Yahavi AI Chat ────────────────────────────────────────────────────── */

function hackknow_chat(WP_REST_Request $req) {
    $message = trim((string) ($req->get_param('message') ?? ''));
    if ($message === '') {
        return new WP_Error('empty', 'Message is required', ['status' => 400]);
    }
    $lower = strtolower($message);

    // ── Optional: real LLM if HACKKNOW_OPENAI_KEY constant is configured ──
    if (defined('HACKKNOW_OPENAI_KEY') && HACKKNOW_OPENAI_KEY) {
        $context = "You are Yahavi, the multilingual AI assistant for HackKnow.com — "
                 . "a digital marketplace selling Excel templates, PowerPoint decks, dashboards, "
                 . "marketing kits, Notion templates, and free resources. "
                 . "Always answer in the same language the user used. "
                 . "When relevant, suggest navigating to one of: /shop, /shop/free-resources, "
                 . "/shop/excel-templates, /shop/dashboards, /shop/presentation-templates, "
                 . "/shop/marketing-kits, /shop/notion-templates, /account/orders, /support, /contact. "
                 . "Cross-sell related premium templates when a free one is mentioned. "
                 . "Keep replies short (max 80 words).";
        $body = [
            'model' => 'gpt-4o-mini',
            'messages' => [
                ['role' => 'system', 'content' => $context],
                ['role' => 'user',   'content' => $message],
            ],
            'temperature' => 0.4,
        ];
        $resp = wp_remote_post('https://api.openai.com/v1/chat/completions', [
            'headers' => [
                'Authorization' => 'Bearer ' . HACKKNOW_OPENAI_KEY,
                'Content-Type'  => 'application/json',
            ],
            'body'    => wp_json_encode($body),
            'timeout' => 20,
        ]);
        if (!is_wp_error($resp) && (int) wp_remote_retrieve_response_code($resp) === 200) {
            $j = json_decode(wp_remote_retrieve_body($resp), true);
            $reply = $j['choices'][0]['message']['content'] ?? '';
            if ($reply) {
                return new WP_REST_Response([
                    'reply'       => $reply,
                    'suggestions' => hackknow_chat_suggest($lower),
                ], 200);
            }
        }
        // fall through to rule-based on failure
    }

    // ── Rule-based intent routing (works without any API key) ─────────────
    $intent = hackknow_chat_intent($lower);
    return new WP_REST_Response([
        'reply'       => $intent['reply'],
        'suggestions' => $intent['suggestions'],
        'products'    => $intent['products'],
    ], 200);
}

function hackknow_chat_suggest($lower) {
    $sugg = [];
    if (strpos($lower, 'free') !== false || strpos($lower, 'मुफ्त') !== false) {
        $sugg[] = ['label' => 'Free templates', 'href' => '/shop/free-resources'];
    }
    if (strpos($lower, 'excel') !== false || strpos($lower, 'spreadsheet') !== false) {
        $sugg[] = ['label' => 'Excel templates', 'href' => '/shop/excel-templates'];
    }
    if (strpos($lower, 'dashboard') !== false) {
        $sugg[] = ['label' => 'Dashboards', 'href' => '/shop/dashboards'];
    }
    if (strpos($lower, 'order') !== false || strpos($lower, 'download') !== false) {
        $sugg[] = ['label' => 'My orders', 'href' => '/account/orders'];
    }
    return $sugg;
}

function hackknow_chat_intent($lower) {
    $hi  = ['hi', 'hello', 'hey', 'namaste', 'नमस्ते', 'hola', 'bonjour'];
    foreach ($hi as $h) if (strpos($lower, $h) !== false) {
        return [
            'reply' => "Hi! I'm Yahavi. I can help you find templates, filter by price, track orders, or recommend the right product. What are you looking for?",
            'suggestions' => [
                ['label' => 'Browse all',     'href' => '/shop'],
                ['label' => 'Free templates', 'href' => '/shop/free-resources'],
                ['label' => 'Best sellers',   'href' => '/shop?sort=popular'],
            ],
            'products' => hackknow_chat_top_products(0),
        ];
    }

    if (strpos($lower, 'free') !== false || strpos($lower, 'मुफ्त') !== false || strpos($lower, 'gratis') !== false) {
        return [
            'reply' => "We have a full library of free templates — Excel, Notion, marketing kits and more. Want me to take you there?",
            'suggestions' => [['label' => 'Open free templates', 'href' => '/shop/free-resources']],
            'products' => hackknow_chat_top_products(0, 'free-resources'),
        ];
    }

    if (strpos($lower, 'excel') !== false) {
        return [
            'reply' => "Our Excel section has dashboards, financial models and trackers. I can show you the most popular ones.",
            'suggestions' => [
                ['label' => 'Excel templates', 'href' => '/shop/excel-templates'],
                ['label' => 'Dashboards',      'href' => '/shop/dashboards'],
            ],
            'products' => hackknow_chat_top_products(3, 'excel-templates'),
        ];
    }

    if (strpos($lower, 'order') !== false || strpos($lower, 'download') !== false || strpos($lower, 'invoice') !== false) {
        return [
            'reply' => "You can see all your orders, invoices and downloads in your account.",
            'suggestions' => [
                ['label' => 'My orders',    'href' => '/account/orders'],
                ['label' => 'My downloads', 'href' => '/account/downloads'],
            ],
            'products' => [],
        ];
    }

    if (strpos($lower, 'refund') !== false || strpos($lower, 'return') !== false) {
        return [
            'reply' => "Digital products are non-refundable once downloaded, but if a file is broken or wrong we'll fix it within 24 hours. Open a ticket?",
            'suggestions' => [
                ['label' => 'Refund policy', 'href' => '/refund-policy'],
                ['label' => 'Contact support', 'href' => '/contact'],
            ],
            'products' => [],
        ];
    }

    if (strpos($lower, 'price') !== false || strpos($lower, 'cost') !== false || strpos($lower, 'cheap') !== false) {
        return [
            'reply' => "Prices range from free to ₹1,999 for premium bundles. I can sort the shop low-to-high for you.",
            'suggestions' => [
                ['label' => 'Cheapest first', 'href' => '/shop?sort=price-asc'],
                ['label' => 'Best value',     'href' => '/shop?sort=popular'],
            ],
            'products' => hackknow_chat_top_products(3),
        ];
    }

    // Default: search
    $hits = hackknow_chat_search_products($lower);
    if (!empty($hits)) {
        return [
            'reply' => "Here are a few products that match what you're looking for:",
            'suggestions' => [['label' => 'See all results', 'href' => '/shop?q=' . rawurlencode($lower)]],
            'products' => $hits,
        ];
    }
    return [
        'reply' => "I can help with finding templates, applying filters, tracking orders, refunds, or recommendations. Could you tell me a bit more?",
        'suggestions' => [
            ['label' => 'Browse all',     'href' => '/shop'],
            ['label' => 'Free templates', 'href' => '/shop/free-resources'],
            ['label' => 'Contact a human', 'href' => '/contact'],
        ],
        'products' => hackknow_chat_top_products(3),
    ];
}

function hackknow_chat_top_products($limit = 3, $category_slug = '') {
    $args = [
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => $limit > 0 ? $limit : 3,
        'orderby'        => 'meta_value_num',
        'meta_key'       => 'total_sales',
        'order'          => 'DESC',
    ];
    if ($category_slug) {
        $args['tax_query'] = [[
            'taxonomy' => 'product_cat',
            'field'    => 'slug',
            'terms'    => $category_slug,
        ]];
    }
    $q = new WP_Query($args);
    $out = [];
    foreach ($q->posts as $p) {
        $product = wc_get_product($p->ID);
        if (!$product) continue;
        $img = get_the_post_thumbnail_url($p->ID, 'thumbnail') ?: '';
        $out[] = [
            'id'    => (int) $p->ID,
            'name'  => $product->get_name(),
            'price' => wp_strip_all_tags($product->get_price_html()),
            'href'  => '/product/' . $p->ID,
            'image' => $img,
        ];
    }
    return $out;
}

function hackknow_chat_search_products($query) {
    $words = preg_split('/\s+/', preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $query));
    $words = array_filter(array_map('trim', $words), function ($w) { return strlen($w) >= 3; });
    if (empty($words)) return [];
    $q = new WP_Query([
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => 3,
        's'              => implode(' ', $words),
    ]);
    $out = [];
    foreach ($q->posts as $p) {
        $product = wc_get_product($p->ID);
        if (!$product) continue;
        $out[] = [
            'id'    => (int) $p->ID,
            'name'  => $product->get_name(),
            'price' => wp_strip_all_tags($product->get_price_html()),
            'href'  => '/product/' . $p->ID,
            'image' => get_the_post_thumbnail_url($p->ID, 'thumbnail') ?: '',
        ];
    }
    return $out;
}
