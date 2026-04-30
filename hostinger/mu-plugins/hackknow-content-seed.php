<?php
/**
 * Plugin Name: HackKnow Content Seed
 * Description: Auto-creates the "MIS, Dashboards & Templates" product category, the
 *   "Courses" parent + 8 tech sub-categories (Python / Java / WordPress / PHP /
 *   Node.js / Vercel / Netlify / AI Infrastructure), and the two member-only
 *   discount coupons (MIS90 and STUDENT6FREE). Idempotent — runs once and
 *   records a flag in wp_options. Re-running is safe; existing terms/coupons
 *   are reused.
 *
 * @package HackKnow
 */

if (!defined('ABSPATH')) exit;

/**
 * Main seeder. Hooked on `woocommerce_init` so WooCommerce APIs are guaranteed
 * to be loaded. Idempotent via the `hk_content_seed_v1_done` option.
 */
add_action('wp_loaded', 'hk_content_seed_v2', 20);
function hk_content_seed_v2() {
    // Force-rerun via ?hk_reseed=1 (admin only).
    $force = isset($_GET['hk_reseed']) && current_user_can('manage_options');
    if (!$force && get_option('hk_content_seed_v2_done')) return;
    if (!taxonomy_exists('product_cat')) return;
    if (!class_exists('WC_Coupon'))      return;

    /* ── 1. "MIS, Dashboards & Templates" top-level WC category ── */
    $mis_id = hk_ensure_term(
        'MIS, Dashboards & Templates',
        'mis-dashboards-templates',
        'product_cat',
        0,
        'Excel · Power BI · Tableau dashboards and data-analyst templates. Verified MIS / Data Analyst users get 90% off (apply via /verify).'
    );

    /* ── 2. "Courses" parent + 8 sub-categories ── */
    $courses_parent = hk_ensure_term(
        'Courses',
        'courses',
        'product_cat',
        0,
        'HackKnow learning tracks. Verified students get 6 months free access (apply via /verify).'
    );

    $sub_cats = [
        ['Python',             'python',             'Beginner to advanced Python — scripting, web, data, and ML.'],
        ['Java',               'java',               'Core Java, Spring Boot, microservices, and enterprise patterns.'],
        ['WordPress',          'wordpress',          'WordPress themes, plugins, WooCommerce, and headless WP.'],
        ['PHP',                'php',                'Modern PHP 8, Laravel, REST APIs, and clean architecture.'],
        ['Node.js',            'nodejs',             'Node.js, Express, real-time apps, and TypeScript on the server.'],
        ['Vercel',             'vercel',             'Vercel deployments, edge functions, Next.js, and serverless.'],
        ['Netlify',            'netlify',            'Netlify deployments, serverless functions, and JAMstack.'],
        ['AI Infrastructure',  'ai-infrastructure',  'LLM serving, vector databases, RAG pipelines, and model ops.'],
    ];
    $sub_ids = [];
    foreach ($sub_cats as [$name, $slug, $desc]) {
        $sub_ids[$slug] = hk_ensure_term($name, $slug, 'product_cat', $courses_parent, $desc);
    }

    /* ── 3. Coupons ── */
    hk_ensure_coupon('MIS90', [
        'discount_type'      => 'percent',
        'amount'             => '90',
        'product_categories' => [$mis_id],
        'individual_use'     => true,
        'description'        => 'Verified MIS / Data Analyst discount — 90% off MIS, Dashboards & Templates. Auto-applied at checkout for users with approved verification.',
    ]);

    hk_ensure_coupon('STUDENT6FREE', [
        'discount_type'      => 'percent',
        'amount'             => '100',
        'product_categories' => array_values(array_filter([$courses_parent] + $sub_ids)),
        'individual_use'     => true,
        'description'        => 'Verified Student 6-month free access — 100% off all Courses. Auto-applied at checkout for verified students within their 6-month window.',
    ]);

    update_option('hk_content_seed_v2_done', time());
    update_option('hk_content_seed_v2_summary', [
        'mis_cat_id'     => $mis_id,
        'courses_cat_id' => $courses_parent,
        'sub_cat_ids'    => $sub_ids,
        'seeded_at'      => current_time('mysql'),
    ]);
}

/**
 * Insert a taxonomy term if it doesn't exist; if it does, normalise its
 * parent + description in place. Returns the term_id (0 on failure).
 */
function hk_ensure_term($name, $slug, $taxonomy, $parent_id, $description = '') {
    $existing = get_term_by('slug', $slug, $taxonomy);
    if ($existing && !is_wp_error($existing)) {
        wp_update_term($existing->term_id, $taxonomy, [
            'name'        => $name,
            'parent'      => (int) $parent_id,
            'description' => $description,
        ]);
        return (int) $existing->term_id;
    }
    $r = wp_insert_term($name, $taxonomy, [
        'slug'        => $slug,
        'parent'      => (int) $parent_id,
        'description' => $description,
    ]);
    if (is_wp_error($r)) return 0;
    return (int) $r['term_id'];
}

/**
 * Create a WooCommerce coupon if its code isn't already taken. Reuses the
 * existing coupon (returning its ID) when a match is found.
 */
function hk_ensure_coupon($code, $args) {
    $existing_id = function_exists('wc_get_coupon_id_by_code')
        ? wc_get_coupon_id_by_code($code)
        : 0;
    if ($existing_id) return $existing_id;

    $coupon = new WC_Coupon();
    $coupon->set_code($code);
    $coupon->set_discount_type($args['discount_type'] ?? 'percent');
    $coupon->set_amount((string) ($args['amount'] ?? '0'));
    if (!empty($args['product_categories'])) {
        $coupon->set_product_categories(array_map('intval', $args['product_categories']));
    }
    $coupon->set_individual_use(!empty($args['individual_use']));
    $coupon->set_usage_limit(0);
    $coupon->set_description((string) ($args['description'] ?? ''));
    // Members-only flag — used later by the verify/apply layer.
    $coupon->update_meta_data('_hk_members_only', 'yes');
    $coupon->save();
    return $coupon->get_id();
}
