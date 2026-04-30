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
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  Yahavi AI chat (POST /chat) — wiring the live store chat
 *  ─────────────────────────────────────────────────────────────────────────
 *  The /chat endpoint (function hackknow_chat) tries three back-ends in order
 *  and falls back to deterministic rule-based replies if none are configured.
 *  To turn ON real AI on hackknow.com, define ONE of these in wp-config.php:
 *
 *    1) HACKKNOW_AI_RELAY_URL  (recommended — free, no API key on Hostinger)
 *       Points at the Replit-hosted Yahavi API (Gemini-powered). Example:
 *           define('HACKKNOW_AI_RELAY_URL', 'https://<your-replit-deploy>/api/chat');
 *       The relay forwards { message, history } and returns { reply, suggestions }
 *       with real product / policy paths (/shop, /shop/free-resources, etc.).
 *
 *    2) HACKKNOW_GEMINI_KEY  (instant — needs a Google AI Studio key)
 *       Calls Google's Gemini 2.5 Flash directly from WordPress with a full
 *       multilingual system prompt + live store context (active coupons,
 *       recent purchases, upcoming releases, user tier). Example:
 *           define('HACKKNOW_GEMINI_KEY', 'AIza...');
 *
 *    3) HACKKNOW_OPENAI_KEY  (legacy — only used if neither of the above is set)
 *       Calls OpenAI gpt-4o-mini. Kept for backward compatibility.
 *
 *  If none are defined the chat silently falls back to canned, rule-based
 *  replies (still functional, just not LLM-powered).
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  Outbound mail (password-reset, order-confirmation, welcome) — SMTP setup
 *  ─────────────────────────────────────────────────────────────────────────
 *  Without authenticated SMTP, WordPress falls back to PHP mail() which goes
 *  out via Hostinger's generic relay. Gmail rejects/spams those because they
 *  have no DKIM signature for hackknow.com and the envelope sender doesn't
 *  match the From: header. To make password-reset emails actually land in
 *  Gmail inboxes, define these in wp-config.php (chmod 600, OUTSIDE the
 *  public_html web root — never commit them to the repo):
 *
 *      define('HACKKNOW_SMTP_HOST', 'smtp.hostinger.com');
 *      define('HACKKNOW_SMTP_PORT', 465);
 *      define('HACKKNOW_SMTP_USER', 'support@hackknow.com');
 *      define('HACKKNOW_SMTP_PASS', '<mailbox password>');
 *      // Optional — defaults below
 *      // define('HACKKNOW_SMTP_SECURE', 'ssl'); // 'ssl' for 465, 'tls' for 587
 *      // define('HACKKNOW_MAIL_FROM',  'support@hackknow.com');
 *      // define('HACKKNOW_MAIL_FROM_NAME', 'HackKnow');
 *
 *  The mailbox password lives in Hostinger panel → Emails →
 *  support@hackknow.com (Reset password). Once set, every wp_mail() call
 *  goes through Hostinger's authenticated SMTP relay, which DKIM-signs the
 *  message for hackknow.com and passes SPF — Gmail then accepts it inbox.
 *  Verify on /home/u828497513/.logs/mail.log: outbound entries should show
 *  the SMTP handoff instead of a local pickup.
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
    register_rest_route('hackknow/v1', '/admin/yahavi/feedback',        array_merge($open, ['methods' => 'GET',    'callback' => 'hackknow_admin_yahavi_feedback']));
    register_rest_route('hackknow/v1', '/chat',                         array_merge($open, ['methods' => 'POST',   'callback' => 'hackknow_chat']));

    /* ── Yahavi AI: per-user history, owner-state, coupons, upsell ── */
    register_rest_route('hackknow/v1', '/chat/history',     array_merge($open, ['methods' => 'GET',    'callback' => 'hackknow_chat_history_get']));
    register_rest_route('hackknow/v1', '/chat/history',     array_merge($open, ['methods' => 'POST',   'callback' => 'hackknow_chat_history_save']));
    register_rest_route('hackknow/v1', '/chat/history',     array_merge($open, ['methods' => 'DELETE', 'callback' => 'hackknow_chat_history_clear']));
    register_rest_route('hackknow/v1', '/chat/feedback',    array_merge($open, ['methods' => 'POST',   'callback' => 'hackknow_chat_feedback']));
    register_rest_route('hackknow/v1', '/coupon/validate',  array_merge($open, ['methods' => 'POST',   'callback' => 'hackknow_coupon_validate']));
    register_rest_route('hackknow/v1', '/upsell',           array_merge($open, ['methods' => 'GET',    'callback' => 'hackknow_upsell_get']));
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
/* From-address used for ALL outbound HackKnow mail. Must be a real mailbox on
 * the same domain as the site so SPF/DKIM/DMARC accept it. To stay aligned
 * with the SMTP-authenticated mailbox (see HACKKNOW_SMTP_USER below) the
 * default is support@hackknow.com — Hostinger DKIM-signs anything authenticated
 * as that user, and SPF passes because the message is being relayed by
 * smtp.hostinger.com. Override in wp-config.php with
 *   define('HACKKNOW_MAIL_FROM', 'team@hackknow.com');
 * if you switch the SMTP user to a different mailbox. */
if (!defined('HACKKNOW_MAIL_FROM'))      { define('HACKKNOW_MAIL_FROM',      'support@hackknow.com'); }
if (!defined('HACKKNOW_MAIL_FROM_NAME')) { define('HACKKNOW_MAIL_FROM_NAME', 'HackKnow'); }

/* ─── Site-wide mail headers ───────────────────────────────────────────────
 * The default wp_mail From is `wordpress@<sitehost>`, which does NOT exist as
 * a real mailbox on Hostinger and almost always fails SPF/DMARC checks → mail
 * silently drops or lands in spam. We force every outbound email to come from
 * support@hackknow.com (a real mailbox the owner controls) so the password-
 * reset, order-confirmation, and contact-form emails actually reach inboxes.
 *
 * IMPORTANT: WooCommerce (and some other plugins) set an explicit `From:`
 * header in $args['headers'] (e.g. `From: Hackknow <ceo.hackknow@gmail.com>`).
 * When WP sees a From header in $headers it uses it directly and SKIPS the
 * wp_mail_from filter entirely. That's why setting only wp_mail_from is not
 * enough — we MUST also strip any From: header from $args['headers'] AND
 * override the PHPMailer object directly in phpmailer_init. Otherwise
 * password-reset / order / welcome emails go out claiming `From: gmail.com`
 * from a Hostinger IP, which Gmail's DMARC `p=reject` policy silently TRASHES
 * (not even spam). Hours of "no email arrived" bug reports trace back to
 * exactly this. */
add_filter('wp_mail_from',      function ($from) { return HACKKNOW_MAIL_FROM; },      PHP_INT_MAX);
add_filter('wp_mail_from_name', function ($name) { return HACKKNOW_MAIL_FROM_NAME; }, PHP_INT_MAX);

/* Strip any plugin-supplied `From:` header so WP falls back to wp_mail_from
 * filter (which we control). Runs at PHP_INT_MAX so it sees the final
 * header list after every other filter has had its turn. */
add_filter('wp_mail', function ($args) {
    if (!is_array($args)) return $args;
    $headers = isset($args['headers']) ? $args['headers'] : [];
    if (is_string($headers)) {
        // Remove any "From:" line (case-insensitive, multi-line safe)
        $headers = preg_replace('/^From:.*$/im', '', $headers);
        $headers = preg_replace("/\n\s*\n/", "\n", trim($headers));
    } elseif (is_array($headers)) {
        $headers = array_values(array_filter($headers, function ($h) {
            return !preg_match('/^\s*From\s*:/i', (string) $h);
        }));
    }
    $args['headers'] = $headers;
    return $args;
}, PHP_INT_MAX);

/* Last line of defence — override the PHPMailer object right before send.
 * This catches code paths that bypass wp_mail() entirely (rare) and any
 * future plugin that might re-set From after our wp_mail filter.
 *
 * If HACKKNOW_SMTP_HOST + USER + PASS are defined in wp-config.php we ALSO
 * switch PHPMailer from local PHP mail() to authenticated SMTP. This is what
 * makes Gmail accept the message into the inbox: the outbound mail is now
 * relayed by Hostinger\'s smtp.hostinger.com on behalf of a real mailbox
 * (support@hackknow.com), so it gets DKIM-signed for hackknow.com and SPF
 * passes. Without it, mail() messages are rejected/spammed because they
 * lack DKIM and the envelope sender doesn\'t match the From: header.
 *
 * Required wp-config.php constants (chmod 600, OUTSIDE public_html):
 *   define('HACKKNOW_SMTP_HOST', 'smtp.hostinger.com');
 *   define('HACKKNOW_SMTP_PORT', 465);
 *   define('HACKKNOW_SMTP_USER', 'support@hackknow.com');
 *   define('HACKKNOW_SMTP_PASS', '<mailbox password from Hostinger panel>');
 * Optional:
 *   define('HACKKNOW_SMTP_SECURE', 'ssl'); // or 'tls' if using port 587
 */
add_action('phpmailer_init', function ($phpmailer) {
    try {
        $phpmailer->From     = HACKKNOW_MAIL_FROM;
        $phpmailer->FromName = HACKKNOW_MAIL_FROM_NAME;
        $phpmailer->Sender   = HACKKNOW_MAIL_FROM; // Return-Path / envelope sender

        if (defined('HACKKNOW_SMTP_HOST') && defined('HACKKNOW_SMTP_USER') && defined('HACKKNOW_SMTP_PASS')) {
            $phpmailer->isSMTP();
            $phpmailer->Host       = HACKKNOW_SMTP_HOST;
            $phpmailer->Port       = defined('HACKKNOW_SMTP_PORT')   ? (int) HACKKNOW_SMTP_PORT   : 465;
            $phpmailer->SMTPSecure = defined('HACKKNOW_SMTP_SECURE') ? HACKKNOW_SMTP_SECURE       : 'ssl';
            $phpmailer->SMTPAuth   = true;
            $phpmailer->Username   = HACKKNOW_SMTP_USER;
            $phpmailer->Password   = HACKKNOW_SMTP_PASS;
            $phpmailer->SMTPAutoTLS = true;
            // Sane timeouts so a wedged SMTP server can\'t hang the page.
            $phpmailer->Timeout    = 15;
        }
    } catch (\Throwable $e) {
        error_log('[hackknow] phpmailer_init override failed: ' . $e->getMessage());
    }
}, PHP_INT_MAX);

/* Surface any wp_mail failures into the PHP error log so the owner can debug
 * delivery issues from /var/log without guessing. */
add_action('wp_mail_failed', function ($wp_error) {
    if ($wp_error instanceof WP_Error) {
        $data = $wp_error->get_error_data();
        $to   = is_array($data) && isset($data['to']) ? (is_array($data['to']) ? implode(',', $data['to']) : $data['to']) : 'unknown';
        error_log('[hackknow] wp_mail FAILED to=' . $to . ' err=' . $wp_error->get_error_message());
    }
}, 10);

/* Override WP password-reset email to use HackKnow frontend link & branding. */
add_filter('retrieve_password_title', function () {
    return 'Reset your HackKnow password';
}, 99);

