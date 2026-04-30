<?php
/**
 * Plugin Name:  HackKnow Extras (v2)
 * Description:  Adds the v2 expansion on top of hackknow-content.php — new categories
 *               (Web Dev Crash Course, Templates, Digital Marketing, Hackknow Premium,
 *               Hack With Hackknow, AI Pro Subs, Sponsor Us, FOR Community), wallet
 *               system with recharge bonuses, reward coupon engine, sponsor/community
 *               recognition CPT, badge tier system, and a unified admin panel.
 *               Strictly ADDITIVE — never deletes existing terms / coupons / posts.
 * Version:      2.0.0
 * Author:       HackKnow
 *
 * Architecture notes
 * ------------------
 * - Term provisioning is idempotent and only INSERTs missing terms — existing terms
 *   (created by users via wp-admin or by hackknow-content.php) are left untouched.
 * - Wallet uses a custom table `wp_hk_wallet_tx` (append-only ledger) plus a cached
 *   user-meta `_hk_wallet_balance` for fast reads. The cache is rebuildable from the
 *   ledger via hk_wallet_recompute().
 * - Recharge bonus rules are stored in option `hk_wallet_bonus_rules` so admins can
 *   tune them from the wp-admin UI without code changes.
 * - Reward coupon: when a user crosses the lifetime-spend threshold (default ₹2000),
 *   one personal 100%-off coupon is auto-generated with usage_limit=20.  The threshold
 *   is admin-configurable via option `hk_reward_threshold`.
 * - Badge tiers are computed from lifetime spend (orders + wallet recharges).
 *   Thresholds are admin-configurable via option `hk_badge_tiers`.
 * - Sponsor & community recognition uses a dedicated CPT `hk_sponsor` so admins can
 *   curate the homepage Top-3 lists every week.
 * - All new endpoints live under `/wp-json/hackknow/v1/*` to share auth + nonce
 *   conventions with hackknow-content.php.
 */

if (!defined('ABSPATH')) { exit; }

// ============================================================================
// 0.  Constants, options, and option helpers
// ============================================================================

define('HK_EXTRAS_VERSION',         '2.0.0');
define('HK_WALLET_TABLE',           'hk_wallet_tx');
define('HK_OPT_WALLET_BONUS',       'hk_wallet_bonus_rules');
define('HK_OPT_REWARD_THRESHOLD',   'hk_reward_threshold');
define('HK_OPT_BADGE_TIERS',        'hk_badge_tiers');
define('HK_OPT_PROVISIONED',        'hk_extras_provisioned_v2');
define('HK_USER_META_BALANCE',      '_hk_wallet_balance');
define('HK_USER_META_LIFETIME',     '_hk_lifetime_spend');
define('HK_USER_META_BADGE',        '_hk_badge_tier');
define('HK_USER_META_REWARD_GRANT', '_hk_reward_coupon_granted');
define('HK_REWARD_COUPON_PREFIX',   'HKLOYAL-');

/** Default recharge bonus rules — pay X, receive Y bonus credit. */
function hk_extras_default_bonus_rules() {
    return [
        ['pay' => 100,  'bonus' => 50],
        ['pay' => 500,  'bonus' => 350],
        ['pay' => 1000, 'bonus' => 700],
    ];
}

/** Default badge tiers (lifetime ₹ → tier).  Top-down — highest first. */
function hk_extras_default_badge_tiers() {
    return [
        ['tier' => 'The GodFather', 'min' => 50000, 'colour' => '#000000'],
        ['tier' => 'Diamond',       'min' => 25000, 'colour' => '#7FF0FF'],
        ['tier' => 'Platinum',      'min' => 10000, 'colour' => '#E5E4E2'],
        ['tier' => 'Gold',          'min' => 5000,  'colour' => '#FFD700'],
        ['tier' => 'Silver',        'min' => 2000,  'colour' => '#C0C0C0'],
        ['tier' => 'Bronze',        'min' => 500,   'colour' => '#CD7F32'],
    ];
}

function hk_extras_get_bonus_rules() {
    $r = get_option(HK_OPT_WALLET_BONUS, null);
    return is_array($r) && $r ? $r : hk_extras_default_bonus_rules();
}

function hk_extras_get_badge_tiers() {
    $r = get_option(HK_OPT_BADGE_TIERS, null);
    return is_array($r) && $r ? $r : hk_extras_default_badge_tiers();
}

function hk_extras_get_reward_threshold() {
    $v = (int) get_option(HK_OPT_REWARD_THRESHOLD, 2000);
    return $v > 0 ? $v : 2000;
}

// ============================================================================
// 1.  Activation: create custom table + run provisioning once per version
// ============================================================================

