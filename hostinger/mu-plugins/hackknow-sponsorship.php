<?php
/*
Plugin Name: HackKnow Sponsorship
Description: Cumulative-tier sponsor system (Bronze/Silver/Gold/Platinum/The God Father) with real Razorpay integration + pay-what-you-want for community templates.
Version:     1.0.0
Author:      HackKnow

Endpoints (all under /wp-json/hackknow/v1/):

  Sponsor (overrides existing intent-only flow in hackknow-wallet.php)
    GET  /sponsor/tiers                  list 5 tiers (cumulative ranges)
    GET  /sponsor/me                     current user's tier + cumulative total
    POST /sponsor/order                  create Razorpay order for arbitrary amount
                                         body: amount_rs, sponsor_name, anonymous, message
    POST /sponsor/verify                 verify Razorpay signature + record payment
                                         body: razorpay_order_id, razorpay_payment_id,
                                               razorpay_signature, sponsor_name, anonymous, message

  Pay-what-you-want templates (community)
    GET  /sponsorship/templates          public list of admin-curated templates
    POST /sponsorship/template/order     create Razorpay order for a specific template
                                         body: template_id, amount_rs, sponsor_name,
                                               anonymous, message
    POST /sponsorship/template/verify    verify + record sponsorship (also increments
                                         user cumulative -> tier upgrade)

  Public sponsor wall
    GET  /sponsorship/wall               top sponsors grouped by tier
                                         (anonymous sponsors hidden from name list
                                         but counted in stats)
*/

if (!defined('ABSPATH')) { exit; }

const HK_SP_NS              = 'hackknow/v1';
const HK_SP_TPL_CPT         = 'hk_sponsor_tpl';
const HK_SP_REC_CPT         = 'hk_sponsor';
const HK_SP_USER_TOTAL_META = '_hk_sponsor_total_paise';
const HK_SP_USER_TIER_META  = '_hk_sponsor_tier';
const HK_SP_USER_SINCE_META = '_hk_sponsor_since';
const HK_SP_SEED_FLAG       = 'hk_sp_seeded_v1';

/* ============================================================
 * 1. TIER CONFIG (cumulative paise thresholds, filterable)
 * ============================================================ */
function hk_sp_tiers() {
    return apply_filters('hk_sp_tiers', [
        [
            'tier'   => 'bronze',
            'name'   => 'Bronze',
            'min'    => 1,
            'max'    => 999,
            'color'  => '#CD7F32',
            'perks'  => [
                'Sponsor badge on your profile',
                'Discord community access',
                'Listed on the sponsor wall',
            ],
        ],
        [
            'tier'   => 'silver',
            'name'   => 'Silver',
            'min'    => 1000,
            'max'    => 4999,
            'color'  => '#C0C0C0',
            'perks'  => [
                'All Bronze perks',
                'Early access to new templates (48h)',
                '5% off all paid courses',
            ],
        ],
        [
            'tier'   => 'gold',
            'name'   => 'Gold',
            'min'    => 5000,
            'max'    => 24999,
            'color'  => '#FFD700',
            'perks'  => [
                'All Silver perks',
                '15% off all paid courses',
                'Monthly community Q&A call',
                'Logo / handle in monthly newsletter',
            ],
        ],
        [
            'tier'   => 'platinum',
            'name'   => 'Platinum',
            'min'    => 25000,
            'max'    => 99999,
            'color'  => '#E5E4E2',
            'perks'  => [
                'All Gold perks',
                '50% off all paid courses',
                'Direct WhatsApp support line',
                'Logo on website footer',
                'Quarterly 1-on-1 strategy call',
            ],
        ],
        [
            'tier'   => 'godfather',
            'name'   => 'The God Father',
            'min'    => 100000,
            'max'    => PHP_INT_MAX,
            'color'  => '#000000',
            'perks'  => [
                'All Platinum perks',
                'Lifetime free access to everything',
                'Monthly 1-on-1 mentor call',
                'Custom feature requests prioritised',
                'Co-branded campaign opportunities',
            ],
        ],
    ]);
}

function hk_sp_tier_for_paise($paise) {
    $rs = intval($paise) / 100;
    foreach (array_reverse(hk_sp_tiers()) as $t) {
        if ($rs >= $t['min']) return $t['tier'];
    }
    return 'none';
}