add_filter('retrieve_password_message', function ($message, $key, $user_login, $user_data) {
    if (!$user_data || empty($user_data->user_email)) return $message;
    $reset_url = add_query_arg([
        'key'   => $key,
        'login' => rawurlencode($user_login),
    ], HACKKNOW_FRONTEND_URL . '/reset-password');

    $name        = $user_data->first_name ?: $user_data->display_name ?: $user_login;
    $safe_name   = esc_html($name);
    $safe_email  = esc_html($user_data->user_email);
    $safe_url    = esc_url($reset_url);
    $safe_brand  = esc_url(HACKKNOW_FRONTEND_URL);

    // Plain-text fallback (some older clients ignore HTML headers)
    $plain = "Hi {$name},\n\n"
           . "Someone requested a password reset for your HackKnow account ({$user_data->user_email}).\n\n"
           . "If this was you, click the link below to choose a new password (valid for 24 hours):\n\n"
           . $reset_url . "\n\n"
           . "If you did not request this, you can safely ignore this email — your password will stay the same.\n\n"
           . "— The HackKnow Team\n"
           . HACKKNOW_FRONTEND_URL . "\n";

    // Stash an HTML version on a transient so the wp_mail filter below can
    // pick it up and switch the Content-Type. Keyed by the reset key (unique
    // per request, expires in 1 hour).
    $html = '<!doctype html><html><body style="margin:0;padding:24px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#f5f5f5;">'
          . '<div style="max-width:520px;margin:0 auto;background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;">'
          . '<h1 style="margin:0 0 8px;font-size:22px;color:#fff;">Reset your HackKnow password</h1>'
          . '<p style="color:#bbb;line-height:1.6;font-size:14px;">Hi ' . $safe_name . ',</p>'
          . '<p style="color:#bbb;line-height:1.6;font-size:14px;">Someone requested a password reset for your HackKnow account (<strong>' . $safe_email . '</strong>).</p>'
          . '<p style="color:#bbb;line-height:1.6;font-size:14px;">If this was you, click the button below to choose a new password. This link is valid for 24 hours.</p>'
          . '<p style="text-align:center;margin:28px 0;">'
          . '<a href="' . $safe_url . '" style="display:inline-block;padding:14px 28px;background:linear-gradient(90deg,#facc15,#f97316);color:#0a0a0a;text-decoration:none;border-radius:12px;font-weight:bold;font-size:15px;">Reset password</a>'
          . '</p>'
          . '<p style="color:#777;font-size:12px;line-height:1.6;">Button not working? Copy and paste this link into your browser:<br><a href="' . $safe_url . '" style="color:#facc15;word-break:break-all;">' . $safe_url . '</a></p>'
          . '<p style="color:#777;font-size:12px;line-height:1.6;margin-top:24px;">If you did not request this, you can safely ignore this email — your password will stay the same.</p>'
          . '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0;">'
          . '<p style="color:#555;font-size:11px;text-align:center;">— The HackKnow Team<br><a href="' . $safe_brand . '" style="color:#facc15;text-decoration:none;">' . $safe_brand . '</a></p>'
          . '</div></body></html>';

    set_transient('hk_pw_html_' . md5($user_data->user_email), $html, HOUR_IN_SECONDS);
    return $plain;
}, 99, 4);

/* When wp_mail() is about to send the reset email, swap in our HTML body
 * (looked up by recipient) and set Content-Type to text/html. */
add_filter('wp_mail', function ($args) {
    if (!is_array($args) || empty($args['to']) || empty($args['subject'])) return $args;
    $subj = (string) $args['subject'];
    if (stripos($subj, 'reset your hackknow password') === false) return $args;
    $to   = is_array($args['to']) ? reset($args['to']) : (string) $args['to'];
    $html = get_transient('hk_pw_html_' . md5(strtolower(trim($to))));
    if (!$html) return $args;
    delete_transient('hk_pw_html_' . md5(strtolower(trim($to))));
    $args['message'] = $html;
    $headers = isset($args['headers']) ? (array) $args['headers'] : [];
    $headers[] = 'Content-Type: text/html; charset=UTF-8';
    $headers[] = 'Reply-To: ' . HACKKNOW_MAIL_FROM;
    $args['headers'] = $headers;
    return $args;
}, 99);