// Install runs on `init:99` so all CPTs/taxonomies (registered on init:0-10) and
// WooCommerce (loaded on plugins_loaded) are guaranteed available before we touch
// wp_insert_term / wp_insert_post / WC_Coupon. Each phase is wrapped so a single
// failure cannot WSOD the whole site — failures are logged and provisioning is
// retried on the next request (we only mark the option after every phase succeeds).
add_action('init', 'hk_extras_maybe_install', 99);
function hk_extras_maybe_install() {
    $installed = get_option(HK_OPT_PROVISIONED, '');
    if ($installed === HK_EXTRAS_VERSION) return;
    // Guard against re-entrancy if init fires more than once (rare but possible
    // during CLI / cron paths).
    static $running = false;
    if ($running) return;
    $running = true;

    $ok = true;
    foreach (['hk_extras_create_tables',
              'hk_extras_provision_terms',
              'hk_extras_provision_pages',
              'hk_extras_ensure_admin_user'] as $phase) {
        try {
            call_user_func($phase);
        } catch (Throwable $e) {
            $ok = false;
            error_log(sprintf('[hackknow-extras] %s failed: %s', $phase, $e->getMessage()));
        }
    }
    if ($ok) update_option(HK_OPT_PROVISIONED, HK_EXTRAS_VERSION);
    $running = false;
}

function hk_extras_create_tables() {
    global $wpdb;
    $table   = $wpdb->prefix . HK_WALLET_TABLE;
    $charset = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE {$table} (
        id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id       BIGINT UNSIGNED NOT NULL,
        amount        DECIMAL(12,2)   NOT NULL,
        balance_after DECIMAL(12,2)   NOT NULL,
        type          VARCHAR(40)     NOT NULL,
        ref           VARCHAR(120)    NULL,
        note          VARCHAR(255)    NULL,
        created_at    DATETIME        NOT NULL,
        PRIMARY KEY (id),
        KEY idx_user (user_id),
        KEY idx_type (type),
        KEY idx_ref  (ref)
    ) {$charset};";
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}

// ============================================================================
// 2.  Term provisioning — additive only, never deletes / renames
// ============================================================================

/**
 * Master taxonomy seed.  Each top entry is a parent term in `hk_course_cat`,
 * with optional children.  We append; we never overwrite descriptions or slugs
 * of pre-existing terms.
 *
 * Naming policy: "Templates" suffix is added on the FRONTEND for product cards;
 * here we keep clean technology names so courses + templates can share terms.
 */
function hk_extras_taxonomy_seed() {
    return [
        // --- Courses ----------------------------------------------------------
        [
            'tax'      => 'hk_course_cat',
            'name'     => 'Web Developer Crash Course',
            'slug'     => 'web-dev-crash-course',
            'children' => [
                'HTML', 'CSS', 'JavaScript', 'TypeScript',
                'React', 'Next.js', 'Angular', 'Vue',
                'Node.js', 'Express.js', 'MongoDB', 'SQL',
                'PHP', 'Python Web Dev',
                'API Integration', 'Authentication Systems', 'Payment Gateway Integration',
                'Deployment Methods', 'Git/GitHub', 'GitHub Repo Fixing',
                'Debugging & Error Fixing', 'Performance Optimization',
                'Hosting & Domains', 'Security Best Practices',
            ],
        ],
        [
            'tax'      => 'hk_course_cat',
            'name'     => 'Digital Marketing',
            'slug'     => 'digital-marketing',
            'children' => ['Strategy Builder', 'AI GenSEO', 'SEO Crafter', 'Keyword Spotter'],
        ],
        [
            'tax'      => 'hk_course_cat',
            'name'     => 'Hack With Hackknow',
            'slug'     => 'hack-with-hackknow',
            'children' => ['Ethical Hacking Tricks', 'What To Do', 'What Not To Do'],
        ],
        // --- WooCommerce product categories -----------------------------------
        [
            'tax'      => 'product_cat',
            'name'     => 'Website Templates',
            'slug'     => 'website-templates',
            'children' => [
                'PHP Templates', 'HTML Templates', 'WordPress Templates',
                'Node.js Templates', 'Vite Templates', 'React Templates',
                'Angular Templates', 'Vercel Templates', 'Netlify Templates',
            ],
        ],
        [
            'tax'      => 'product_cat',
            'name'     => 'Hackknow Premium',
            'slug'     => 'hackknow-premium',
            'children' => [
                'Custom Website Templates',
                'Custom Dashboards',
                'MIS Custom Dashboards',
                'Pre-Built Brand Strategy Systems',
                'Digital Influencer Pre-Built Strategies',
                'LLM Result Tracker',
                'Impact Changer',
            ],
        ],
        [
            'tax'      => 'product_cat',
            'name'     => 'AI Pro Subscriptions (100% Free)',
            'slug'     => 'ai-pro-subscriptions',
            'children' => [],
        ],
    ];
}

function hk_extras_provision_terms() {
    foreach (hk_extras_taxonomy_seed() as $group) {
        $tax = $group['tax'];
        if (!taxonomy_exists($tax)) continue;

        // Parent
        $parent_id = 0;
        $existing  = get_term_by('slug', $group['slug'], $tax);
        if ($existing && !is_wp_error($existing)) {
            $parent_id = (int) $existing->term_id;
        } else {
            $r = wp_insert_term($group['name'], $tax, ['slug' => $group['slug']]);
            if (!is_wp_error($r)) $parent_id = (int) $r['term_id'];
        }
        if (!$parent_id) continue;

        // Children
        foreach ($group['children'] as $child_name) {
            $child_slug = sanitize_title($child_name);
            $exists     = get_term_by('slug', $child_slug, $tax);
            if ($exists && !is_wp_error($exists)) continue;
            wp_insert_term($child_name, $tax, [
                'slug'   => $child_slug,
                'parent' => $parent_id,
            ]);
        }
    }
}

