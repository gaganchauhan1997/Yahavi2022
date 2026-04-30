<?php
/**
 * Plugin Name: HackKnow Content Seed v6 (Digital Marketing 3-level + sample PDF/Tool)
 * Description: Creates Digital Marketing parent cat → 7 sub-cats → sub-sub-cats (incl. Tools).
 *              Seeds 1 sample PDF (downloadable) + 1 sample Tool (external link) product.
 *              Idempotent. Cat-tree always ensured; product seed only on admin-triggered ?seed_v6=1.
 * Version:     6.1
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ============================================================
 * CAT TREE — runs idempotently on init (lightweight, no WC deps).
 * ============================================================ */
add_action( 'init', 'hk_seed_v6_cats', 50 );

function hk_seed_v6_ensure_term( $name, $slug, $parent_id = 0 ) {
    $existing = get_term_by( 'slug', $slug, 'product_cat' );
    if ( $existing && ! is_wp_error( $existing ) ) {
        if ( $parent_id && (int) $existing->parent !== (int) $parent_id ) {
            wp_update_term( $existing->term_id, 'product_cat', [ 'parent' => $parent_id ] );
        }
        return (int) $existing->term_id;
    }
    $r = wp_insert_term( $name, 'product_cat', [ 'slug' => $slug, 'parent' => $parent_id ] );
    if ( is_wp_error( $r ) ) return 0;
    return (int) $r['term_id'];
}

function hk_seed_v6_tree_def() {
    return [
        'digital-marketing' => [
            'name' => 'Digital Marketing',
            'children' => [
                'dm-strategy' => [
                    'name' => 'Strategy',
                    'children' => [
                        'dm-strategy-frameworks' => 'Frameworks (PDFs)',
                        'dm-strategy-templates'  => 'Templates (PDFs)',
                        'dm-strategy-playbooks'  => 'Playbooks (PDFs)',
                        'dm-strategy-tools'      => 'Tools (Links)',
                    ],
                ],
                'dm-seo' => [
                    'name' => 'SEO',
                    'children' => [
                        'dm-seo-onpage'  => 'On-Page SEO (PDFs)',
                        'dm-seo-offpage' => 'Off-Page SEO (PDFs)',
                        'dm-seo-audits'  => 'SEO Audits (PDFs)',
                        'dm-seo-tools'   => 'SEO Tools (Links)',
                    ],
                ],
                'dm-social' => [
                    'name' => 'Social Media',
                    'children' => [
                        'dm-social-instagram' => 'Instagram (PDFs)',
                        'dm-social-linkedin'  => 'LinkedIn (PDFs)',
                        'dm-social-tiktok'    => 'TikTok / Reels (PDFs)',
                        'dm-social-twitter'   => 'Twitter / X (PDFs)',
                        'dm-social-tools'     => 'Social Tools (Links)',
                    ],
                ],
                'dm-email' => [
                    'name' => 'Email Marketing',
                    'children' => [
                        'dm-email-templates' => 'Email Templates (PDFs)',
                        'dm-email-funnels'   => 'Funnels (PDFs)',
                        'dm-email-tools'     => 'Email Tools (Links)',
                    ],
                ],
                'dm-paidads' => [
                    'name' => 'Paid Ads',
                    'children' => [
                        'dm-paidads-google'   => 'Google Ads (PDFs)',
                        'dm-paidads-meta'     => 'Meta Ads (PDFs)',
                        'dm-paidads-linkedin' => 'LinkedIn Ads (PDFs)',
                        'dm-paidads-tools'    => 'Ad Tools (Links)',
                    ],
                ],
                'dm-content' => [
                    'name' => 'Content Marketing',
                    'children' => [
                        'dm-content-blog'   => 'Blog Writing (PDFs)',
                        'dm-content-video'  => 'Video Scripts (PDFs)',
                        'dm-content-tools'  => 'Content Tools (Links)',
                    ],
                ],
                'dm-analytics' => [
                    'name' => 'Analytics',
                    'children' => [
                        'dm-analytics-ga4'    => 'GA4 (PDFs)',
                        'dm-analytics-gtm'    => 'GTM (PDFs)',
                        'dm-analytics-tools'  => 'Analytics Tools (Links)',
                    ],
                ],
            ],
        ],
    ];
}