function hackknow_forgot_password(WP_REST_Request $req) {
    $email = sanitize_email((string)($req->get_param('email') ?? ''));
    if (!is_email($email)) {
        return new WP_Error('bad_email', 'A valid email is required', ['status' => 400]);
    }

    $user = get_user_by('email', $email);
    if ($user) {
        $result = retrieve_password($user->user_login);
        if (is_wp_error($result)) {
            error_log('[hackknow] forgot_password retrieve_password failed for ' . $email . ': ' . $result->get_error_message());
        } else {
            error_log('[hackknow] forgot_password: reset email queued for ' . $email);
        }
    } else {
        error_log('[hackknow] forgot_password: no user found for ' . $email . ' (silent success returned)');
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
    $items  = $req->get_param('items');
    $email  = sanitize_email((string)($req->get_param('email') ?? ''));
    $phone  = sanitize_text_field((string)($req->get_param('phone') ?? ''));
    $first  = sanitize_text_field((string)($req->get_param('first_name') ?? ''));
    $last   = sanitize_text_field((string)($req->get_param('last_name') ?? ''));
    $coupon = strtolower(trim((string)($req->get_param('coupon_code') ?? '')));

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

    // ── Apply coupon (validated server-side via WC_Coupon) ──
    $coupon_applied  = '';
    $coupon_reason   = '';
    if ($coupon !== '' && class_exists('WC_Coupon')) {
        $c = new WC_Coupon($coupon);
        $cid = (int)$c->get_id();
        if ($cid <= 0) {
            $coupon_reason = 'Coupon does not exist';
        } else {
            $expires_ts = $c->get_date_expires() ? $c->get_date_expires()->getTimestamp() : 0;
            $usage_lim  = (int)$c->get_usage_limit();
            $usage_cnt  = (int)$c->get_usage_count();
            if ($expires_ts && $expires_ts < time()) {
                $coupon_reason = 'Coupon has expired';
            } elseif ($usage_lim > 0 && $usage_cnt >= $usage_lim) {
                $coupon_reason = 'Coupon usage-limit reached';
            } else {
                $applied = $order->apply_coupon($c->get_code());
                if (is_wp_error($applied)) {
                    $coupon_reason = $applied->get_error_message();
                } else {
                    $coupon_applied = $c->get_code();
                }
            }
        }
    }

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
    return [
        'wc_order_id'    => $order->get_id(),
        'razorpay_order' => $body['id'],
        'amount'         => $amount_paise,
        'currency'       => 'INR',
        'key_id'         => $key_id,
        'coupon_applied' => $coupon_applied,
        'coupon_reason'  => $coupon_reason,
        'discount'       => (float) $order->get_discount_total(),
    ];
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

// (Removed: one-time `/admin/create-demo-product` dev shim. The original
// endpoint was gated only by `permission_callback => __return_true` plus a
// hardcoded body secret, which is too weak for a publicly reachable
// product-creation route. The seed product it created already exists in
// production. If a similar bootstrap is ever needed again, gate it with
// `current_user_can('manage_woocommerce')` and a wp_nonce, never with a
// shared string.)

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

/**
 * GET /admin/yahavi/feedback
 *   Owner-only. Returns paginated Yahavi answer turns so the site owner can
 *   read which replies customers loved (👍) or hated (👎) and tune the bot.
 *
 *   Query params:
 *     - filter: all | up | down | none      (default: all)
 *     - page:   1-based page number          (default: 1)
 *     - per_page: 1..200                     (default: 50)
 *
 *   A "turn" pairs each bot reply row with the most recent prior user message
 *   from the same conversation (matched by user_id when logged in, else by
 *   session_id). The user message itself may be missing — old data, or
 *   greetings the bot opened — so `question` can be null.
 */
function hackknow_admin_yahavi_feedback(WP_REST_Request $req) {
    $check = hackknow_admin_check($req);
    if (is_wp_error($check)) return $check;

    global $wpdb;
    $table = $wpdb->prefix . 'hk_chat_messages';

    $filter   = sanitize_text_field((string) ($req->get_param('filter') ?: 'all'));
    $page     = max(1, (int) ($req->get_param('page') ?: 1));
    $per_page = (int) ($req->get_param('per_page') ?: 50);
    if ($per_page < 1)   $per_page = 50;
    if ($per_page > 200) $per_page = 200;
    $offset = ($page - 1) * $per_page;

    // Map the filter chip onto a feedback() WHERE clause. The DB stores
    // -1/0/+1; "none" is the no-rating case.
    $allowed = ['all', 'up', 'down', 'none'];
    if (!in_array($filter, $allowed, true)) $filter = 'all';
    $where = "role = 'bot'";
    if     ($filter === 'up')   $where .= " AND feedback = 1";
    elseif ($filter === 'down') $where .= " AND feedback = -1";
    elseif ($filter === 'none') $where .= " AND feedback = 0";

    $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE {$where}");

    $bot_rows = $wpdb->get_results($wpdb->prepare(
        "SELECT id, user_id, user_email, session_id, message, feedback, created_at
         FROM {$table}
         WHERE {$where}
         ORDER BY id DESC
         LIMIT %d OFFSET %d",
        $per_page, $offset
    ), ARRAY_A);

    $turns = [];
    foreach ((array) $bot_rows as $r) {
        // Find the most recent user message that came BEFORE this bot reply
        // in the same conversation. Logged-in users own their thread by
        // user_id; anonymous threads are scoped by session_id.
        $bot_id  = (int) $r['id'];
        $uid     = (int) $r['user_id'];
        $sess    = (string) $r['session_id'];
        $question = null;
        if ($uid > 0 && $sess !== '') {
            // Prefer matching on BOTH user_id and session_id so a user with
            // several interleaved tabs/sessions doesn't pull a question from
            // an unrelated thread. Fall back to user_id-only for legacy rows
            // that pre-date session tracking.
            $question = $wpdb->get_var($wpdb->prepare(
                "SELECT message FROM {$table}
                 WHERE role = 'user' AND user_id = %d AND session_id = %s AND id < %d
                 ORDER BY id DESC LIMIT 1",
                $uid, $sess, $bot_id
            ));
            if ($question === null) {
                $question = $wpdb->get_var($wpdb->prepare(
                    "SELECT message FROM {$table}
                     WHERE role = 'user' AND user_id = %d AND id < %d
                     ORDER BY id DESC LIMIT 1",
                    $uid, $bot_id
                ));
            }
        } elseif ($uid > 0) {
            $question = $wpdb->get_var($wpdb->prepare(
                "SELECT message FROM {$table}
                 WHERE role = 'user' AND user_id = %d AND id < %d
                 ORDER BY id DESC LIMIT 1",
                $uid, $bot_id
            ));
        } elseif ($sess !== '') {
            $question = $wpdb->get_var($wpdb->prepare(
                "SELECT message FROM {$table}
                 WHERE role = 'user' AND session_id = %s AND id < %d
                 ORDER BY id DESC LIMIT 1",
                $sess, $bot_id
            ));
        }

        $turns[] = [
            'id'         => $bot_id,
            'user_id'    => $uid,
            'user_email' => (string) $r['user_email'],
            'session_id' => $sess,
            'question'   => $question !== null ? (string) $question : null,
            'reply'      => (string) $r['message'],
            'rating'     => (int) $r['feedback'],
            'created_at' => (string) $r['created_at'],
        ];
    }

    return new WP_REST_Response([
        'turns'    => $turns,
        'page'     => $page,
        'per_page' => $per_page,
        'total'    => $total,
        'filter'   => $filter,
    ], 200);
}

/* ── Yahavi AI Chat — context helpers ──────────────────────────────────── */

/**
 * Fetch the WooCommerce coupons that are CURRENTLY usable (published, not
 * expired, not over the usage limit). Yahavi will be told to suggest only
 * these — never invent codes or discount percentages.
 *
 * @return array<int,array{code:string,type:string,amount:float,min:float,desc:string,expires:?string}>
 */
function hackknow_chat_active_coupons($limit = 8) {
    if (!class_exists('WC_Coupon')) return [];
    $cached = get_transient('hk_chat_active_coupons_v1');
    if (is_array($cached)) return $cached;

    $q = new WP_Query([
        'post_type'      => 'shop_coupon',
        'post_status'    => 'publish',
        'posts_per_page' => max(1, (int) $limit),
        'orderby'        => 'date',
        'order'          => 'DESC',
        'no_found_rows'  => true,
        'fields'         => 'ids',
    ]);
    $now = time();
    $out = [];
    foreach ($q->posts as $cid) {
        $c = new WC_Coupon((int) $cid);
        if ((int) $c->get_id() <= 0) continue;
        $exp_obj = $c->get_date_expires();
        $exp_ts  = $exp_obj ? $exp_obj->getTimestamp() : 0;
        if ($exp_ts && $exp_ts < $now) continue;
        $usage_lim = (int) $c->get_usage_limit();
        $usage_cnt = (int) $c->get_usage_count();
        if ($usage_lim > 0 && $usage_cnt >= $usage_lim) continue;
        $out[] = [
            'code'    => strtoupper((string) $c->get_code()),
            'type'    => (string) $c->get_discount_type(),
            'amount'  => (float)  $c->get_amount(),
            'min'     => (float)  $c->get_minimum_amount(),
            'desc'    => trim((string) $c->get_description()),
            'expires' => $exp_ts ? gmdate('Y-m-d', $exp_ts) : null,
        ];
    }
    wp_reset_postdata();
    set_transient('hk_chat_active_coupons_v1', $out, 5 * MINUTE_IN_SECONDS);
    return $out;
}

/**
 * Last few product names this user has actually bought (completed/processing
 * orders). Used by Yahavi for "you bought X — pair with Y" suggestions.
 */
function hackknow_chat_recent_purchases($uid, $limit = 5) {
    $uid = (int) $uid;
    if ($uid <= 0 || !function_exists('wc_get_orders')) return [];
    $orders = wc_get_orders([
        'limit'    => 5,
        'customer' => $uid,
        'status'   => ['wc-completed', 'wc-processing'],
        'orderby'  => 'date',
        'order'    => 'DESC',
    ]);
    $names = [];
    foreach ($orders as $o) {
        foreach ($o->get_items() as $it) {
            $n = trim((string) $it->get_name());
            if ($n !== '' && !in_array($n, $names, true)) $names[] = $n;
            if (count($names) >= $limit) break 2;
        }
    }
    return $names;
}

/**
 * Classify the user for coupon-eligibility purposes.
 *  - 'GUEST'     : not logged in (treat as a NEW prospect)
 *  - 'NEW'       : logged in but zero completed/processing orders → eligible
 *                  for the WELCOME / first-purchase offer.
 *  - 'RETURNING' : has at least one paid order → only eligible for a coupon
 *                  during a clear upsell/cross-sell moment.
 *
 * @return array{tier:string,paid_orders:int}
 */
function hackknow_chat_user_status($uid) {
    $uid = (int) $uid;
    if ($uid <= 0) return ['tier' => 'GUEST', 'paid_orders' => 0];
    if (!function_exists('wc_get_orders')) return ['tier' => 'GUEST', 'paid_orders' => 0];
    $ids = wc_get_orders([
        'limit'    => -1,
        'customer' => $uid,
        'status'   => ['wc-completed', 'wc-processing'],
        'return'   => 'ids',
    ]);
    $n = is_array($ids) ? count($ids) : 0;
    return [
        'tier'        => $n > 0 ? 'RETURNING' : 'NEW',
        'paid_orders' => $n,
    ];
}

/**
 * Products tagged "coming-soon" or "upcoming" — used for "next month yeh
 * launch ho raha hai" teasers. Falls back to the 3 most recently published
 * products if no upcoming items are tagged.
 */
function hackknow_chat_upcoming_products($limit = 3) {
    $cached = get_transient('hk_chat_upcoming_v1');
    if (is_array($cached)) return $cached;

    $args = [
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => max(1, (int) $limit),
        'no_found_rows'  => true,
        'fields'         => 'ids',
        'tax_query'      => [[
            'taxonomy' => 'product_tag',
            'field'    => 'slug',
            'terms'    => ['coming-soon', 'upcoming', 'pre-order'],
        ]],
    ];
    $q = new WP_Query($args);
    $ids = $q->posts;
    if (empty($ids)) {
        // Fallback: most recently published products
        $q2 = new WP_Query([
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => max(1, (int) $limit),
            'orderby'        => 'date',
            'order'          => 'DESC',
            'no_found_rows'  => true,
            'fields'         => 'ids',
        ]);
        $ids = $q2->posts;
        wp_reset_postdata();
    }
    $out = [];
    foreach ($ids as $pid) {
        $p = function_exists('wc_get_product') ? wc_get_product((int) $pid) : null;
        if (!$p) continue;
        $out[] = [
            'name'  => $p->get_name(),
            'price' => $p->get_price_html() ? wp_strip_all_tags($p->get_price_html()) : '',
            'path'  => '/product/' . $p->get_slug(),
        ];
    }
    wp_reset_postdata();
    set_transient('hk_chat_upcoming_v2', $out, 15 * MINUTE_IN_SECONDS);
    return $out;
}

/* ── Yahavi AI Chat ────────────────────────────────────────────────────── */

function hackknow_chat(WP_REST_Request $req) {
    $message = trim((string) ($req->get_param('message') ?? ''));
    if ($message === '') {
        return new WP_Error('empty', 'Message is required', ['status' => 400]);
    }
    $lower   = strtolower($message);
    $history = $req->get_param('history');
    if (!is_array($history)) $history = [];

    // ── Preferred: relay to the Replit-hosted Yahavi API (Gemini-powered) ──
    // Set HACKKNOW_AI_RELAY_URL in wp-config.php to e.g. 'https://your-app.replit.app/api/chat'
    // Set HACKKNOW_AI_RELAY_SECRET to the same value as CHAT_RELAY_SECRET on the Replit api-server
    // so this server-to-server call passes the api-server's caller allowlist.
    if (defined('HACKKNOW_AI_RELAY_URL') && HACKKNOW_AI_RELAY_URL) {
        $relay_headers = [
            'Content-Type' => 'application/json',
            'Origin'       => 'https://hackknow.com',
        ];
        if (defined('HACKKNOW_AI_RELAY_SECRET') && HACKKNOW_AI_RELAY_SECRET) {
            $relay_headers['x-relay-secret'] = HACKKNOW_AI_RELAY_SECRET;
        }
        $resp = wp_remote_post(HACKKNOW_AI_RELAY_URL, [
            'headers' => $relay_headers,
            'body'    => wp_json_encode([
                'message' => $message,
                'history' => array_slice($history, -8),
            ]),
            'timeout' => 25,
        ]);
        if (!is_wp_error($resp) && (int) wp_remote_retrieve_response_code($resp) === 200) {
            $j = json_decode(wp_remote_retrieve_body($resp), true);
            if (!empty($j['reply'])) {
                return new WP_REST_Response([
                    'reply'       => $j['reply'],
                    'suggestions' => $j['suggestions'] ?? hackknow_chat_suggest($lower),
                ], 200);
            }
        }
        // fall through on failure
    }

    // ── Optional: direct Gemini if HACKKNOW_GEMINI_KEY constant is configured ──
    if (defined('HACKKNOW_GEMINI_KEY') && HACKKNOW_GEMINI_KEY) {
        // Pull live store context so Yahavi never invents prices, codes, or products.
        $auth_uid          = (int) hackknow_verify_token(hackknow_extract_bearer($req));
        $active_coupons    = hackknow_chat_active_coupons(8);
        $recent_purchases  = $auth_uid > 0 ? hackknow_chat_recent_purchases($auth_uid, 5) : [];
        $upcoming_products = hackknow_chat_upcoming_products(3);
        $user_status       = hackknow_chat_user_status($auth_uid);

        // ── Build structured context blocks Yahavi can quote verbatim ──
        $coupons_block = '';
        if (!empty($active_coupons)) {
            $lines = [];
            foreach ($active_coupons as $c) {
                $val = $c['type'] === 'percent'
                    ? rtrim(rtrim(number_format($c['amount'], 2, '.', ''), '0'), '.') . '% off'
                    : '₹' . rtrim(rtrim(number_format($c['amount'], 2, '.', ''), '0'), '.') . ' off';
                $cond = $c['min'] > 0
                    ? ' (min order ₹' . rtrim(rtrim(number_format($c['min'], 2, '.', ''), '0'), '.') . ')'
                    : '';
                $exp = $c['expires'] ? ' [expires ' . $c['expires'] . ']' : '';
                $note = $c['desc'] !== '' ? ' — ' . $c['desc'] : '';
                $lines[] = '- ' . $c['code'] . ': ' . $val . $cond . $exp . $note;
            }
            $coupons_block = "AVAILABLE_COUPONS (the ONLY codes you may ever mention):\n" . implode("\n", $lines);
        } else {
            $coupons_block = "AVAILABLE_COUPONS: (none right now — do NOT promise any coupon)";
        }

        $purchases_block = '';
        if (!empty($recent_purchases)) {
            $purchases_block = "USER_RECENT_PURCHASES (this very customer already owns these):\n- "
                             . implode("\n- ", array_map('wp_strip_all_tags', $recent_purchases));
        }

        $upcoming_block = '';
        if (!empty($upcoming_products)) {
            $lines = [];
            foreach ($upcoming_products as $u) {
                $price_part = ($u['price'] !== '' ? ' (' . $u['price'] . ')' : '');
                $path_part  = (!empty($u['path']) ? ' [path: ' . $u['path'] . ']' : '');
                $lines[] = '- ' . $u['name'] . $price_part . $path_part;
            }
            $upcoming_block = "UPCOMING_OR_NEW_RELEASES (real products from our store — link them with the [path: …] value as a CITATION):\n" . implode("\n", $lines);
        }

        $status_block = "USER_STATUS: " . $user_status['tier']
                      . " (paid orders so far: " . $user_status['paid_orders'] . ")";

        $sys = "You are Yahavi — a warm, female AI assistant who runs HackKnow.com. "
             . "PERSONA: You are a girl. When speaking Hindi or Hinglish, ALWAYS use the feminine "
             . "first-person verb forms — 'main karungi / dekhungi / dikha dungi / madad karungi / "
             . "le jaungi / suggest karungi' — NEVER the masculine 'karunga / dekhunga / dikha "
             . "dunga / le jaunga'. In English, your tone is friendly and helpful. If a customer "
             . "asks 'are you real or AI?', answer honestly: 'Main Yahavi hoon — ek AI assistant "
             . "jo is poori website chalati hoon. Real human chahiye toh team@hackknow.com pe "
             . "email kar do.'\n\n"
             . "ABOUT THE STORE: HackKnow.com sells Excel templates, dashboards, PowerPoint decks, "
             . "Notion templates, marketing kits and free resources. Founder: Manish Kumar Singh, "
             . "Delhi NCR, India. Phone +91 87960 18700, team@hackknow.com. Refunds within 7 days "
             . "(file corrupt, wrong listing, missing files). Reply in the SAME language the user "
             . "wrote in (English, Hindi, Hinglish, French, German, Spanish…). Keep replies under "
             . "90 words. Suggest paths like /shop, /shop/free-resources, /account/orders, "
             . "/refund-policy, /privacy, /terms, /dmca, /testimonials, /contact, /checkout.\n\n"
             . "===== WHY HACKKNOW IS BETTER (your internal sales arsenal) =====\n"
             . "These are HackKnow's genuine advantages over the wider template/spreadsheet market. "
             . "Use them to convince customers — but the rules of engagement below are STRICT.\n"
             . " • One-time purchase, lifetime access — most big template marketplaces and Excel "
             . "   resource sites lock files behind monthly/yearly subscriptions; the moment a "
             . "   customer cancels, they lose access to everything they 'downloaded'. HackKnow "
             . "   sells outright — pay once, file is yours forever.\n"
             . " • Built for Indian professionals — INR pricing (no surprise USD-to-INR conversion "
             . "   markup), GST-ready invoices, formats tuned for Indian fiscal year, Indian "
             . "   accounting heads, and Indian business workflows. Most foreign template sites "
             . "   ignore all of this.\n"
             . " • Curated, not flooded — large stock-template libraries throw 50,000 mediocre "
             . "   files at you and let you fish. HackKnow ships a tight, hand-picked catalogue "
             . "   where every template is production-ready.\n"
             . " • Real human + AI support — many free Excel formula blogs leave you stranded with "
             . "   a comments section. HackKnow has email support (team@hackknow.com), phone "
             . "   (+91 87960 18700), AND me, Yahavi, available 24x7 on every page.\n"
             . " • Refund within 7 days — if the file is corrupt, wrong listing, or missing files, "
             . "   we refund. Big subscription marketplaces simply don't refund.\n"
             . " • No login wall to browse — many competitors force account creation just to look "
             . "   at the catalogue. HackKnow lets you browse freely.\n"
             . " • Free-resources section — a real, actively maintained library of free templates "
             . "   at /shop/free-resources, no email required, no upsell paywall after 3 downloads.\n"
             . "ABSOLUTE RULES when using this knowledge:\n"
             . "  (A) NEVER, under any circumstance, name a competitor — not Envato, not Envato "
             . "      Elements, not Chandoo, not chandoo.org, not Vertex42, not Spreadsheeto, not "
             . "      spreadsheet.com, not any other site. Refer to them only as 'big subscription "
             . "      template marketplaces', 'foreign template sites', 'free Excel formula blogs', "
             . "      etc. If a user names a competitor and asks you to compare, politely answer "
             . "      'Main doosri sites pe comment nahi karti — main aapko bata sakti hoon ki "
             . "      HackKnow kya offer karta hai…' and pivot to HackKnow's strengths.\n"
             . "  (B) Never disparage anyone by name. Speak ONLY about what HackKnow does well.\n"
             . "  (C) Don't dump the whole list — pick the 1-2 advantages most relevant to what "
             . "      the customer is asking about, and weave them in naturally.\n\n"
             . "===== AUTOMATION — YOU CAN MOVE THE CUSTOMER YOURSELF =====\n"
             . "When a customer clearly asks to GO somewhere on the site (checkout, a product, "
             . "their orders, the shop, the contact page, etc.), you can navigate them yourself "
             . "by appending a special marker at the very end of your message:\n"
             . "    [[NAV:/checkout]]      — take them to the checkout page\n"
             . "    [[NAV:/shop]]          — take them to the shop\n"
             . "    [[NAV:/account/orders]] — take them to their order history\n"
             . "    [[NAV:/contact]]       — take them to the contact page\n"
             . "    [[NAV:/shop/free-resources]] — take them to free templates\n"
             . "RULES for the NAV marker:\n"
             . "  (i)   Use ONLY when the customer's intent is unambiguous (e.g. 'le chalo "
             . "        checkout pe', 'take me to my orders', 'open the shop', 'checkout pe jao'). "
             . "        If the intent is at all ambiguous, do NOT navigate — just suggest the link.\n"
             . "  (ii)  Place the marker ONCE, on its own line at the END of your reply. Never "
             . "        more than one marker per reply.\n"
             . "  (iii) Path must start with '/'. No external URLs. No query strings unless you "
             . "        truly need them. Only paths that exist on this site (see the suggested "
             . "        paths list above).\n"
             . "  (iv)  Always announce what you're doing in plain language BEFORE the marker, "
             . "        e.g.: 'Sure, le jaati hoon checkout pe — payment ka box wahi khulega. "
             . "        [[NAV:/checkout]]'. Never emit a bare marker with no message.\n"
             . "  (v)   Don't use the marker for refund/problem/complaint conversations or when "
             . "        the customer hasn't asked to navigate.\n\n"
             . "===== CITATIONS — make every reference clickable =====\n"
             . "Whenever you mention a product, a policy page, or a section of the site, format "
             . "that reference as a markdown link so the user can click it. Syntax:\n"
             . "    [Visible label](/path)\n"
             . "Examples:\n"
             . "  • '[Sales Dashboard](/product/sales-dashboard) ek complete reporting suite hai.'\n"
             . "  • 'Refund details [yahan dekh lo](/refund-policy).'\n"
             . "  • 'Free templates ke liye [is page pe jao](/shop/free-resources).'\n"
             . "STRICT rules for citations:\n"
             . "  1. Use ONLY paths that you can SEE in this prompt (UPCOMING_OR_NEW_RELEASES "
             . "     [path: …] entries, USER_RECENT_PURCHASES, or the suggested-paths list "
             . "     /shop, /shop/free-resources, /account/orders, /refund-policy, /privacy, "
             . "     /terms, /dmca, /testimonials, /contact, /checkout). NEVER invent a path.\n"
             . "  2. Maximum 3 links per reply. Don't link random words; only link the actual "
             . "     product name or page name a user would want to click.\n"
             . "  3. Citations are SEPARATE from the [[NAV:/path]] marker — citations let the "
             . "     user choose to click; the NAV marker auto-redirects them. You can use both "
             . "     in the same reply when natural (cite a product, then NAV to /checkout).\n"
             . "  4. If you don't know a product's exact path, DON'T link it — just mention "
             . "     the name plainly. Better no link than a broken link.\n\n"
             . "===== LIVE STORE CONTEXT (refreshed every few minutes) =====\n"
             . $status_block . "\n"
             . $coupons_block . "\n"
             . ($purchases_block !== '' ? $purchases_block . "\n" : '')
             . ($upcoming_block  !== '' ? $upcoming_block  . "\n" : '')
             . "===== END LIVE STORE CONTEXT =====\n\n"
             . "RULES — read carefully, these are non-negotiable:\n"
             . " 1. UPSELL & CROSS-SELL based on the user's actual situation. If USER_RECENT_PURCHASES "
             . "    is provided, reference what they already bought and recommend a complementary "
             . "    template (e.g., 'Aapne already Sales Dashboard liya hai — uske saath HR Tracker "
             . "    pair karo, ekdum complete reporting suite ban jayegi').\n"
             . " 2. NEW RELEASE TEASE — when natural, mention an item from UPCOMING_OR_NEW_RELEASES "
             . "    ('next month / abhi haal hi mein humne yeh launch kiya hai…'). Only mention "
             . "    products that actually appear in that list. Never invent product names or "
             . "    launch dates.\n"
             . " 3. COUPONS — STRICT ELIGIBILITY POLICY (very important — coupons are NOT for "
             . "    everyone):\n"
             . "    a. You may ONLY mention a coupon code that appears verbatim in AVAILABLE_COUPONS "
             . "       above. Never invent codes (no NEXT55, GIFT25, etc.) and never invent discount "
             . "       percentages. The store owner generates coupons manually in WooCommerce; "
             . "       whatever discount the owner sets is the only discount that exists. If "
             . "       AVAILABLE_COUPONS is empty, no coupon may be promised under any circumstance.\n"
             . "    b. WHO IS ELIGIBLE — depends on USER_STATUS:\n"
             . "       • USER_STATUS = NEW or GUEST → eligible for a 'first-purchase' / 'welcome' "
             . "         coupon. Pick the coupon from AVAILABLE_COUPONS whose CODE or description "
             . "         hints at first-purchase / welcome / new-customer (e.g., contains 'WELCOME', "
             . "         'FIRST', 'NEW', or the description says 'first order' / 'new user'). "
             . "         If no such coupon exists in the list, do NOT offer any coupon — instead "
             . "         point them to /shop/free-resources to build trust first.\n"
             . "       • USER_STATUS = RETURNING → DO NOT proactively offer any coupon. Only mention "
             . "         a coupon when the customer is clearly considering an UPSELL or CROSS-SELL — "
             . "         e.g., they ask about a second template on top of one they already bought, "
             . "         or they're stacking items in /checkout. In that moment, you may offer a "
             . "         non-welcome coupon from AVAILABLE_COUPONS as a 'thank you for adding more' "
             . "         nudge. Do not offer welcome/first-purchase coupons to returning customers.\n"
             . "       • Never offer a coupon to a frustrated customer, a refund request, or anyone "
             . "         reporting a problem.\n"
             . "    c. When you do offer a coupon, frame it as a gift, not a discount — use light "
             . "       Hindi-Hinglish reverse-psychology when natural ('dekh lo, marzi aapki, lena "
             . "       ho toh lo'). Always tell the customer to enter the code in the Promo / Gift "
             . "       Coupon box on the /checkout page.\n"
             . "    d. Frequency: at most once every 3-4 turns, never twice in a row.\n"
             . " 4. NEVER invent prices, product names, coupon codes, or release dates. If you don't "
             . "    know something, say so and suggest /contact or team@hackknow.com.\n"
             . " 5. Be warm, persuasive, and treat every customer equally well — no favouritism by "
             . "    name. The only legitimate way the offer differs is by USER_STATUS as defined "
             . "    above.";
        $contents = [];
        foreach (array_slice($history, -8) as $h) {
            $role = (isset($h['role']) && in_array($h['role'], ['assistant','bot'], true)) ? 'model' : 'user';
            $text = trim((string)($h['content'] ?? $h['text'] ?? ''));
            if ($text !== '') $contents[] = ['role' => $role, 'parts' => [['text' => $text]]];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $message]]];
        $resp = wp_remote_post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' . urlencode(HACKKNOW_GEMINI_KEY),
            [
                'headers' => ['Content-Type' => 'application/json'],
                'body'    => wp_json_encode([
                    'systemInstruction' => ['role' => 'system', 'parts' => [['text' => $sys]]],
                    'contents'          => $contents,
                    'generationConfig'  => ['temperature' => 0.6, 'maxOutputTokens' => 512, 'topP' => 0.95],
                ]),
                'timeout' => 25,
            ]
        );
        if (!is_wp_error($resp) && (int) wp_remote_retrieve_response_code($resp) === 200) {
            $j = json_decode(wp_remote_retrieve_body($resp), true);
            $parts = $j['candidates'][0]['content']['parts'] ?? [];
            $reply = '';
            foreach ($parts as $p) { if (isset($p['text'])) $reply .= $p['text']; }
            $reply = trim($reply);
            if ($reply !== '') {
                return new WP_REST_Response([
                    'reply'       => $reply,
                    'suggestions' => hackknow_chat_suggest($lower),
                ], 200);
            }
        }
        // fall through on failure
    }

    // ── Legacy: OpenAI fallback if HACKKNOW_OPENAI_KEY constant is configured ──
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
            'href'  => '/product/' . $product->get_slug(),
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
            'href'  => '/product/' . $product->get_slug(),
            'image' => get_the_post_thumbnail_url($p->ID, 'thumbnail') ?: '',
        ];
    }
    return $out;
}