// ============================================================================
// 3.  Page provisioning — Sponsor Us, FOR Community, AI Pro Subscriptions
// ============================================================================

function hk_extras_provision_pages() {
    $pages = [
        [
            'slug'    => 'sponsor-us',
            'title'   => 'Sponsor Us',
            'meta'    => '_hk_page_role:sponsor',
            'content' => "<!-- wp:paragraph --><p>Whoever sponsors us, we will remember and pay back loyalty when we become eligible for that.</p><!-- /wp:paragraph -->",
        ],
        [
            'slug'    => 'for-community',
            'title'   => 'FOR Community',
            'meta'    => '_hk_page_role:community',
            'content' => "<!-- wp:paragraph --><p>Pay any amount you wish — every contribution funds free courses, free AI tools, and the open knowledge base. Top contributors and the most respected community voices are featured weekly on the homepage.</p><!-- /wp:paragraph -->",
        ],
        [
            'slug'    => 'ai-pro-subscriptions',
            'title'   => 'AI Pro Subscriptions (100% Free)',
            'meta'    => '_hk_page_role:ai_pro',
            'content' => "<!-- wp:paragraph --><p>All AI Pro subscriptions on HackKnow are 100% free. Bring your own keys, pick your model, your rules — no credit card, no hidden tier.</p><!-- /wp:paragraph -->",
        ],
    ];
    foreach ($pages as $p) {
        $existing = get_page_by_path($p['slug']);
        if ($existing) continue;
        $page_id = wp_insert_post([
            'post_type'    => 'page',
            'post_status'  => 'publish',
            'post_title'   => $p['title'],
            'post_name'    => $p['slug'],
            'post_content' => $p['content'],
        ]);
        if ($page_id && !is_wp_error($page_id)) {
            list($k, $v) = explode(':', $p['meta'], 2);
            update_post_meta($page_id, $k, $v);
        }
    }
}

// ============================================================================
// 4.  Admin user — create if missing, NEVER overwrite an existing account
// ============================================================================

function hk_extras_ensure_admin_user() {
    $email = 'Yahavi@hackknow.com';
    if (email_exists($email) || username_exists('yahavi')) return;
    $password = wp_generate_password(20, true, true); // safe random; admin sets real password via /wp-admin > Profile
    $uid = wp_insert_user([
        'user_login'    => 'yahavi',
        'user_email'    => $email,
        'user_pass'     => $password,
        'display_name'  => 'Yahavi',
        'role'          => 'administrator',
    ]);
    if (!is_wp_error($uid)) {
        update_user_meta($uid, '_hk_admin_seeded', current_time('mysql'));
    }
}

// ============================================================================
// 5.  Wallet system — append-only ledger + cached balance
// ============================================================================

/**
 * Credit / debit a user's wallet.  All wallet movements MUST go through this
 * function so the ledger and cached balance stay in sync.
 *
 * @param int    $user_id
 * @param float  $amount   positive = credit, negative = debit
 * @param string $type     e.g. 'recharge', 'recharge_bonus', 'spend', 'refund', 'adjust'
 * @param string $ref      external reference (Razorpay payment_id, order_id…)
 * @param string $note     optional human note
 * @return array|WP_Error  ['balance' => float, 'tx_id' => int]
 */
function hk_wallet_apply($user_id, $amount, $type, $ref = '', $note = '') {
    global $wpdb;
    $user_id = (int) $user_id;
    $amount  = round((float) $amount, 2);
    if ($user_id <= 0)            return new WP_Error('hk_wallet_user', 'Invalid user');
    if ($amount === 0.0)          return new WP_Error('hk_wallet_zero', 'Zero amount');
    if (!get_userdata($user_id))  return new WP_Error('hk_wallet_user', 'User not found');

    $balance = (float) get_user_meta($user_id, HK_USER_META_BALANCE, true);
    $new     = round($balance + $amount, 2);
    if ($new < 0) {
        return new WP_Error('hk_wallet_insufficient', 'Insufficient wallet balance');
    }
    $table = $wpdb->prefix . HK_WALLET_TABLE;
    $ok = $wpdb->insert($table, [
        'user_id'       => $user_id,
        'amount'        => $amount,
        'balance_after' => $new,
        'type'          => substr(sanitize_key($type) ?: 'adjust', 0, 40),
        'ref'           => $ref ? substr((string) $ref, 0, 120) : null,
        'note'          => $note ? substr((string) $note, 0, 255) : null,
        'created_at'    => current_time('mysql'),
    ]);
    if (!$ok) return new WP_Error('hk_wallet_db', 'Failed to record transaction');
    update_user_meta($user_id, HK_USER_META_BALANCE, $new);
    do_action('hk_wallet_after_apply', $user_id, $amount, $type, $ref, $new);
    return ['balance' => $new, 'tx_id' => (int) $wpdb->insert_id];
}