function hk_sp_tier_meta($tier_key) {
    foreach (hk_sp_tiers() as $t) {
        if ($t['tier'] === $tier_key) return $t;
    }
    return null;
}

/* ============================================================
 * 2. CPTs
 * ============================================================ */
add_action('init', function() {
    register_post_type(HK_SP_TPL_CPT, [
        'label'              => 'Sponsor Templates',
        'labels'             => [
            'name'          => 'Sponsor Templates',
            'singular_name' => 'Sponsor Template',
            'add_new_item'  => 'Add New Template',
            'edit_item'     => 'Edit Template',
        ],
        'public'             => false,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'menu_position'      => 27,
        'menu_icon'          => 'dashicons-heart',
        'supports'           => ['title', 'editor', 'thumbnail', 'excerpt'],
        'show_in_rest'       => true,
        'has_archive'        => false,
        'rewrite'            => false,
    ]);
    register_post_type(HK_SP_REC_CPT, [
        'label'              => 'Sponsorships',
        'labels'             => [
            'name'          => 'Sponsorships',
            'singular_name' => 'Sponsorship',
        ],
        'public'             => false,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'menu_position'      => 28,
        'menu_icon'          => 'dashicons-money-alt',
        'supports'           => ['title'],
        'capability_type'    => 'post',
        'capabilities'       => ['create_posts' => 'do_not_allow'],
        'map_meta_cap'       => true,
        'show_in_rest'       => false,
    ]);
}, 11);

/* ============================================================
 * 3. RAZORPAY HELPERS  (same pattern as hackknow-checkout.php)
 * ============================================================ */
function hk_sp_rzp_keys() {
    if (defined('HACKKNOW_RAZORPAY_KEY_ID') && defined('HACKKNOW_RAZORPAY_KEY_SECRET')) {
        return [HACKKNOW_RAZORPAY_KEY_ID, HACKKNOW_RAZORPAY_KEY_SECRET];
    }
    if (defined('RAZORPAY_KEY_ID') && defined('RAZORPAY_KEY_SECRET')) {
        return [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET];
    }
    return [null, null];
}

function hk_sp_rzp_create_order($amount_paise, $receipt, $notes = []) {
    list($key_id, $key_secret) = hk_sp_rzp_keys();
    if (!$key_id || !$key_secret) {
        return new WP_Error('rzp_unconfigured', 'Razorpay keys not configured on server', ['status' => 500]);
    }
    $amount_paise = intval($amount_paise);
    if ($amount_paise < 100)       return new WP_Error('amount_too_low',  'Minimum amount is Rs 1',           ['status' => 400]);
    if ($amount_paise > 10000000)  return new WP_Error('amount_too_high', 'Maximum amount is Rs 1,00,000',    ['status' => 400]);

    $resp = wp_remote_post('https://api.razorpay.com/v1/orders', [
        'timeout' => 20,
        'headers' => [
            'Authorization' => 'Basic ' . base64_encode("$key_id:$key_secret"),
            'Content-Type'  => 'application/json',
        ],
        'body' => wp_json_encode([
            'amount'   => $amount_paise,
            'currency' => 'INR',
            'receipt'  => substr($receipt, 0, 40),
            'notes'    => $notes,
        ]),
    ]);
    if (is_wp_error($resp)) return $resp;
    $code = wp_remote_retrieve_response_code($resp);
    $body = json_decode(wp_remote_retrieve_body($resp), true);
    if ($code !== 200 || empty($body['id'])) {
        return new WP_Error('rzp_create_failed', 'Razorpay order create failed: ' . wp_json_encode($body), ['status' => 502]);
    }
    return $body;
}

function hk_sp_rzp_verify_signature($order_id, $payment_id, $signature) {
    list(, $key_secret) = hk_sp_rzp_keys();
    if (!$key_secret) return false;
    $expected = hash_hmac('sha256', "$order_id|$payment_id", $key_secret);
    return hash_equals($expected, $signature);
}