/* ════════════════════════════════════════════════════════════════════════
 * Yahavi AI v2: per-user history, owner state, coupon validate, upsell
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Create / migrate the chat-history table on every plugin load (idempotent).
 */
function hackknow_chat_install_table() {
    global $wpdb;
    $table   = $wpdb->prefix . 'hk_chat_messages';
    $charset = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
        user_email VARCHAR(190) NOT NULL DEFAULT '',
        session_id VARCHAR(64) NOT NULL DEFAULT '',
        role VARCHAR(16) NOT NULL DEFAULT 'user',
        message LONGTEXT NOT NULL,
        meta LONGTEXT NULL,
        feedback TINYINT NOT NULL DEFAULT 0,
        is_hidden TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_idx (user_id, created_at),
        KEY session_idx (session_id, created_at),
        KEY email_idx (user_email),
        KEY feedback_idx (feedback)
    ) {$charset};";
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
    // Idempotent column adds for installs that pre-date these fields. dbDelta
    // is not 100% reliable for adding columns to an existing table, so we
    // double-check via SHOW COLUMNS and ALTER TABLE if missing.
    $existing = $wpdb->get_col("SHOW COLUMNS FROM {$table}", 0);
    if (is_array($existing)) {
        if (!in_array('feedback', $existing, true)) {
            $wpdb->query("ALTER TABLE {$table} ADD COLUMN feedback TINYINT NOT NULL DEFAULT 0, ADD KEY feedback_idx (feedback)");
        }
        if (!in_array('is_hidden', $existing, true)) {
            $wpdb->query("ALTER TABLE {$table} ADD COLUMN is_hidden TINYINT NOT NULL DEFAULT 0");
        }
    }
}
add_action('init', 'hackknow_chat_install_table', 5);