/** Re-derive cached balance from the ledger.  Useful for repairs. */
function hk_wallet_recompute($user_id) {
    global $wpdb;
    $table   = $wpdb->prefix . HK_WALLET_TABLE;
    $balance = (float) $wpdb->get_var($wpdb->prepare(
        "SELECT COALESCE(SUM(amount), 0) FROM {$table} WHERE user_id = %d", $user_id
    ));
    update_user_meta($user_id, HK_USER_META_BALANCE, round($balance, 2));
    return $balance;
}

/** Pick the bonus for a recharge amount.  Highest-eligible-tier wins. */
function hk_wallet_bonus_for($amount) {
    $rules = hk_extras_get_bonus_rules();
    usort($rules, function ($a, $b) { return ($b['pay'] ?? 0) <=> ($a['pay'] ?? 0); });
    foreach ($rules as $r) {
        if ((float) $amount >= (float) $r['pay']) return (float) $r['bonus'];
    }
    return 0.0;
}

/**
 * Credit a verified Razorpay recharge.  Caller MUST have already verified the
 * Razorpay signature (typically the /wallet/recharge REST endpoint, or a
 * Razorpay webhook).  Idempotent on `payment_id`.
 */
function hk_wallet_credit_recharge($user_id, $amount, $payment_id) {
    global $wpdb;
    $table = $wpdb->prefix . HK_WALLET_TABLE;
    // Idempotent guard
    $exists = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table} WHERE type='recharge' AND ref=%s LIMIT 1", $payment_id
    ));
    if ($exists) return ['balance' => (float) get_user_meta($user_id, HK_USER_META_BALANCE, true), 'duplicate' => true];

    $r1 = hk_wallet_apply($user_id, (float) $amount, 'recharge', $payment_id, 'Razorpay recharge');
    if (is_wp_error($r1)) return $r1;
    $bonus = hk_wallet_bonus_for($amount);
    if ($bonus > 0) {
        hk_wallet_apply($user_id, $bonus, 'recharge_bonus', $payment_id, sprintf('Bonus on recharge of ₹%s', number_format((float) $amount, 0)));
    }
    hk_lifetime_record($user_id, (float) $amount); // count recharges toward badge & reward
    return ['balance' => (float) get_user_meta($user_id, HK_USER_META_BALANCE, true), 'bonus' => $bonus];
}

// ============================================================================
// 6.  Lifetime spend → Badge tier + Reward coupon
// ============================================================================

function hk_lifetime_record($user_id, $amount) {
    $current = (float) get_user_meta($user_id, HK_USER_META_LIFETIME, true);
    $new     = round($current + (float) $amount, 2);
    update_user_meta($user_id, HK_USER_META_LIFETIME, $new);
    hk_badge_recompute($user_id, $new);
    hk_reward_maybe_grant($user_id, $new);
    return $new;
}

function hk_badge_recompute($user_id, $lifetime = null) {
    if ($lifetime === null) $lifetime = (float) get_user_meta($user_id, HK_USER_META_LIFETIME, true);
    $tiers = hk_extras_get_badge_tiers();
    usort($tiers, function ($a, $b) { return ($b['min'] ?? 0) <=> ($a['min'] ?? 0); });
    $badge = '';
    foreach ($tiers as $t) {
        if ($lifetime >= (float) $t['min']) { $badge = $t['tier']; break; }
    }
    update_user_meta($user_id, HK_USER_META_BADGE, $badge);
    return $badge;
}

function hk_reward_maybe_grant($user_id, $lifetime) {
    if ((float) $lifetime < hk_extras_get_reward_threshold()) return null;
    if (get_user_meta($user_id, HK_USER_META_REWARD_GRANT, true)) return null; // already granted
    if (!class_exists('WC_Coupon')) return null;

    $code = HK_REWARD_COUPON_PREFIX . strtoupper(substr(wp_generate_password(8, false, false), 0, 8));
    while (wc_get_coupon_id_by_code($code)) {
        $code = HK_REWARD_COUPON_PREFIX . strtoupper(substr(wp_generate_password(8, false, false), 0, 8));
    }
    $coupon_id = wp_insert_post([
        'post_title'   => $code,
        'post_content' => 'Loyalty reward coupon — granted at ₹' . hk_extras_get_reward_threshold() . ' lifetime spend.',
        'post_status'  => 'publish',
        'post_author'  => 1,
        'post_type'    => 'shop_coupon',
    ]);
    if (!$coupon_id || is_wp_error($coupon_id)) return null;
    update_post_meta($coupon_id, 'discount_type',           'percent');
    update_post_meta($coupon_id, 'coupon_amount',           '100');
    update_post_meta($coupon_id, 'individual_use',          'yes');
    update_post_meta($coupon_id, 'usage_limit',             20);
    update_post_meta($coupon_id, 'usage_limit_per_user',    20);
    update_post_meta($coupon_id, 'limit_usage_to_x_items',  '');
    update_post_meta($coupon_id, 'customer_email',          [strtolower(wp_get_current_user()->user_email ?: get_userdata($user_id)->user_email)]);
    update_post_meta($coupon_id, '_hk_owner_user',          $user_id);

    update_user_meta($user_id, HK_USER_META_REWARD_GRANT, ['code' => $code, 'coupon_id' => $coupon_id, 'granted_at' => current_time('mysql')]);
    do_action('hk_reward_granted', $user_id, $code, $coupon_id);
    return $code;
}