function hk_sp_rzp_fetch_payment($payment_id) {
    list($key_id, $key_secret) = hk_sp_rzp_keys();
    if (!$key_id || !$key_secret) return new WP_Error('rzp_unconfigured', 'Razorpay keys missing', ['status' => 500]);
    $resp = wp_remote_get("https://api.razorpay.com/v1/payments/" . urlencode($payment_id), [
        'timeout' => 15,
        'headers' => ['Authorization' => 'Basic ' . base64_encode("$key_id:$key_secret")],
    ]);
    if (is_wp_error($resp)) return $resp;
    $body = json_decode(wp_remote_retrieve_body($resp), true);
    if (empty($body['amount'])) return new WP_Error('rzp_fetch_failed', 'Could not fetch payment', ['status' => 502]);
    return $body;
}

/* ============================================================
 * 4. USER STATE HELPERS
 * ============================================================ */
function hk_sp_user_total_paise($uid) {
    return intval(get_user_meta($uid, HK_SP_USER_TOTAL_META, true));
}
function hk_sp_user_tier($uid) {
    return hk_sp_tier_for_paise(hk_sp_user_total_paise($uid));
}
function hk_sp_user_since($uid) {
    return intval(get_user_meta($uid, HK_SP_USER_SINCE_META, true));
}

function hk_sp_record_payment($uid, $amount_paise, $type, $template_id, $payment_id, $order_id, $sponsor_name, $message, $anonymous) {
    $sponsor_name = $sponsor_name ?: 'Anonymous';
    $title = sprintf('%s Rs %d by %s', strtoupper($type), intval($amount_paise / 100), $anonymous ? 'Anonymous' : $sponsor_name);

    $post_id = wp_insert_post([
        'post_type'   => HK_SP_REC_CPT,
        'post_status' => 'publish',
        'post_title'  => $title,
        'meta_input'  => [
            '_user_id'              => intval($uid),
            '_amount_paise'         => intval($amount_paise),
            '_type'                 => sanitize_key($type),
            '_template_id'          => intval($template_id),
            '_razorpay_payment_id'  => sanitize_text_field($payment_id),
            '_razorpay_order_id'    => sanitize_text_field($order_id),
            '_sponsor_name'         => sanitize_text_field($sponsor_name),
            '_message'              => sanitize_textarea_field($message),
            '_anonymous'            => $anonymous ? 1 : 0,
            '_paid_at'              => time(),
        ],
    ], true);
    if (is_wp_error($post_id)) return $post_id;

    if ($uid) {
        $cur = hk_sp_user_total_paise($uid);
        $new = $cur + intval($amount_paise);
        update_user_meta($uid, HK_SP_USER_TOTAL_META, $new);
        update_user_meta($uid, HK_SP_USER_TIER_META,  hk_sp_tier_for_paise($new));
        if (!hk_sp_user_since($uid)) update_user_meta($uid, HK_SP_USER_SINCE_META, time());
    }

    do_action('hk_sp_payment_recorded', $post_id, $uid, $amount_paise, $type);
    return $post_id;
}

/* ============================================================
 * 5. AUTO-SEED 3 STARTER TEMPLATES (idempotent)
 * ============================================================ */
function hk_sp_maybe_seed_templates() {
    if (get_option(HK_SP_SEED_FLAG)) return;
    $samples = [
        [
            'title'   => 'MIS Dashboard Template (Excel)',
            'excerpt' => 'Plug-and-play Excel dashboard with charts, KPI cards, and conditional formatting. Pay what you can.',
            'content' => 'A complete MIS dashboard template you can adapt for any monthly review. Includes formulas, slicers, and 12 chart variations.',
            'min_rs'  => 1,
            'suggested_rs' => 199,
        ],
        [
            'title'   => 'Resume Bundle (5 ATS Designs)',
            'excerpt' => '5 ATS-friendly resume templates in Word format. Pay any amount you find fair.',
            'content' => '5 modern, ATS-friendly resume designs in editable Word format. Perfect for job applications.',
            'min_rs'  => 1,
            'suggested_rs' => 99,
        ],
        [
            'title'   => 'Notion Productivity OS',
            'excerpt' => 'Complete Notion workspace template for personal productivity. Bronze tier and above get extras.',
            'content' => 'A full Notion second-brain template with tasks, projects, daily journal, and review pages.',
            'min_rs'  => 1,
            'suggested_rs' => 299,
        ],
    ];
    foreach ($samples as $s) {
        $pid = wp_insert_post([
            'post_type'    => HK_SP_TPL_CPT,
            'post_status'  => 'publish',
            'post_title'   => $s['title'],
            'post_excerpt' => $s['excerpt'],
            'post_content' => $s['content'],
        ], true);
        if (!is_wp_error($pid)) {
            update_post_meta($pid, '_min_rs', $s['min_rs']);
            update_post_meta($pid, '_suggested_rs', $s['suggested_rs']);
        }
    }
    update_option(HK_SP_SEED_FLAG, time(), true);
}
add_action('init', 'hk_sp_maybe_seed_templates', 20);