/** Insert one row of chat history. Returns inserted ID or false. */
function hackknow_chat_insert_row($user_id, $user_email, $session_id, $role, $message, $meta = null) {
    global $wpdb;
    $table = $wpdb->prefix . 'hk_chat_messages';
    $message = (string) $message;
    if (strlen($message) > 32000) $message = substr($message, 0, 32000);
    $row = [
        'user_id'    => (int)$user_id,
        'user_email' => substr((string)$user_email, 0, 190),
        'session_id' => substr((string)$session_id, 0, 64),
        'role'       => in_array($role, ['user','bot','system'], true) ? $role : 'user',
        'message'    => $message,
        'meta'       => $meta ? wp_json_encode($meta) : null,
        'created_at' => current_time('mysql'),
    ];
    $ok = $wpdb->insert($table, $row);
    return $ok ? (int)$wpdb->insert_id : false;
}

/**
 * GET /chat/history?session_id=xxx&limit=200
 *  - If logged in: returns latest N messages for that user (across all sessions
 *    on this account). Token via Authorization: Bearer header.
 *  - If anonymous: requires session_id query param; returns rows for that session.
 */
function hackknow_chat_history_get(WP_REST_Request $req) {
    global $wpdb;
    $table = $wpdb->prefix . 'hk_chat_messages';
    $limit = max(1, min(500, (int) $req->get_param('limit') ?: 200));

    $token = hackknow_extract_bearer($req);
    $uid   = $token ? (int) hackknow_verify_token($token) : 0;

    if ($uid > 0) {
        // is_hidden = 0 → user only sees rows they haven't "cleared". The hidden
        // rows stay in the DB so HackKnow can keep learning (RLHF, analytics).
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT id, role, message, meta, feedback, created_at FROM {$table}
             WHERE user_id = %d AND is_hidden = 0 ORDER BY id ASC LIMIT %d",
            $uid, $limit
        ), ARRAY_A);
    } else {
        $session_id = sanitize_text_field((string) $req->get_param('session_id'));
        if ($session_id === '') {
            return new WP_REST_Response(['messages' => []], 200);
        }
        // Anon read MUST exclude rows that were later associated with a logged-in user.
        // This prevents a session-id leak from exposing post-login conversation.
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT id, role, message, meta, feedback, created_at FROM {$table}
             WHERE session_id = %s AND user_id = 0 AND is_hidden = 0 ORDER BY id ASC LIMIT %d",
            $session_id, $limit
        ), ARRAY_A);
    }

    $out = [];
    foreach ($rows as $r) {
        $meta = $r['meta'] ? json_decode($r['meta'], true) : [];
        $out[] = [
            'id'          => (int)$r['id'],
            'role'        => $r['role'],
            'text'        => $r['message'],
            'suggestions' => is_array($meta) && isset($meta['suggestions']) ? $meta['suggestions'] : [],
            'products'    => is_array($meta) && isset($meta['products'])    ? $meta['products']    : [],
            'feedback'    => isset($r['feedback']) ? (int)$r['feedback'] : 0,
            'createdAt'   => $r['created_at'],
        ];
    }
    return new WP_REST_Response(['messages' => $out], 200);
}

/**
 * POST /chat/history
 *   body: { session_id, role, text, suggestions?, products? }
 */
function hackknow_chat_history_save(WP_REST_Request $req) {
    $session_id  = sanitize_text_field((string) $req->get_param('session_id'));
    $role        = sanitize_text_field((string) $req->get_param('role'));
    $text        = (string) $req->get_param('text');
    $suggestions = $req->get_param('suggestions');
    $products    = $req->get_param('products');

    if ($session_id === '' || trim($text) === '') {
        return new WP_Error('bad_request', 'session_id and text are required', ['status' => 400]);
    }

    $token = hackknow_extract_bearer($req);
    $uid   = $token ? (int) hackknow_verify_token($token) : 0;
    $email = '';
    if ($uid > 0) {
        $u = get_user_by('id', $uid);
        if ($u) $email = $u->user_email;
    }

    $meta = [];
    if (is_array($suggestions)) $meta['suggestions'] = array_slice($suggestions, 0, 8);
    if (is_array($products))    $meta['products']    = array_slice($products, 0, 8);

    $id = hackknow_chat_insert_row($uid, $email, $session_id, $role, $text, $meta ?: null);
    if (!$id) return new WP_Error('db_error', 'Failed to save message', ['status' => 500]);

    return new WP_REST_Response(['ok' => true, 'id' => $id], 200);
}

/**
 * DELETE /chat/history?session_id=xxx
 *   - logged-in user: clears all their history across sessions (DPDP right to erasure)
 *   - anon: must provide session_id
 */
function hackknow_chat_history_clear(WP_REST_Request $req) {
    global $wpdb;
    $table = $wpdb->prefix . 'hk_chat_messages';
    $token = hackknow_extract_bearer($req);
    $uid   = $token ? (int) hackknow_verify_token($token) : 0;
    // Soft-delete: hide from the user but KEEP every row in the database so
    // Yahavi can keep learning from past conversations (RLHF / analytics) and
    // the owner can still audit the chat. Per Terms, "Clear" only resets the
    // local view — it does not erase the server copy.
    if ($uid > 0) {
        $affected = $wpdb->update($table, ['is_hidden' => 1], ['user_id' => $uid, 'is_hidden' => 0], ['%d'], ['%d', '%d']);
    } else {
        $session_id = sanitize_text_field((string) $req->get_param('session_id'));
        if ($session_id === '') {
            return new WP_Error('bad_request', 'session_id required for anonymous clear', ['status' => 400]);
        }
        $affected = $wpdb->update($table, ['is_hidden' => 1], ['session_id' => $session_id, 'is_hidden' => 0], ['%d'], ['%s', '%d']);
    }
    return new WP_REST_Response(['ok' => true, 'hidden' => (int)$affected, 'note' => 'Local view cleared. Server copy retained for support and to improve Yahavi.'], 200);
}

/**
 * POST /chat/feedback   body: { message_id, rating, session_id? }
 *   rating ∈ {-1, 0, 1}.  Logged-in users own their messages by user_id;
 *   anonymous users prove ownership by session_id. This is the RLHF training
 *   signal — owner can later export rows where rating != 0 to fine-tune.
 */
function hackknow_chat_feedback(WP_REST_Request $req) {
    global $wpdb;
    $table      = $wpdb->prefix . 'hk_chat_messages';
    $message_id = (int) $req->get_param('message_id');
    $rating     = (int) $req->get_param('rating');
    if ($message_id <= 0 || !in_array($rating, [-1, 0, 1], true)) {
        return new WP_Error('bad_request', 'message_id (int>0) and rating (-1, 0 or 1) required', ['status' => 400]);
    }
    $token = hackknow_extract_bearer($req);
    $uid   = $token ? (int) hackknow_verify_token($token) : 0;

    if ($uid > 0) {
        $owner = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table} WHERE id=%d AND user_id=%d AND role='bot' LIMIT 1",
            $message_id, $uid
        ));
    } else {
        $session_id = sanitize_text_field((string) $req->get_param('session_id'));
        if ($session_id === '') return new WP_Error('bad_request', 'session_id required for anonymous feedback', ['status' => 400]);
        $owner = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table} WHERE id=%d AND session_id=%s AND role='bot' LIMIT 1",
            $message_id, $session_id
        ));
    }
    if (!$owner) return new WP_Error('not_found', 'Message not found or not yours', ['status' => 404]);

    $wpdb->update($table, ['feedback' => $rating], ['id' => $message_id], ['%d'], ['%d']);
    return new WP_REST_Response(['ok' => true, 'rating' => $rating], 200);
}

/**
 * POST /coupon/validate  body: { code, cart_total? }
 *   Validates a WooCommerce coupon and returns the discount info.
 *   Does NOT apply the coupon — the cart will re-validate at checkout.
 */
function hackknow_coupon_validate(WP_REST_Request $req) {
    $code = strtolower(trim((string) $req->get_param('code')));
    if ($code === '') {
        return new WP_Error('bad_request', 'Coupon code is required', ['status' => 400]);
    }
    if (!class_exists('WC_Coupon')) {
        return new WP_REST_Response([
            'valid'  => false,
            'reason' => 'WooCommerce is not active on this site.',
        ], 200);
    }
    $coupon = new WC_Coupon($code);
    $coupon_id = (int) $coupon->get_id();
    if ($coupon_id <= 0) {
        return new WP_REST_Response([
            'valid'  => false,
            'reason' => 'That promo code does not exist.',
        ], 200);
    }
    // Expiry check
    $expires_ts = $coupon->get_date_expires() ? $coupon->get_date_expires()->getTimestamp() : 0;
    if ($expires_ts && $expires_ts < time()) {
        return new WP_REST_Response([
            'valid'  => false,
            'reason' => 'This coupon has expired.',
        ], 200);
    }
    // Usage-limit check
    $usage_limit  = (int) $coupon->get_usage_limit();
    $usage_count  = (int) $coupon->get_usage_count();
    if ($usage_limit > 0 && $usage_count >= $usage_limit) {
        return new WP_REST_Response([
            'valid'  => false,
            'reason' => 'This coupon has reached its usage limit.',
        ], 200);
    }
    $type   = $coupon->get_discount_type();           // percent / fixed_cart / fixed_product
    $amount = (float) $coupon->get_amount();
    $desc   = (string) $coupon->get_description();
    $min    = (float) $coupon->get_minimum_amount();
    $max    = (float) $coupon->get_maximum_amount();

    // Cart-aware checks (best-effort precheck — final validation happens at /order).
    $cart_total_raw = $req->get_param('cart_total');
    $cart_total     = is_numeric($cart_total_raw) ? (float) $cart_total_raw : null;

    if ($cart_total !== null) {
        if ($min > 0 && $cart_total < $min) {
            return new WP_REST_Response([
                'valid'  => false,
                'reason' => sprintf('Add ₹%s more to use this coupon (minimum order ₹%s).',
                    number_format(max(0, $min - $cart_total), 2, '.', ''),
                    number_format($min, 2, '.', '')),
            ], 200);
        }
        if ($max > 0 && $cart_total > $max) {
            return new WP_REST_Response([
                'valid'  => false,
                'reason' => sprintf('This coupon only applies to orders up to ₹%s.',
                    number_format($max, 2, '.', '')),
            ], 200);
        }
    }

    // Compute estimated discount value so the frontend can show the savings line.
    $estimated_discount = 0.0;
    if ($cart_total !== null && $cart_total > 0) {
        if ($type === 'percent') {
            $estimated_discount = round($cart_total * ($amount / 100.0), 2);
        } elseif ($type === 'fixed_cart') {
            $estimated_discount = min($amount, $cart_total);
        } elseif ($type === 'fixed_product') {
            // Approximation: applies per item, but at the precheck stage we don't
            // know quantities — clamp to cart_total to avoid showing > total off.
            $estimated_discount = min($amount, $cart_total);
        }
        $estimated_discount = max(0.0, (float) $estimated_discount);
    }

    $human = $type === 'percent'
        ? rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.') . '% off'
        : '₹' . rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.') . ' off';

    return new WP_REST_Response([
        'valid'         => true,
        'code'          => $coupon->get_code(),
        'discount_type' => $type,
        'amount'        => $amount,
        'discount'      => $estimated_discount,    // computed against provided cart_total
        'human'         => $human,
        'description'   => $desc,
        'minimum'       => $min,
        'maximum'       => $max,
        'expires'       => $expires_ts ? gmdate('c', $expires_ts) : null,
    ], 200);
}