// ============================================================================
// 7.  WooCommerce hooks — track order spend, recompute badge & reward
// ============================================================================

add_action('woocommerce_order_status_completed', 'hk_extras_on_order_completed', 20, 1);
function hk_extras_on_order_completed($order_id) {
    if (!function_exists('wc_get_order')) return;
    $order = wc_get_order($order_id);
    if (!$order) return;
    $user_id = (int) $order->get_user_id();
    if ($user_id <= 0) return;
    if ($order->get_meta('_hk_lifetime_recorded')) return; // idempotent
    $total = (float) $order->get_total();
    if ($total <= 0) return;
    hk_lifetime_record($user_id, $total);
    $order->update_meta_data('_hk_lifetime_recorded', current_time('mysql'));
    $order->save();
}

// ============================================================================
// 8.  Sponsor / Community CPT
// ============================================================================

add_action('init', 'hk_sponsor_register_cpt');
function hk_sponsor_register_cpt() {
    register_post_type('hk_sponsor', [
        'labels'              => [
            'name'          => 'Sponsors & Community',
            'singular_name' => 'Sponsor',
            'add_new_item'  => 'Add new Sponsor / Community member',
            'edit_item'     => 'Edit Sponsor / Community member',
        ],
        'public'              => false,
        'publicly_queryable'  => false,
        'show_ui'             => true,
        'show_in_menu'        => 'hk_root',
        'show_in_rest'        => true,
        'rest_base'           => 'hk_sponsor',
        'supports'            => ['title', 'thumbnail', 'custom-fields'],
        'menu_icon'           => 'dashicons-heart',
    ]);
}