function hk_seed_v6_cats() {
    if ( get_option( 'hk_seed_v6_cats_done' ) ) return;
    if ( ! taxonomy_exists( 'product_cat' ) ) return; /* WC not loaded yet */

    $tree = hk_seed_v6_tree_def();
    $ids  = [];
    foreach ( $tree as $p_slug => $p_data ) {
        $pid = hk_seed_v6_ensure_term( $p_data['name'], $p_slug, 0 );
        $ids[ $p_slug ] = $pid;
        foreach ( $p_data['children'] as $c_slug => $c_data ) {
            $c_name = is_array( $c_data ) ? $c_data['name'] : $c_data;
            $cid = hk_seed_v6_ensure_term( $c_name, $c_slug, $pid );
            $ids[ $c_slug ] = $cid;
            if ( is_array( $c_data ) && isset( $c_data['children'] ) ) {
                foreach ( $c_data['children'] as $gc_slug => $gc_name ) {
                    $gcid = hk_seed_v6_ensure_term( $gc_name, $gc_slug, $cid );
                    $ids[ $gc_slug ] = $gcid;
                }
            }
        }
    }
    update_option( 'hk_seed_v6_cats_done', time() );
    update_option( 'hk_seed_v6_cat_ids', $ids );
}

/* ============================================================
 * PRODUCT SEED — admin-triggered only, guarded against missing WC classes.
 * Trigger: visit /?seed_v6_products=1 while logged in as admin (or set HK_SEED_FORCE constant).
 * ============================================================ */
add_action( 'wp_loaded', 'hk_seed_v6_products', 90 );