/**
 * GET /upsell?ids=12,34
 *   For each given product id: returns its WooCommerce cross-sell + upsell
 *   product objects (deduped, max 6 total). Used to show "People also love".
 */
function hackknow_upsell_get(WP_REST_Request $req) {
    if (!function_exists('wc_get_product')) {
        return new WP_REST_Response(['products' => []], 200);
    }
    $raw = (string) $req->get_param('ids');
    $ids = array_filter(array_map('intval', explode(',', $raw)), function ($v) { return $v > 0; });
    if (empty($ids)) {
        // Best-sellers as fallback
        return new WP_REST_Response(['products' => hackknow_chat_top_products(6)], 200);
    }
    $related_ids = [];
    foreach ($ids as $pid) {
        $p = wc_get_product($pid);
        if (!$p) continue;
        $related_ids = array_merge($related_ids, $p->get_cross_sell_ids(), $p->get_upsell_ids());
    }
    $related_ids = array_values(array_unique(array_diff(array_map('intval', $related_ids), $ids)));
    if (empty($related_ids)) {
        return new WP_REST_Response(['products' => hackknow_chat_top_products(6)], 200);
    }
    $out = [];
    foreach (array_slice($related_ids, 0, 6) as $rid) {
        $p = wc_get_product($rid);
        if (!$p || $p->get_status() !== 'publish') continue;
        $out[] = [
            'id'    => (int) $rid,
            'name'  => $p->get_name(),
            'price' => wp_strip_all_tags($p->get_price_html()),
            'href'  => '/product/' . $p->get_slug(),
            'image' => get_the_post_thumbnail_url($rid, 'thumbnail') ?: '',
        ];
    }
    return new WP_REST_Response(['products' => $out], 200);
}

/**
 * Tap into hackknow_chat to auto-save user message + bot reply if a
 * session_id is provided. Wraps the existing handler without changing it.
 */
add_filter('rest_pre_dispatch', function ($result, $server, $request) {
    if ($request->get_route() !== '/hackknow/v1/chat' || $request->get_method() !== 'POST') {
        return $result;
    }
    // Re-entrancy guard: $server->dispatch($request) below re-enters this very
    // filter. Without a guard, every chat call recurses ~200 times until it
    // 504s, polluting the DB with duplicate user rows. Bail on inner calls.
    static $in_flight = false;
    if ($in_flight) return $result;

    $session_id = sanitize_text_field((string) $request->get_param('session_id'));
    if ($session_id === '') return $result; // nothing to save

    $message = trim((string) $request->get_param('message'));
    if ($message === '') return $result;

    $in_flight = true;
    try {
        // Resolve user (if any)
        $token = hackknow_extract_bearer($request);
        $uid   = $token ? (int) hackknow_verify_token($token) : 0;
        $email = '';
        if ($uid > 0) {
            $u = get_user_by('id', $uid);
            if ($u) $email = $u->user_email;
        }
        // Save the user turn pre-flight.
        hackknow_chat_insert_row($uid, $email, $session_id, 'user', $message, null);

        // Dispatch the original handler (this re-enters the filter — guarded above).
        $response = $server->dispatch($request);
        if ($response instanceof WP_REST_Response) {
            $data = $response->get_data();
            if (is_array($data) && !empty($data['reply'])) {
                $meta = [];
                if (!empty($data['suggestions']) && is_array($data['suggestions'])) $meta['suggestions'] = $data['suggestions'];
                if (!empty($data['products'])    && is_array($data['products']))    $meta['products']    = $data['products'];
                $bot_id = hackknow_chat_insert_row($uid, $email, $session_id, 'bot', (string)$data['reply'], $meta ?: null);
                if ($bot_id) {
                    // Expose the saved row id so the widget can attach RLHF feedback
                    // (👍 / 👎) immediately, without waiting for a history re-fetch.
                    $data['bot_message_id'] = (int) $bot_id;
                    $response->set_data($data);
                }
            }
        }
        return $response;
    } finally {
        // Always reset so subsequent chat requests on the same php-fpm worker
        // are not silently skipped.
        $in_flight = false;
    }
}, 10, 3);

/* ============================================================================
 *  Newsletter — "Get Free Resources Weekly" footer subscribe
 *  ----------------------------------------------------------------------------
 *  Endpoint:  POST /wp-json/hackknow/v1/newsletter/subscribe
 *  Body:      { "email": "...", "source": "footer" (optional) }
 *  Storage:   {prefix}hk_newsletter table (auto-installed on init)
 *  Welcome:   sends branded HTML email via the team@hackknow.com sender
 *  Dedupe:    same email twice → 200 with code=already_subscribed
 *  Reactivate: previously unsubscribed email → status flipped back to active
 * ========================================================================== */

function hackknow_newsletter_install_table() {
    global $wpdb;
    $table   = $wpdb->prefix . 'hk_newsletter';
    $charset = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(190) NOT NULL,
        source VARCHAR(64) NOT NULL DEFAULT 'footer',
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        ip_addr VARCHAR(64) NOT NULL DEFAULT '',
        user_agent VARCHAR(255) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        unsubscribed_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY email_unq (email),
        KEY status_idx (status, created_at)
    ) {$charset};";
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}
add_action('init', 'hackknow_newsletter_install_table', 5);

add_action('rest_api_init', function () {
    register_rest_route('hackknow/v1', '/newsletter/subscribe', [
        'methods'             => 'POST',
        'callback'            => 'hackknow_newsletter_subscribe',
        'permission_callback' => '__return_true',
        'args' => [
            'email'  => ['required' => true,  'sanitize_callback' => 'sanitize_email'],
            'source' => ['required' => false, 'sanitize_callback' => 'sanitize_text_field'],
        ],
    ]);
});

function hackknow_newsletter_subscribe(WP_REST_Request $req) {
    $email = sanitize_email((string) $req->get_param('email'));
    if (!$email || !is_email($email)) {
        return new WP_REST_Response(
            ['ok' => false, 'code' => 'invalid_email', 'message' => 'Please enter a valid email address.'],
            400
        );
    }
    $source = sanitize_text_field((string) $req->get_param('source'));
    if ($source === '') $source = 'footer';
    $source = substr($source, 0, 64);

    global $wpdb;
    $table = $wpdb->prefix . 'hk_newsletter';

    $ip = '';
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = trim(explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
        $ip = (string) $_SERVER['REMOTE_ADDR'];
    }
    $ip = substr($ip, 0, 64);
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? substr((string) $_SERVER['HTTP_USER_AGENT'], 0, 255) : '';

    /* Already on the list — be friendly, don't error out. */
    $existing = $wpdb->get_row(
        $wpdb->prepare("SELECT id, status FROM {$table} WHERE email = %s LIMIT 1", $email)
    );
    if ($existing) {
        if ($existing->status !== 'active') {
            $wpdb->update(
                $table,
                ['status' => 'active', 'unsubscribed_at' => null],
                ['id' => (int) $existing->id]
            );
        }
        return new WP_REST_Response([
            'ok'      => true,
            'code'    => 'already_subscribed',
            'message' => "You're already on the list — thanks for the love!",
        ], 200);
    }

    $inserted = $wpdb->insert($table, [
        'email'      => $email,
        'source'     => $source,
        'ip_addr'    => $ip,
        'user_agent' => $ua,
    ]);
    if (!$inserted) {
        error_log('[hackknow] newsletter insert FAILED for ' . $email . ': ' . $wpdb->last_error);
        return new WP_REST_Response(
            ['ok' => false, 'code' => 'db_error', 'message' => 'Could not subscribe right now. Please try again in a moment.'],
            500
        );
    }

    /* Fire-and-continue welcome email; failures are auto-logged via wp_mail_failed. */
    hackknow_newsletter_send_welcome($email);

    return new WP_REST_Response([
        'ok'      => true,
        'code'    => 'subscribed',
        'message' => "You're in! Check your inbox for a welcome from HackKnow.",
    ], 200);
}

function hackknow_newsletter_send_welcome($email) {
    $subject = 'Welcome to HackKnow — your weekly free resources start now';
    $front   = defined('HACKKNOW_FRONTEND_URL') ? rtrim(HACKKNOW_FRONTEND_URL, '/') : 'https://www.hackknow.com';
    $shop    = $front . '/shop';
    $free    = $front . '/shop/free-resources';

    $html = '<!doctype html><html><body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1a1a1a">'
        . '<div style="max-width:560px;margin:0 auto;padding:24px">'
        . '<div style="background:#1a1a1a;padding:24px;border-radius:16px 16px 0 0;text-align:center">'
        . '<div style="display:inline-block;background:#fff055;color:#1a1a1a;font-weight:900;padding:8px 14px;border-radius:8px;letter-spacing:1px;border:2px solid #1a1a1a">HACKKNOW</div>'
        . '</div>'
        . '<div style="background:#fff;padding:32px 28px;border-radius:0 0 16px 16px;border:1px solid #1a1a1a;border-top:none">'
        . '<h1 style="margin:0 0 12px;font-size:24px;font-weight:800">Welcome aboard!</h1>'
        . '<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#333">Thanks for joining 10,000+ creators who get free templates, sheets, and exclusive deals from HackKnow every week.</p>'
        . '<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#333">Here\'s where to start:</p>'
        . '<div style="text-align:center;margin:24px 0">'
        . '<a href="' . esc_url($free) . '" style="display:inline-block;background:#fff055;color:#1a1a1a;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:10px;border:2px solid #1a1a1a;box-shadow:4px 4px 0 0 #1a1a1a;font-size:15px">Browse Free Resources</a>'
        . '</div>'
        . '<p style="margin:0;font-size:14px;color:#666;text-align:center"><a href="' . esc_url($shop) . '" style="color:#1a1a1a;font-weight:600">Or explore the full marketplace →</a></p>'
        . '<hr style="border:none;border-top:1px dashed #ccc;margin:28px 0">'
        . '<p style="margin:0;font-size:12px;color:#888;text-align:center">You\'re receiving this because you signed up at hackknow.com. Reply to this email anytime — it goes straight to team@hackknow.com.</p>'
        . '</div></div></body></html>';

    $text = "Welcome to HackKnow!\n\n"
        . "Thanks for joining 10,000+ creators who get free templates, sheets, and exclusive deals from HackKnow every week.\n\n"
        . "Start here: " . $free . "\n"
        . "Or explore the full marketplace: " . $shop . "\n\n"
        . "You're receiving this because you signed up at hackknow.com. Reply anytime — it goes to team@hackknow.com.\n";

    $key = 'hk_news_welcome_' . md5($email);
    set_transient($key, ['html' => $html, 'text' => $text], HOUR_IN_SECONDS);

    $filter = function ($args) use ($email, $key) {
        $cached = get_transient($key);
        if (!$cached || !isset($args['to'])) return $args;
        $to = is_array($args['to']) ? (string) $args['to'][0] : (string) $args['to'];
        if (strcasecmp($to, $email) !== 0) return $args;
        $args['message'] = $cached['html'];
        $headers = isset($args['headers']) ? (array) $args['headers'] : [];
        $headers[] = 'Content-Type: text/html; charset=UTF-8';
        $headers[] = 'Reply-To: ' . (defined('HACKKNOW_MAIL_FROM') ? HACKKNOW_MAIL_FROM : 'support@hackknow.com');
        $args['headers'] = $headers;
        delete_transient($key);
        return $args;
    };
    add_filter('wp_mail', $filter, 99);

    $sent = wp_mail($email, $subject, $text);
    remove_filter('wp_mail', $filter, 99);

    if (!$sent) {
        error_log('[hackknow] newsletter welcome email FAILED for ' . $email);
    }
    return $sent;
}