add_action('add_meta_boxes', 'hk_sponsor_meta_boxes');
function hk_sponsor_meta_boxes() {
    add_meta_box('hk_sponsor_meta', 'Sponsor / Community details', 'hk_sponsor_box', 'hk_sponsor', 'normal', 'high');
}
function hk_sponsor_box($post) {
    wp_nonce_field('hk_sponsor_save', 'hk_sponsor_nonce');
    $f = function ($k, $label, $type = 'text', $help = '') use ($post) {
        $v = esc_attr(get_post_meta($post->ID, $k, true));
        echo '<p><label style="display:block;font-weight:600;margin-bottom:4px">' . esc_html($label) . '</label>';
        if ($type === 'textarea') echo "<textarea name='{$k}' rows='3' style='width:100%'>" . esc_textarea(get_post_meta($post->ID, $k, true)) . "</textarea>";
        elseif ($type === 'select_role') {
            $opts = ['sponsor' => 'Sponsor', 'community' => 'Community Respect Holder'];
            echo "<select name='{$k}' style='min-width:240px'>";
            foreach ($opts as $val => $lab) echo "<option value='" . esc_attr($val) . "'" . selected($v, $val, false) . ">" . esc_html($lab) . "</option>";
            echo "</select>";
        }
        else echo "<input type='{$type}' name='{$k}' value='{$v}' style='width:100%' />";
        if ($help) echo "<small style='color:#666'>{$help}</small>";
        echo '</p>';
    };
    $f('_hk_sp_role',       'Role',                'select_role', 'Sponsor → top 3 by support amount.  Community → top 3 by community engagement.');
    $f('_hk_sp_amount',     'Total support (₹)',   'number',       'Used to rank weekly Top 3 Sponsors.');
    $f('_hk_sp_photo_url',  'Photo URL',           'url',          'Square headshot — 200×200 recommended.');
    $f('_hk_sp_linkedin',   'LinkedIn profile',    'url');
    $f('_hk_sp_instagram',  'Instagram profile',   'url');
    $f('_hk_sp_week',       'Week tag (YYYY-Www)', 'text',         'e.g. 2026-W18 — controls which week this person is featured.');
    $f('_hk_sp_featured',   'Featured this week?', 'text',         'Type "yes" to feature on homepage.');
    $f('_hk_sp_quote',      'Short quote',         'textarea');
}
add_action('save_post_hk_sponsor', 'hk_sponsor_save', 10, 2);
function hk_sponsor_save($post_id, $post) {
    if (!isset($_POST['hk_sponsor_nonce']) || !wp_verify_nonce($_POST['hk_sponsor_nonce'], 'hk_sponsor_save')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;
    $keys = ['_hk_sp_role', '_hk_sp_amount', '_hk_sp_photo_url', '_hk_sp_linkedin', '_hk_sp_instagram', '_hk_sp_week', '_hk_sp_featured', '_hk_sp_quote'];
    foreach ($keys as $k) {
        if (!array_key_exists($k, $_POST)) continue;
        $val = $_POST[$k];
        if (in_array($k, ['_hk_sp_photo_url', '_hk_sp_linkedin', '_hk_sp_instagram'], true)) {
            $val = esc_url_raw($val);
        } elseif ($k === '_hk_sp_amount') {
            $val = (float) $val;
        } elseif ($k === '_hk_sp_quote') {
            $val = wp_kses_post($val);
        } else {
            $val = sanitize_text_field($val);
        }
        update_post_meta($post_id, $k, $val);
    }
}

// ============================================================================
// 9.  REST routes — wallet, sponsors, badges, coupons
// ============================================================================

add_action('rest_api_init', 'hk_extras_register_rest');
function hk_extras_register_rest() {
    $ns = 'hackknow/v1';

    register_rest_route($ns, '/wallet/me', [
        'methods'  => 'GET',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback' => 'hk_rest_wallet_me',
    ]);
    register_rest_route($ns, '/wallet/transactions', [
        'methods'  => 'GET',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback' => 'hk_rest_wallet_tx',
    ]);
    register_rest_route($ns, '/wallet/recharge', [
        'methods'  => 'POST',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback' => 'hk_rest_wallet_recharge',
    ]);
    register_rest_route($ns, '/wallet/bonus-quote', [
        'methods'  => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'hk_rest_wallet_bonus_quote',
    ]);

    register_rest_route($ns, '/badges/me', [
        'methods'  => 'GET',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback' => 'hk_rest_badges_me',
    ]);
    register_rest_route($ns, '/badges/tiers', [
        'methods'  => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function () { return ['tiers' => hk_extras_get_badge_tiers()]; },
    ]);

    register_rest_route($ns, '/coupons/me', [
        'methods'  => 'GET',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback' => 'hk_rest_coupons_me',
    ]);

    register_rest_route($ns, '/sponsors/top', [
        'methods'  => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'hk_rest_sponsors_top',
    ]);
}

function hk_rest_wallet_me() {
    $u = wp_get_current_user();
    return [
        'user_id'        => (int) $u->ID,
        'balance'        => (float) get_user_meta($u->ID, HK_USER_META_BALANCE, true),
        'lifetime_spend' => (float) get_user_meta($u->ID, HK_USER_META_LIFETIME, true),
        'badge'          => (string) get_user_meta($u->ID, HK_USER_META_BADGE, true),
        'currency'       => 'INR',
        'withdrawable'   => false,
    ];
}
function hk_rest_wallet_tx(WP_REST_Request $req) {
    global $wpdb;
    $u    = wp_get_current_user();
    $page = max(1, (int) $req->get_param('page'));
    $per  = max(1, min(100, (int) ($req->get_param('per') ?: 20)));
    $off  = ($page - 1) * $per;
    $t    = $wpdb->prefix . HK_WALLET_TABLE;
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT id, amount, balance_after, type, ref, note, created_at
           FROM {$t} WHERE user_id = %d ORDER BY id DESC LIMIT %d OFFSET %d",
        $u->ID, $per, $off
    ), ARRAY_A);
    return ['transactions' => $rows ?: [], 'page' => $page, 'per' => $per];
}
function hk_rest_wallet_bonus_quote(WP_REST_Request $req) {
    $amount = (float) $req->get_param('amount');
    return [
        'pay'         => $amount,
        'bonus'       => hk_wallet_bonus_for($amount),
        'all_rules'   => hk_extras_get_bonus_rules(),
        'currency'    => 'INR',
    ];
}
/**
 * Razorpay-verified recharge.  Body: { razorpay_payment_id, razorpay_order_id,
 * razorpay_signature, amount }.  Verifies HMAC against RAZORPAY_KEY_SECRET env.
 */