function hk_seed_v6_products() {
    update_option( 'hk_seed_v6_canary', time() ); /* DEBUG: prove function fired */
    if ( get_option( 'hk_seed_v6_products_done_v3' ) ) return;

    /* Gate: only on explicit trigger or admin */
    $forced = isset( $_GET['seed_v6_products'] );
    $is_admin = function_exists( 'current_user_can' ) && current_user_can( 'manage_options' );
    if ( ! $forced && ! $is_admin ) return;

    /* Hard guards — WC must be fully loaded */
    if ( ! class_exists( 'WC_Product_Simple' ) ) return;
    if ( ! function_exists( 'wc_get_product_object' ) ) return;

    $cat_ids = get_option( 'hk_seed_v6_cat_ids', [] );
    if ( ! is_array( $cat_ids ) || empty( $cat_ids['digital-marketing'] ) ) return;

    $log = [];

    /* --- Sample PDF product --- */
    try {
        $pdf_slug = 'sample-dm-strategy-framework-pdf';
        if ( ! get_page_by_path( $pdf_slug, OBJECT, 'product' ) ) {
            $p = new WC_Product_Simple();
            $p->set_name( 'Sample: Digital Marketing Strategy Framework 2026 (PDF)' );
            $p->set_slug( $pdf_slug );
            $p->set_status( 'publish' );
            $p->set_catalog_visibility( 'visible' );
            $p->set_description(
                "<h3>Digital Marketing Strategy Framework 2026 — 24-page PDF</h3>" .
                "<p>SAMPLE downloadable PDF product. Real PDFs add karne ka format yahi hai:</p>" .
                "<ol><li>Add Product → Simple → check Virtual + Downloadable</li>" .
                "<li>Downloadable files section me PDF upload karein</li>" .
                "<li>Category: Digital Marketing → Strategy → Frameworks (PDFs)</li></ol>" .
                "<h4>Inside this PDF:</h4>" .
                "<ul><li>STP framework</li><li>SOSTAC template</li><li>RACE growth model</li><li>OKR template</li></ul>"
            );
            $p->set_short_description( 'Sample PDF product. 24-page strategy framework.' );
            $p->set_regular_price( '199' );
            $p->set_sale_price( '49' );
            $p->set_virtual( true );
            $p->set_downloadable( true );
            /* NOTE: Sample skips set_downloads() — admin will upload real PDF via Product editor.
             * WC rejects set_file() if the file doesn't physically exist on disk. */
            $p->set_download_limit( -1 );
            $p->set_download_expiry( -1 );

            $cats = array_filter( [
                $cat_ids['digital-marketing']      ?? 0,
                $cat_ids['dm-strategy']            ?? 0,
                $cat_ids['dm-strategy-frameworks'] ?? 0,
            ] );
            if ( $cats ) $p->set_category_ids( $cats );
            $pid = $p->save();
            $log['pdf_id'] = $pid;
        } else {
            $log['pdf_skip'] = 'exists';
        }
    } catch ( Throwable $e ) {
        $log['pdf_err'] = $e->getMessage();
    }

    /* --- Sample External/Tool product --- */
    try {
        $tool_slug = 'sample-dm-strategy-tool-link';
        if ( ! get_page_by_path( $tool_slug, OBJECT, 'product' ) ) {
            $p2 = wc_get_product_object( 'external' );
            if ( $p2 ) {
                $p2->set_name( 'Sample: Free Marketing Strategy Canvas Tool (Link)' );
                $p2->set_slug( $tool_slug );
                $p2->set_status( 'publish' );
                $p2->set_catalog_visibility( 'visible' );
                $p2->set_description(
                    "<h3>Marketing Strategy Canvas — Online Tool</h3>" .
                    "<p>SAMPLE External/Affiliate product. Tools jo external sites pe rehte hain, aise add karein:</p>" .
                    "<ol><li>Add Product → Type: External/Affiliate</li>" .
                    "<li>Product URL: external tool ka direct link</li>" .
                    "<li>Button text: 'Open Tool'</li>" .
                    "<li>Category: Digital Marketing → [section] → Tools (Links)</li></ol>"
                );
                $p2->set_short_description( 'Sample external tool product. Click Open Tool to launch.' );
                $p2->set_regular_price( '0' );
                if ( method_exists( $p2, 'set_product_url' ) ) {
                    $p2->set_product_url( 'https://www.canva.com/templates/?query=marketing-strategy' );
                }
                if ( method_exists( $p2, 'set_button_text' ) ) {
                    $p2->set_button_text( 'Open Tool' );
                }

                $cats2 = array_filter( [
                    $cat_ids['digital-marketing']    ?? 0,
                    $cat_ids['dm-strategy']          ?? 0,
                    $cat_ids['dm-strategy-tools']    ?? 0,
                ] );
                if ( $cats2 ) $p2->set_category_ids( $cats2 );
                $tid = $p2->save();
                $log['tool_id'] = $tid;
            } else {
                $log['tool_err'] = 'wc_get_product_object(external) returned null';
            }
        } else {
            $log['tool_skip'] = 'exists';
        }
    } catch ( Throwable $e ) {
        $log['tool_err'] = $e->getMessage();
    }

    update_option( 'hk_seed_v6_products_done_v3', time() );
    update_option( 'hk_seed_v6_products_log_v3', $log );
}

/* Diagnostic REST endpoint — public read of seed status */
add_action( 'rest_api_init', function() {
    register_rest_route( 'hackknow/v1', '/seed-v6/status', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function() {
            return [
                'cats_done'     => (int) get_option( 'hk_seed_v6_cats_done' ),
                'products_done' => (int) get_option( 'hk_seed_v6_products_done_v3' ),
                'canary'        => (int) get_option( 'hk_seed_v6_canary' ),
                'cat_count'     => is_array( get_option( 'hk_seed_v6_cat_ids' ) ) ? count( get_option( 'hk_seed_v6_cat_ids' ) ) : 0,
                'cat_dm_id'     => (int) ( ( get_option( 'hk_seed_v6_cat_ids' ) ?: [] )['digital-marketing'] ?? 0 ),
                'log'           => get_option( 'hk_seed_v6_products_log_v3', [] ),
                'log_v2'        => get_option( 'hk_seed_v6_products_log_v2', [] ),
                'log_v1'        => get_option( 'hk_seed_v6_products_log', [] ),
            ];
        },
    ] );
} );