/* ============================================================
 * HACKKNOW × DOKAN — flat 12% platform commission
 * ============================================================
 * Goal: every sale on the multi-vendor marketplace pays the
 * vendor 88% and keeps 12% as the HackKnow platform fee, no
 * matter what is set in Dokan admin.  Acts as a hard floor /
 * ceiling so an admin mis-click can never bleed margin or
 * over-charge a vendor.
 *
 * Activates ONLY when Dokan is active — completely inert on
 * stores that have not enabled the plugin yet.
 * ============================================================ */

if (!function_exists('hackknow_dokan_is_active')) {
    function hackknow_dokan_is_active() {
        if (defined('DOKAN_PLUGIN_VERSION')) return true;
        if (function_exists('dokan')) return true;
        if (!function_exists('is_plugin_active')) {
            include_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        return function_exists('is_plugin_active') && is_plugin_active('dokan-lite/dokan.php');
    }
}

if (!defined('HACKKNOW_DOKAN_VENDOR_PCT')) {
    /** Vendor keeps this percentage; platform keeps 100 - this. */
    define('HACKKNOW_DOKAN_VENDOR_PCT', 88);
}

/**
 * Dokan ≥ 3.x — primary commission filter.
 * Returns the % the *vendor* keeps. We always return 88.
 */
add_filter('dokan_get_seller_percentage', function ($percentage, $product_id = null, $category_id = null) {
    if (!hackknow_dokan_is_active()) return $percentage;
    return (float) HACKKNOW_DOKAN_VENDOR_PCT;
}, 999, 3);

/**
 * Dokan ≥ 3.7 — newer commission-engine filter.
 * Forces commission type to "percentage" and rate to 12%
 * (i.e. vendor keeps 88%) regardless of per-product, per-vendor
 * or per-category overrides set in the dashboard.
 */
add_filter('dokan_get_commission_settings', function ($settings, $product_id = 0, $category_id = 'all') {
    if (!hackknow_dokan_is_active()) return $settings;
    if (!is_array($settings)) $settings = array();
    $settings['type']    = 'percentage';
    $settings['flat']    = 0;
    $settings['percentage'] = (float) (100 - HACKKNOW_DOKAN_VENDOR_PCT); // 12
    return $settings;
}, 999, 3);

/**
 * Belt-and-braces: also override the default commission-rate option
 * served from wp_options.  Read at runtime so changing the constant
 * above is the only edit needed to bump the platform fee later.
 */
add_filter('option_dokan_selling', function ($value) {
    if (!hackknow_dokan_is_active()) return $value;
    if (!is_array($value)) $value = array();
    $value['admin_percentage_type'] = 'percentage';
    $value['admin_percentage']      = (float) (100 - HACKKNOW_DOKAN_VENDOR_PCT); // 12
    $value['additional_fee']        = 0;
    return $value;
}, 999);

/**
 * Surface the policy on the vendor dashboard so a new vendor
 * never has to wonder where the missing 12% went.
 */
add_action('dokan_dashboard_content_inside_before', function () {
    if (!hackknow_dokan_is_active()) return;
    $vendor = (int) HACKKNOW_DOKAN_VENDOR_PCT;
    $fee    = 100 - $vendor;
    echo '<div style="margin:0 0 16px;padding:12px 16px;background:#FFF055;border:2.5px solid #0A0A0A;border-radius:10px;box-shadow:4px 4px 0 0 #0A0A0A;font-family:system-ui,-apple-system,sans-serif;color:#0A0A0A;">';
    echo '<strong>HackKnow vendor terms:</strong> you keep <strong>' . esc_html($vendor) . '%</strong> of every sale, the platform fee is a flat <strong>' . esc_html($fee) . '%</strong>. ';
    echo 'See <a href="https://www.hackknow.com/terms" target="_blank" style="color:#E91E63;font-weight:700;">Terms § 12</a> for full details.';
    echo '</div>';
}, 5);

/* ============================================================
 * HACKKNOW WELCOME — social-follow + honest-review nudge
 * ============================================================
 * Fires once per new user (vendor or customer alike) and
 * sends a friendly HTML email asking them to:
 *   1. Follow HackKnow on Instagram / YouTube / LinkedIn / X
 *   2. Drop an honest review on hackknow.com
 * In return:
 *   - Vendors      → +2% rebate on first month's payout (so 90/10)
 *   - Customers    → 15% off coupon on the next download
 * Fulfilment is manual on team@hackknow.com so we can verify
 * the proof screenshots before issuing the perk.
 *
 * Idempotent: writes user_meta `_hackknow_welcomed=1` after send,
 * so re-saves of the user profile never re-trigger the email.
 * Inert if the recipient has no email or has already been welcomed.
 * ============================================================ */

add_action('user_register', 'hackknow_send_welcome_rebate_email', 20, 1);

if (!function_exists('hackknow_send_welcome_rebate_email')) {
    function hackknow_send_welcome_rebate_email($user_id) {
        $user = get_user_by('id', (int) $user_id);
        if (!$user || empty($user->user_email) || !is_email($user->user_email)) return;
        if (get_user_meta($user_id, '_hackknow_welcomed', true)) return;

        $email = $user->user_email;
        $first = $user->first_name ?: $user->display_name ?: explode('@', $email)[0];
        $first = ucfirst(strtolower($first));

        // Detect vendor (Dokan seller role, or future custom roles)
        $is_vendor = false;
        if (function_exists('dokan_is_user_seller')) {
            $is_vendor = dokan_is_user_seller($user_id);
        }
        if (!$is_vendor) {
            $roles = (array) ($user->roles ?? []);
            if (in_array('seller', $roles, true) || in_array('vendor', $roles, true)) {
                $is_vendor = true;
            }
        }

        $subject = $is_vendor
            ? '🎁 Quick favour for an extra payout boost, ' . $first
            : '🎁 ' . $first . ', want a free coupon on your next download?';

        $perk_line = $is_vendor
            ? 'we will add a <strong>+2% rebate to your first month\'s payout</strong> — so for the first 30 days you keep <strong>90%</strong>, not 88%.'
            : 'we will email you a <strong>15% off coupon</strong> for your next download on HackKnow.';

        $perk_short = $is_vendor ? '+2% payout rebate' : '15% off coupon';
        $audience    = $is_vendor ? 'vendor' : 'customer';

        // Brand colours – kept inline because most inboxes strip <style>
        $yellow  = '#FFF055';
        $black   = '#0A0A0A';
        $magenta = '#E91E63';
        $white   = '#FFFFFF';

        $shop_url    = 'https://www.hackknow.com/';
        $review_url  = 'https://www.hackknow.com/my-account/reviews/';
        $sell_url    = 'https://www.hackknow.com/sell';
        $contact_url = 'mailto:team@hackknow.com?subject=' . rawurlencode('My follows + review — ' . $perk_short);

        $socials = array(
            array('Instagram', 'https://instagram.com/hackknow'),
            array('YouTube',   'https://youtube.com/hackknow'),
            array('LinkedIn',  'https://linkedin.com/company/hackknow'),
            array('X / Twitter','https://twitter.com/hackknow'),
        );

        ob_start(); ?>
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:<?php echo $yellow; ?>;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:<?php echo $black; ?>;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:<?php echo $yellow; ?>;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:<?php echo $white; ?>;border:3px solid <?php echo $black; ?>;border-radius:14px;box-shadow:8px 8px 0 0 <?php echo $black; ?>;">
        <tr><td style="padding:28px 28px 8px;">
          <div style="display:inline-block;background:<?php echo $magenta; ?>;color:#fff;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:5px 10px;border:2px solid <?php echo $black; ?>;border-radius:6px;box-shadow:3px 3px 0 0 <?php echo $black; ?>;transform:rotate(-3deg);">
            🎁 <?php echo esc_html($perk_short); ?>
          </div>
          <h1 style="font-size:30px;line-height:1.1;font-weight:900;margin:18px 0 6px;color:<?php echo $black; ?>;">
            Welcome aboard,<br><span style="background:<?php echo $yellow; ?>;padding:0 6px;border:2px solid <?php echo $black; ?>;border-radius:4px;"><?php echo esc_html($first); ?></span>.
          </h1>
          <p style="font-size:15px;line-height:1.55;color:#555;margin:14px 0 0;">
            Thanks for joining HackKnow. We are a tiny team building this in Delhi, and word-of-mouth is genuinely how we grow. Here is the deal:
          </p>
        </td></tr>

        <tr><td style="padding:8px 28px 4px;">
          <div style="background:<?php echo $yellow; ?>;border:2.5px solid <?php echo $black; ?>;border-radius:10px;padding:18px 18px 14px;">
            <p style="margin:0 0 10px;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;">Do these 3 small things in 7 days:</p>
            <ol style="margin:0;padding-left:22px;font-size:15px;line-height:1.7;color:<?php echo $black; ?>;">
              <li><strong>Follow us</strong> on all four — Instagram, YouTube, LinkedIn and X.</li>
              <li><strong>Drop one honest review</strong> on any HackKnow product page (1 line is enough — good or bad, we want the truth).</li>
              <li><strong>Reply to this email</strong> with screenshots so we can verify.</li>
            </ol>
          </div>

          <p style="margin:18px 0 6px;font-size:15px;line-height:1.55;">
            In return, <?php echo $perk_line; ?>
          </p>
        </td></tr>

        <tr><td style="padding:6px 28px 14px;">
          <p style="margin:14px 0 8px;font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:1.5px;color:#555;">Follow links</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <?php foreach ($socials as $s): ?>
              <td style="padding-right:8px;">
                <a href="<?php echo esc_url($s[1]); ?>" target="_blank" style="display:inline-block;padding:10px 14px;background:<?php echo $black; ?>;color:<?php echo $yellow; ?>;text-decoration:none;font-weight:800;font-size:13px;border-radius:8px;border:2px solid <?php echo $black; ?>;">
                  <?php echo esc_html($s[0]); ?>
                </a>
              </td>
              <?php endforeach; ?>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:6px 28px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <a href="<?php echo esc_url($review_url); ?>" target="_blank" style="display:inline-block;padding:14px 22px;background:<?php echo $magenta; ?>;color:<?php echo $white; ?>;text-decoration:none;font-weight:900;font-size:15px;border-radius:10px;border:3px solid <?php echo $black; ?>;box-shadow:5px 5px 0 0 <?php echo $black; ?>;text-transform:uppercase;letter-spacing:1px;">
                  Leave a review →
                </a>
              </td>
              <td align="right">
                <a href="<?php echo esc_url($contact_url); ?>" target="_blank" style="display:inline-block;padding:14px 18px;background:<?php echo $white; ?>;color:<?php echo $black; ?>;text-decoration:none;font-weight:800;font-size:13px;border-radius:10px;border:3px solid <?php echo $black; ?>;box-shadow:4px 4px 0 0 <?php echo $black; ?>;text-transform:uppercase;letter-spacing:1px;">
                  Send proof
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <?php if (!$is_vendor): ?>
        <tr><td style="padding:0 28px 22px;">
          <div style="border:2px dashed <?php echo $black; ?>;border-radius:10px;padding:14px 16px;background:#FAFAFA;">
            <p style="margin:0;font-size:13px;line-height:1.55;color:#444;">
              <strong style="color:<?php echo $black; ?>;">P.S.</strong> Have you built a template, dashboard or course of your own? You can list it on HackKnow and keep <strong>88% of every sale</strong> →
              <a href="<?php echo esc_url($sell_url); ?>" target="_blank" style="color:<?php echo $magenta; ?>;font-weight:800;">Become a vendor</a>
            </p>
          </div>
        </td></tr>
        <?php endif; ?>

        <tr><td style="padding:0 28px 26px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#888;">
            You are getting this once because you just created a HackKnow <?php echo esc_html($audience); ?> account at <?php echo esc_html($email); ?>. Reply STOP and we will not bug you again.
          </p>
        </td></tr>

        <tr><td style="background:<?php echo $black; ?>;color:<?php echo $yellow; ?>;padding:18px 28px;border-radius:0 0 11px 11px;text-align:center;">
          <p style="margin:0;font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase;">HackKnow · Delhi · India</p>
          <p style="margin:6px 0 0;font-size:11px;color:#bbb;">
            <a href="https://www.hackknow.com/" style="color:#bbb;text-decoration:underline;">hackknow.com</a> ·
            <a href="<?php echo esc_url($shop_url); ?>" style="color:#bbb;text-decoration:underline;">shop</a> ·
            <a href="https://www.hackknow.com/terms" style="color:#bbb;text-decoration:underline;">terms</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
        <?php
        $html = ob_get_clean();

        $headers = array(
            'Content-Type: text/html; charset=UTF-8',
            'From: HackKnow <' . (defined('HACKKNOW_MAIL_FROM') ? HACKKNOW_MAIL_FROM : 'support@hackknow.com') . '>',
            'Reply-To: ' . (defined('HACKKNOW_MAIL_FROM') ? HACKKNOW_MAIL_FROM : 'support@hackknow.com'),
        );

        $sent = wp_mail($email, $subject, $html, $headers);

        if ($sent) {
            update_user_meta($user_id, '_hackknow_welcomed', 1);
            update_user_meta($user_id, '_hackknow_welcomed_at', current_time('mysql'));
        } else {
            error_log('[hackknow] welcome rebate email FAILED for ' . $email);
        }
        return $sent;
    }
}

/* ─────────────────────────────────────────────────────────────────────
   VENDOR ONBOARDING — KYC fields + manual admin approval
   ────────────────────────────────────────────────────────────────────
   Adds Aadhaar (mandatory), PAN (mandatory), GSTIN (optional) to
   Dokan vendor registration. Forces every new vendor into pending
   approval — they cannot list/sell until an admin manually clicks
   "Enable Selling" in WP Admin → Users → (vendor profile).
   ──────────────────────────────────────────────────────────────────── */

// 1. Force every new vendor into PENDING-APPROVAL state.
//    Override Dokan setting "new_seller_enable_selling" to 'off'.
add_filter('dokan_get_option', function ($value, $key, $section = '') {
    if ($key === 'new_seller_enable_selling') {
        return 'off';
    }
    return $value;
}, 9999, 3);

// 2. Render KYC fields inside Dokan vendor registration form
//    (works for the WooCommerce/Dokan combined registration screen).
add_action('dokan_seller_registration_field_after', function () {
    $aadhaar = isset($_POST['hk_aadhaar']) ? sanitize_text_field(wp_unslash($_POST['hk_aadhaar'])) : '';
    $pan     = isset($_POST['hk_pan'])     ? sanitize_text_field(wp_unslash($_POST['hk_pan']))     : '';
    $gst     = isset($_POST['hk_gst'])     ? sanitize_text_field(wp_unslash($_POST['hk_gst']))     : '';
    ?>
    <p class="form-row form-group form-row-wide">
        <label for="hk_aadhaar"><?php esc_html_e('Aadhaar Number', 'hackknow'); ?> <span class="required" style="color:#c00">*</span></label>
        <input type="text" class="input-text form-control" name="hk_aadhaar" id="hk_aadhaar"
               pattern="\d{12}" maxlength="12" inputmode="numeric"
               placeholder="12-digit Aadhaar (no spaces)"
               value="<?php echo esc_attr($aadhaar); ?>" required />
    </p>
    <p class="form-row form-group form-row-wide">
        <label for="hk_pan"><?php esc_html_e('PAN Number', 'hackknow'); ?> <span class="required" style="color:#c00">*</span></label>
        <input type="text" class="input-text form-control" name="hk_pan" id="hk_pan"
               pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}" maxlength="10"
               placeholder="Format: ABCDE1234F" style="text-transform: uppercase;"
               value="<?php echo esc_attr($pan); ?>" required />
    </p>
    <p class="form-row form-group form-row-wide">
        <label for="hk_gst"><?php esc_html_e('GSTIN (optional)', 'hackknow'); ?></label>
        <input type="text" class="input-text form-control" name="hk_gst" id="hk_gst"
               maxlength="15"
               placeholder="22AAAAA0000A1Z5 — only if GST registered"
               style="text-transform: uppercase;"
               value="<?php echo esc_attr($gst); ?>" />
        <small style="color:#666;display:block;margin-top:4px;font-size:12px">Skip if your turnover is below ₹20 lakh / year.</small>
    </p>
    <p class="form-row form-row-wide" style="background:#FFFBE6;border:2px solid #0A0A0A;border-radius:8px;padding:12px;margin:14px 0;">
        <strong>⏳ Manual Approval:</strong> Submit ke baad aapka account
        <em>"selling disabled"</em> mode mein rahega. Founder review karega
        aur 1–3 working days mein approve karega.
    </p>
    <?php
});