function hk_rest_wallet_recharge(WP_REST_Request $req) {
    $u   = wp_get_current_user();
    $b   = $req->get_json_params() ?: [];
    $pid = sanitize_text_field($b['razorpay_payment_id'] ?? '');
    $oid = sanitize_text_field($b['razorpay_order_id']   ?? '');
    $sig = sanitize_text_field($b['razorpay_signature']  ?? '');
    $amt = (float) ($b['amount'] ?? 0);
    if (!$pid || !$oid || !$sig || $amt <= 0) return new WP_Error('hk_bad_input', 'Missing fields', ['status' => 400]);

    $secret = getenv('RAZORPAY_KEY_SECRET');
    if (!$secret && defined('RAZORPAY_KEY_SECRET')) $secret = RAZORPAY_KEY_SECRET;
    if (!$secret) return new WP_Error('hk_no_secret', 'Razorpay secret not configured', ['status' => 500]);

    $expected = hash_hmac('sha256', $oid . '|' . $pid, $secret);
    if (!hash_equals($expected, $sig)) return new WP_Error('hk_sig', 'Signature mismatch', ['status' => 400]);

    $r = hk_wallet_credit_recharge($u->ID, $amt, $pid);
    if (is_wp_error($r)) return $r;
    return [
        'ok'      => true,
        'balance' => (float) get_user_meta($u->ID, HK_USER_META_BALANCE, true),
        'bonus'   => (float) ($r['bonus'] ?? 0),
        'duplicate' => !empty($r['duplicate']),
    ];
}
function hk_rest_badges_me() {
    $u = wp_get_current_user();
    return [
        'badge'          => (string) get_user_meta($u->ID, HK_USER_META_BADGE, true),
        'lifetime_spend' => (float)  get_user_meta($u->ID, HK_USER_META_LIFETIME, true),
        'tiers'          => hk_extras_get_badge_tiers(),
    ];
}
function hk_rest_coupons_me() {
    $u = wp_get_current_user();
    $reward = get_user_meta($u->ID, HK_USER_META_REWARD_GRANT, true);
    return [
        'reward'   => $reward ?: null,
        'threshold'=> hk_extras_get_reward_threshold(),
        'lifetime' => (float) get_user_meta($u->ID, HK_USER_META_LIFETIME, true),
    ];
}
function hk_rest_sponsors_top(WP_REST_Request $req) {
    $week = sanitize_text_field($req->get_param('week') ?: '');
    $args = [
        'post_type'      => 'hk_sponsor',
        'post_status'    => 'publish',
        'posts_per_page' => 30,
        'meta_query'     => [['key' => '_hk_sp_featured', 'value' => 'yes', 'compare' => '=']],
    ];
    if ($week) $args['meta_query'][] = ['key' => '_hk_sp_week', 'value' => $week];
    $posts = get_posts($args);
    $by_role = ['sponsor' => [], 'community' => []];
    foreach ($posts as $p) {
        $role = get_post_meta($p->ID, '_hk_sp_role', true) ?: 'sponsor';
        if (!isset($by_role[$role])) continue;
        $by_role[$role][] = [
            'id'        => $p->ID,
            'name'      => get_the_title($p),
            'amount'    => (float) get_post_meta($p->ID, '_hk_sp_amount', true),
            'photo'     => esc_url_raw(get_post_meta($p->ID, '_hk_sp_photo_url', true)),
            'linkedin'  => esc_url_raw(get_post_meta($p->ID, '_hk_sp_linkedin', true)),
            'instagram' => esc_url_raw(get_post_meta($p->ID, '_hk_sp_instagram', true)),
            'quote'     => wp_kses_post(get_post_meta($p->ID, '_hk_sp_quote', true)),
            'week'      => get_post_meta($p->ID, '_hk_sp_week', true),
        ];
    }
    foreach ($by_role as $role => &$arr) {
        usort($arr, function ($a, $b) { return ($b['amount'] ?? 0) <=> ($a['amount'] ?? 0); });
        $arr = array_slice($arr, 0, 3);
    }
    return ['sponsors' => $by_role['sponsor'], 'community' => $by_role['community']];
}

// ============================================================================
// 10.  Admin pages — settings UI for wallet, badges, reward
// ============================================================================