/* ============================================================
 * 6. REST ROUTES
 * ============================================================ */
/* Surgical override: WordPress REST stacks duplicate route registrations
 * (first-registered wins in dispatch). hackknow-wallet.php registers
 * /sponsor/tiers and /sponsor/me at init priority 10 — we register at
 * priority 99 with an `hk_sp_owner` marker, then filter `rest_endpoints`
 * at priority 100 to keep only OUR handler for those two routes. All other
 * routes from wallet.php (community/*, sponsor/intent, etc.) are left intact.
 */
add_filter('rest_endpoints', function($endpoints) {
    $override_routes = [
        '/' . HK_SP_NS . '/sponsor/tiers',
        '/' . HK_SP_NS . '/sponsor/me',
    ];
    foreach ($override_routes as $route) {
        if (!isset($endpoints[$route]) || !is_array($endpoints[$route])) continue;
        $ours = array_values(array_filter($endpoints[$route], function($h) {
            return is_array($h) && !empty($h['hk_sp_owner']);
        }));
        if (!empty($ours)) {
            $endpoints[$route] = $ours;
        }
    }
    return $endpoints;
}, 100);

add_action('rest_api_init', function() {

    /* -------- Override /sponsor/tiers (5-tier cumulative) -------- */
    register_rest_route(HK_SP_NS, '/sponsor/tiers', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'hk_sp_owner'         => true,
        'callback'            => function() {
            return array_map(function($t) {
                return [
                    'tier'    => $t['tier'],
                    'name'    => $t['name'],
                    'monthly' => $t['min'],   // legacy field name (frontend already reads it as "starts at")
                    'min'     => $t['min'],
                    'max'     => $t['max'] >= PHP_INT_MAX ? null : $t['max'],
                    'color'   => $t['color'],
                    'perks'   => $t['perks'],
                ];
            }, hk_sp_tiers());
        },
    ]);

    /* -------- Override /sponsor/me (cumulative-based) -------- */
    register_rest_route(HK_SP_NS, '/sponsor/me', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'hk_sp_owner'         => true,
        'callback'            => function() {
            $uid = get_current_user_id();
            if (!$uid) return ['tier' => 'none', 'since' => 0, 'total_paise' => 0, 'total_rs' => 0];
            $total = hk_sp_user_total_paise($uid);
            return [
                'tier'        => hk_sp_user_tier($uid),
                'since'       => hk_sp_user_since($uid),
                'total_paise' => $total,
                'total_rs'    => intval($total / 100),
            ];
        },
    ]);

    /* -------- POST /sponsor/order (real Razorpay) -------- */
    register_rest_route(HK_SP_NS, '/sponsor/order', [
        'methods'             => 'POST',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback'            => function(WP_REST_Request $req) {
            $amount_rs = intval($req->get_param('amount_rs'));
            if ($amount_rs < 1 || $amount_rs > 100000) {
                return new WP_Error('bad_amount', 'Amount must be between Rs 1 and Rs 1,00,000', ['status' => 400]);
            }
            $uid          = get_current_user_id();
            $sponsor_name = sanitize_text_field((string)$req->get_param('sponsor_name'));
            $anonymous    = !!$req->get_param('anonymous');
            $message      = sanitize_textarea_field((string)$req->get_param('message'));
            $receipt      = "sp_" . $uid . "_" . time();
            $order = hk_sp_rzp_create_order($amount_rs * 100, $receipt, [
                'type'         => 'sponsor',
                'user_id'      => (string)$uid,
                'sponsor_name' => $sponsor_name,
                'anonymous'    => $anonymous ? '1' : '0',
                'message'      => substr($message, 0, 200),
            ]);
            if (is_wp_error($order)) return $order;
            list($key_id) = hk_sp_rzp_keys();
            return [
                'ok'       => true,
                'order_id' => $order['id'],
                'amount'   => $order['amount'],
                'currency' => $order['currency'],
                'key_id'   => $key_id,
                'receipt'  => $order['receipt'] ?? $receipt,
            ];
        },
    ]);

    /* -------- POST /sponsor/verify -------- */
    register_rest_route(HK_SP_NS, '/sponsor/verify', [
        'methods'             => 'POST',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback'            => function(WP_REST_Request $req) {
            $order_id   = sanitize_text_field((string)$req->get_param('razorpay_order_id'));
            $payment_id = sanitize_text_field((string)$req->get_param('razorpay_payment_id'));
            $signature  = sanitize_text_field((string)$req->get_param('razorpay_signature'));
            if (!$order_id || !$payment_id || !$signature) {
                return new WP_Error('missing_params', 'Missing Razorpay parameters', ['status' => 400]);
            }
            if (!hk_sp_rzp_verify_signature($order_id, $payment_id, $signature)) {
                return new WP_Error('bad_signature', 'Razorpay signature mismatch', ['status' => 400]);
            }
            $payment = hk_sp_rzp_fetch_payment($payment_id);
            if (is_wp_error($payment)) return $payment;
            $amount_paise = intval($payment['amount'] ?? 0);
            if ($amount_paise < 100) return new WP_Error('bad_amount', 'Invalid payment amount', ['status' => 400]);
            $uid = get_current_user_id();
            $rec = hk_sp_record_payment(
                $uid, $amount_paise, 'sponsor', 0,
                $payment_id, $order_id,
                sanitize_text_field((string)$req->get_param('sponsor_name')),
                sanitize_textarea_field((string)$req->get_param('message')),
                !!$req->get_param('anonymous')
            );
            if (is_wp_error($rec)) return $rec;
            return [
                'ok'              => true,
                'tier'            => hk_sp_user_tier($uid),
                'total_rs'        => intval(hk_sp_user_total_paise($uid) / 100),
                'amount_paid_rs'  => intval($amount_paise / 100),
                'sponsorship_id'  => $rec,
            ];
        },
    ]);

    /* -------- GET /sponsorship/templates -------- */
    register_rest_route(HK_SP_NS, '/sponsorship/templates', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function() {
            $posts = get_posts([
                'post_type'      => HK_SP_TPL_CPT,
                'posts_per_page' => 100,
                'post_status'    => 'publish',
                'orderby'        => 'date',
                'order'          => 'DESC',
            ]);
            return array_map(function($p) {
                $thumb = get_the_post_thumbnail_url($p->ID, 'medium');
                return [
                    'id'           => $p->ID,
                    'slug'         => $p->post_name,
                    'title'        => $p->post_title,
                    'excerpt'      => $p->post_excerpt ?: wp_trim_words($p->post_content, 24),
                    'content'      => apply_filters('the_content', $p->post_content),
                    'min_rs'       => max(1, intval(get_post_meta($p->ID, '_min_rs', true) ?: 1)),
                    'suggested_rs' => max(1, intval(get_post_meta($p->ID, '_suggested_rs', true) ?: 99)),
                    'thumbnail'    => $thumb ?: null,
                    'created_at'   => get_post_time('U', true, $p),
                ];
            }, $posts);
        },
    ]);

    /* -------- POST /sponsorship/template/order -------- */
    register_rest_route(HK_SP_NS, '/sponsorship/template/order', [
        'methods'             => 'POST',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback'            => function(WP_REST_Request $req) {
            $template_id = intval($req->get_param('template_id'));
            $amount_rs   = intval($req->get_param('amount_rs'));
            $tpl = $template_id ? get_post($template_id) : null;
            if (!$tpl || $tpl->post_type !== HK_SP_TPL_CPT || $tpl->post_status !== 'publish') {
                return new WP_Error('bad_template', 'Template not found', ['status' => 404]);
            }
            $min = max(1, intval(get_post_meta($template_id, '_min_rs', true) ?: 1));
            if ($amount_rs < $min)        return new WP_Error('bad_amount', "Minimum for this template is Rs $min", ['status' => 400]);
            if ($amount_rs > 100000)      return new WP_Error('bad_amount', 'Maximum is Rs 1,00,000',                ['status' => 400]);
            $uid          = get_current_user_id();
            $sponsor_name = sanitize_text_field((string)$req->get_param('sponsor_name'));
            $anonymous    = !!$req->get_param('anonymous');
            $message      = sanitize_textarea_field((string)$req->get_param('message'));
            $receipt      = "tpl_" . $template_id . "_" . $uid . "_" . time();
            $order = hk_sp_rzp_create_order($amount_rs * 100, $receipt, [
                'type'         => 'template',
                'template_id'  => (string)$template_id,
                'user_id'      => (string)$uid,
                'sponsor_name' => $sponsor_name,
                'anonymous'    => $anonymous ? '1' : '0',
            ]);
            if (is_wp_error($order)) return $order;
            list($key_id) = hk_sp_rzp_keys();
            return [
                'ok'           => true,
                'order_id'     => $order['id'],
                'amount'       => $order['amount'],
                'currency'     => $order['currency'],
                'key_id'       => $key_id,
                'template_id'  => $template_id,
                'receipt'      => $order['receipt'] ?? $receipt,
            ];
        },
    ]);

    /* -------- POST /sponsorship/template/verify -------- */
    register_rest_route(HK_SP_NS, '/sponsorship/template/verify', [
        'methods'             => 'POST',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback'            => function(WP_REST_Request $req) {
            $order_id    = sanitize_text_field((string)$req->get_param('razorpay_order_id'));
            $payment_id  = sanitize_text_field((string)$req->get_param('razorpay_payment_id'));
            $signature   = sanitize_text_field((string)$req->get_param('razorpay_signature'));
            $template_id = intval($req->get_param('template_id'));
            if (!$order_id || !$payment_id || !$signature) {
                return new WP_Error('missing_params', 'Missing Razorpay parameters', ['status' => 400]);
            }
            if (!hk_sp_rzp_verify_signature($order_id, $payment_id, $signature)) {
                return new WP_Error('bad_signature', 'Razorpay signature mismatch', ['status' => 400]);
            }
            $payment = hk_sp_rzp_fetch_payment($payment_id);
            if (is_wp_error($payment)) return $payment;
            $amount_paise = intval($payment['amount'] ?? 0);
            $uid = get_current_user_id();
            $rec = hk_sp_record_payment(
                $uid, $amount_paise, 'template', $template_id,
                $payment_id, $order_id,
                sanitize_text_field((string)$req->get_param('sponsor_name')),
                sanitize_textarea_field((string)$req->get_param('message')),
                !!$req->get_param('anonymous')
            );
            if (is_wp_error($rec)) return $rec;
            $tpl = get_post($template_id);
            return [
                'ok'             => true,
                'tier'           => hk_sp_user_tier($uid),
                'total_rs'       => intval(hk_sp_user_total_paise($uid) / 100),
                'amount_paid_rs' => intval($amount_paise / 100),
                'template'       => $tpl ? ['id' => $tpl->ID, 'title' => $tpl->post_title] : null,
                'sponsorship_id' => $rec,
            ];
        },
    ]);

    /* -------- GET /sponsorship/wall -------- */
    register_rest_route(HK_SP_NS, '/sponsorship/wall', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function() {
            global $wpdb;
            $posts = get_posts([
                'post_type'      => HK_SP_REC_CPT,
                'posts_per_page' => 500,
                'post_status'    => 'publish',
                'orderby'        => 'meta_value_num',
                'meta_key'       => '_amount_paise',
                'order'          => 'DESC',
                'fields'         => 'ids',
            ]);
            $by_tier = [];
            foreach (hk_sp_tiers() as $t) {
                $by_tier[$t['tier']] = ['tier' => $t['tier'], 'name' => $t['name'], 'color' => $t['color'], 'sponsors' => []];
            }
            $stats = ['total_paise' => 0, 'total_count' => 0, 'anon_count' => 0];
            foreach ($posts as $pid) {
                $amt   = intval(get_post_meta($pid, '_amount_paise', true));
                $anon  = intval(get_post_meta($pid, '_anonymous', true));
                $name  = get_post_meta($pid, '_sponsor_name', true) ?: 'Anonymous';
                $stats['total_paise'] += $amt;
                $stats['total_count'] += 1;
                if ($anon) { $stats['anon_count'] += 1; continue; }
                $tier = hk_sp_tier_for_paise($amt);
                if (!isset($by_tier[$tier])) continue;
                if (count($by_tier[$tier]['sponsors']) >= 30) continue;
                $by_tier[$tier]['sponsors'][] = [
                    'name'      => $name,
                    'amount_rs' => intval($amt / 100),
                    'paid_at'   => intval(get_post_meta($pid, '_paid_at', true)),
                ];
            }
            return [
                'tiers' => array_values($by_tier),
                'stats' => [
                    'total_rs'    => intval($stats['total_paise'] / 100),
                    'total_count' => $stats['total_count'],
                    'anon_count'  => $stats['anon_count'],
                ],
            ];
        },
    ]);

}, 99);  // priority 99 -> our routes override hackknow-wallet.php (priority 10)