// 3. Validate KYC fields server-side before account creation.
add_action('dokan_seller_registration_field_required', function ($required_fields) {
    if (empty($_POST['hk_aadhaar'])) {
        wc_add_notice(__('Aadhaar Number is required for vendor registration.', 'hackknow'), 'error');
    } elseif (!preg_match('/^\d{12}$/', $_POST['hk_aadhaar'])) {
        wc_add_notice(__('Aadhaar must be exactly 12 digits.', 'hackknow'), 'error');
    }
    if (empty($_POST['hk_pan'])) {
        wc_add_notice(__('PAN Number is required for vendor registration.', 'hackknow'), 'error');
    } elseif (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', strtoupper($_POST['hk_pan']))) {
        wc_add_notice(__('PAN must be in the format ABCDE1234F.', 'hackknow'), 'error');
    }
    if (!empty($_POST['hk_gst']) && !preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/', strtoupper($_POST['hk_gst']))) {
        wc_add_notice(__('GSTIN format invalid (e.g. 22AAAAA0000A1Z5).', 'hackknow'), 'error');
    }
    return $required_fields;
});

// 4. Save KYC + force pending after account creation.
add_action('dokan_new_seller_created', function ($user_id, $dokan_settings = array()) {
    if (!empty($_POST['hk_aadhaar'])) {
        update_user_meta($user_id, '_hk_aadhaar', sanitize_text_field(wp_unslash($_POST['hk_aadhaar'])));
    }
    if (!empty($_POST['hk_pan'])) {
        update_user_meta($user_id, '_hk_pan', strtoupper(sanitize_text_field(wp_unslash($_POST['hk_pan']))));
    }
    if (!empty($_POST['hk_gst'])) {
        update_user_meta($user_id, '_hk_gst', strtoupper(sanitize_text_field(wp_unslash($_POST['hk_gst']))));
    }
    // Force pending approval (selling disabled) regardless of any other plugin defaults.
    update_user_meta($user_id, 'dokan_enable_selling', 'no');
}, 10, 2);

// 5. Show KYC + approval status on admin user-profile screen.
add_action('show_user_profile', 'hackknow_show_vendor_kyc');
add_action('edit_user_profile', 'hackknow_show_vendor_kyc');
function hackknow_show_vendor_kyc($user) {
    if (!user_can($user, 'dokandar') && !user_can($user, 'seller')) return;
    $aadhaar = get_user_meta($user->ID, '_hk_aadhaar', true);
    $pan     = get_user_meta($user->ID, '_hk_pan', true);
    $gst     = get_user_meta($user->ID, '_hk_gst', true);
    $selling = get_user_meta($user->ID, 'dokan_enable_selling', true);
    $is_approved = ($selling === 'yes');
    ?>
    <h3>HackKnow Vendor — KYC & Approval</h3>
    <table class="form-table">
        <tr><th>Aadhaar</th><td><strong><?php echo esc_html($aadhaar ?: '— not provided —'); ?></strong></td></tr>
        <tr><th>PAN</th><td><strong><?php echo esc_html($pan ?: '— not provided —'); ?></strong></td></tr>
        <tr><th>GST</th><td><strong><?php echo esc_html($gst ?: 'Not provided (optional)'); ?></strong></td></tr>
        <tr>
            <th>Selling status</th>
            <td>
                <?php if ($is_approved): ?>
                    <span style="background:#10B981;color:#fff;padding:4px 10px;border:2px solid #0A0A0A;border-radius:6px;font-weight:bold;">APPROVED — selling enabled</span>
                <?php else: ?>
                    <span style="background:#E11D48;color:#fff;padding:4px 10px;border:2px solid #0A0A0A;border-radius:6px;font-weight:bold;">PENDING APPROVAL</span>
                    <p style="margin-top:8px;color:#444">To approve this vendor, go to <strong>WP Admin → Users → Edit user → Vendor section</strong> and toggle <em>"Enable Selling"</em> to YES. Or run this in browser console of any admin page: <code>wp.ajax.post('hk_approve_vendor', { user_id: <?php echo (int)$user->ID; ?>, _wpnonce: '<?php echo wp_create_nonce('hk_approve_vendor_'.$user->ID); ?>' })</code></p>
                <?php endif; ?>
            </td>
        </tr>
    </table>
    <?php
}

// 6. AJAX shortcut for the founder to flip a vendor to APPROVED.
add_action('wp_ajax_hk_approve_vendor', function () {
    if (!current_user_can('manage_options')) wp_send_json_error('forbidden', 403);
    $user_id = isset($_POST['user_id']) ? (int) $_POST['user_id'] : 0;
    if (!$user_id || !wp_verify_nonce($_POST['_wpnonce'] ?? '', 'hk_approve_vendor_' . $user_id)) {
        wp_send_json_error('bad_nonce', 400);
    }
    update_user_meta($user_id, 'dokan_enable_selling', 'yes');
    update_user_meta($user_id, '_hk_approved_at', current_time('mysql'));
    wp_send_json_success(array('user_id' => $user_id, 'status' => 'approved'));
});