add_action('admin_menu', 'hk_extras_admin_menu', 20);
function hk_extras_admin_menu() {
    if (!menu_page_url('hk_root', false)) {
        // Defensive: if hackknow-content.php hasn't yet registered the parent, register a minimal one
        add_menu_page('HackKnow', 'HackKnow', 'manage_options', 'hk_root', 'hk_extras_root_page', 'dashicons-shield-alt', 26);
    }
    add_submenu_page('hk_root', 'Wallet & Bonuses', 'Wallet & Bonuses',  'manage_options', 'hk_wallet',   'hk_extras_wallet_page');
    add_submenu_page('hk_root', 'Badges',           'Badges',            'manage_options', 'hk_badges',   'hk_extras_badges_page');
    add_submenu_page('hk_root', 'Reward Coupon',    'Reward Coupon',     'manage_options', 'hk_reward',   'hk_extras_reward_page');
    add_submenu_page('hk_root', 'Recharge Log',     'Recharge Log',      'manage_options', 'hk_recharges','hk_extras_recharges_page');
}
function hk_extras_root_page() {
    echo '<div class="wrap"><h1>HackKnow</h1><p>Welcome — pick a section from the left.</p></div>';
}
function hk_extras_wallet_page() {
    if (!current_user_can('manage_options')) return;
    if (!empty($_POST['hk_wallet_save']) && check_admin_referer('hk_wallet_save')) {
        $rules = [];
        $pays  = $_POST['pay']   ?? [];
        $bonus = $_POST['bonus'] ?? [];
        for ($i = 0; $i < count($pays); $i++) {
            $p = (float) $pays[$i]; $b = (float) ($bonus[$i] ?? 0);
            if ($p > 0) $rules[] = ['pay' => $p, 'bonus' => $b];
        }
        update_option(HK_OPT_WALLET_BONUS, $rules);
        echo '<div class="notice notice-success"><p>Saved.</p></div>';
    }
    $rules = hk_extras_get_bonus_rules();
    while (count($rules) < 6) $rules[] = ['pay' => '', 'bonus' => ''];
    echo '<div class="wrap"><h1>Wallet recharge bonuses</h1>';
    echo '<form method="post">';
    wp_nonce_field('hk_wallet_save');
    echo '<table class="widefat striped" style="max-width:600px"><thead><tr><th>Pay (₹)</th><th>Get bonus (₹)</th></tr></thead><tbody>';
    foreach ($rules as $r) {
        $p = esc_attr($r['pay']); $b = esc_attr($r['bonus']);
        echo "<tr><td><input type='number' step='1' name='pay[]'   value='{$p}' style='width:140px' /></td>";
        echo     "<td><input type='number' step='1' name='bonus[]' value='{$b}' style='width:140px' /></td></tr>";
    }
    echo '</tbody></table>';
    echo '<p><button class="button button-primary" name="hk_wallet_save" value="1">Save bonus rules</button></p>';
    echo '</form><p><em>Wallet balance is non-withdrawable. Mention this in your Terms & Conditions.</em></p></div>';
}
function hk_extras_badges_page() {
    if (!current_user_can('manage_options')) return;
    if (!empty($_POST['hk_badges_save']) && check_admin_referer('hk_badges_save')) {
        $tiers = [];
        $names = $_POST['tier'] ?? [];
        $mins  = $_POST['min']  ?? [];
        for ($i = 0; $i < count($names); $i++) {
            $n = sanitize_text_field($names[$i]); $m = (float) ($mins[$i] ?? 0);
            if ($n) $tiers[] = ['tier' => $n, 'min' => $m];
        }
        update_option(HK_OPT_BADGE_TIERS, $tiers);
        echo '<div class="notice notice-success"><p>Saved.</p></div>';
    }
    $tiers = hk_extras_get_badge_tiers();
    while (count($tiers) < 8) $tiers[] = ['tier' => '', 'min' => ''];
    echo '<div class="wrap"><h1>Badge tiers</h1>';
    echo '<p>Lifetime spend (orders + recharges) controls a user&rsquo;s badge.  Highest qualifying tier wins.</p>';
    echo '<form method="post">';
    wp_nonce_field('hk_badges_save');
    echo '<table class="widefat striped" style="max-width:600px"><thead><tr><th>Tier name</th><th>Min lifetime ₹</th></tr></thead><tbody>';
    foreach ($tiers as $t) {
        $n = esc_attr($t['tier']); $m = esc_attr($t['min']);
        echo "<tr><td><input type='text' name='tier[]' value='{$n}' style='width:220px' /></td>";
        echo     "<td><input type='number' step='1' name='min[]' value='{$m}' style='width:140px' /></td></tr>";
    }
    echo '</tbody></table>';
    echo '<p><button class="button button-primary" name="hk_badges_save" value="1">Save tiers</button></p>';
    echo '</form></div>';
}
function hk_extras_reward_page() {
    if (!current_user_can('manage_options')) return;
    if (!empty($_POST['hk_reward_save']) && check_admin_referer('hk_reward_save')) {
        update_option(HK_OPT_REWARD_THRESHOLD, max(1, (int) $_POST['threshold']));
        echo '<div class="notice notice-success"><p>Saved.</p></div>';
    }
    $t = hk_extras_get_reward_threshold();
    echo '<div class="wrap"><h1>Reward coupon</h1>';
    echo '<p>When a user&rsquo;s lifetime spend (orders + wallet recharges) crosses the threshold below, one personal 100%-off coupon is auto-issued (max 20 uses, single coupon code).</p>';
    echo '<form method="post">';
    wp_nonce_field('hk_reward_save');
    echo '<p><label>Lifetime spend threshold (₹) <input type="number" min="1" name="threshold" value="' . esc_attr($t) . '" /></label></p>';
    echo '<p><button class="button button-primary" name="hk_reward_save" value="1">Save</button></p>';
    echo '</form></div>';
}
function hk_extras_recharges_page() {
    global $wpdb;
    if (!current_user_can('manage_options')) return;
    $t   = $wpdb->prefix . HK_WALLET_TABLE;
    $rows = $wpdb->get_results("SELECT id, user_id, amount, balance_after, type, ref, note, created_at FROM {$t} ORDER BY id DESC LIMIT 200");
    echo '<div class="wrap"><h1>Wallet ledger (last 200)</h1>';
    if (!$rows) { echo '<p>No transactions yet.</p></div>'; return; }
    echo '<table class="widefat striped"><thead><tr><th>ID</th><th>When</th><th>User</th><th>Type</th><th>Amount</th><th>Balance after</th><th>Ref</th><th>Note</th></tr></thead><tbody>';
    foreach ($rows as $r) {
        $u = get_userdata($r->user_id);
        $name = $u ? esc_html($u->user_email) : '#' . (int) $r->user_id;
        echo '<tr>';
        echo '<td>' . (int) $r->id . '</td>';
        echo '<td>' . esc_html($r->created_at) . '</td>';
        echo '<td>' . $name . '</td>';
        echo '<td>' . esc_html($r->type) . '</td>';
        echo '<td>₹' . number_format((float) $r->amount, 2) . '</td>';
        echo '<td>₹' . number_format((float) $r->balance_after, 2) . '</td>';
        echo '<td>' . esc_html($r->ref) . '</td>';
        echo '<td>' . esc_html($r->note) . '</td>';
        echo '</tr>';
    }
    echo '</tbody></table></div>';
}