/* ============================================================
 * 7. ENRICH /me/badges with new tier info
 *    hackknow-wallet.php returns sponsor_tier from user meta;
 *    we make sure that meta is current by recomputing on read.
 * ============================================================ */
add_filter('rest_request_after_callbacks', function($response, $handler, $req) {
    if (!($req instanceof WP_REST_Request)) return $response;
    if ($req->get_route() !== '/' . HK_SP_NS . '/me/badges') return $response;
    if (!($response instanceof WP_REST_Response)) return $response;
    $data = $response->get_data();
    if (!is_array($data)) return $response;
    $uid = get_current_user_id();
    if ($uid && !empty($data['logged_in'])) {
        $tier = hk_sp_user_tier($uid);
        $data['sponsor_tier'] = $tier === 'none' ? 'none' : $tier;
        $data['sponsor_total_rs'] = intval(hk_sp_user_total_paise($uid) / 100);
        $response->set_data($data);
    }
    return $response;
}, 10, 3);

/* ============================================================
 * 8. ADMIN — meta box on Sponsor Template for min/suggested ₹
 * ============================================================ */
add_action('add_meta_boxes', function() {
    add_meta_box('hk_sp_tpl_meta', 'Pricing', function($post) {
        $min = intval(get_post_meta($post->ID, '_min_rs', true) ?: 1);
        $sug = intval(get_post_meta($post->ID, '_suggested_rs', true) ?: 99);
        wp_nonce_field('hk_sp_tpl_meta', 'hk_sp_tpl_nonce');
        echo '<p><label><strong>Minimum Rs</strong><br><input type="number" name="hk_sp_min_rs" value="' . esc_attr($min) . '" min="1" max="100000" style="width:100%"></label></p>';
        echo '<p><label><strong>Suggested Rs</strong><br><input type="number" name="hk_sp_suggested_rs" value="' . esc_attr($sug) . '" min="1" max="100000" style="width:100%"></label></p>';
        echo '<p style="color:#666;font-size:11px">Customer can pay any amount &gt;= minimum, up to Rs 1,00,000.</p>';
    }, HK_SP_TPL_CPT, 'side');
});
add_action('save_post_' . HK_SP_TPL_CPT, function($post_id) {
    if (!isset($_POST['hk_sp_tpl_nonce']) || !wp_verify_nonce($_POST['hk_sp_tpl_nonce'], 'hk_sp_tpl_meta')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;
    $min = max(1, intval($_POST['hk_sp_min_rs'] ?? 1));
    $sug = max(1, intval($_POST['hk_sp_suggested_rs'] ?? 99));
    update_post_meta($post_id, '_min_rs', $min);
    update_post_meta($post_id, '_suggested_rs', $sug);
});

/* ============================================================
 * 9. ADMIN — columns on Sponsorship list
 * ============================================================ */
add_filter('manage_' . HK_SP_REC_CPT . '_posts_columns', function($cols) {
    return [
        'cb'       => $cols['cb'] ?? '',
        'title'    => 'Sponsorship',
        'amount'   => 'Amount',
        'type'     => 'Type',
        'sponsor'  => 'Sponsor',
        'date'     => 'When',
    ];
});
add_action('manage_' . HK_SP_REC_CPT . '_posts_custom_column', function($col, $pid) {
    if ($col === 'amount') {
        $p = intval(get_post_meta($pid, '_amount_paise', true));
        echo 'Rs ' . number_format_i18n($p / 100);
    } elseif ($col === 'type') {
        echo esc_html(get_post_meta($pid, '_type', true) ?: 'sponsor');
    } elseif ($col === 'sponsor') {
        $name = get_post_meta($pid, '_sponsor_name', true) ?: 'Anonymous';
        $anon = intval(get_post_meta($pid, '_anonymous', true));
        echo esc_html($anon ? '(anonymous)' : $name);
    }
}, 10, 2);
