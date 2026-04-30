<?php
/**
 * Plugin Name: HackKnow Content Seed v5 (Preview cat fix)
 * Description: Restrict Live Preview button to Website Templates cats only (drop MIS cats).
 *              Clears _hk_preview_url from MIS sample. Seeds new sample product in
 *              `website-templates` cat WITH Live Preview enabled.
 *              Idempotent via option `hk_seed_v5_done`.
 * Version:     5.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ============================================================
 * 1) FILTER: Remove MIS cats from Live Preview eligibility.
 *    Always active (not idempotent — runs on every request).
 * ============================================================ */
add_filter( 'hk_preview_target_cat_slugs', 'hk_v5_preview_targets', 20 );
function hk_v5_preview_targets( $slugs ) {
    $allowed = [
        'website-templates',
        'custom-website-templates',
        'hackknow-premium',
        /* Sub-cats of website-templates */
        'html-templates',
        'wordpress-templates',
        'react-templates',
        'angular-templates',
        'vite-templates',
        'php-templates',
        'node-js-templates',
        'vercel-templates',
        'netlify-templates',
    ];
    /* Reject MIS cats explicitly */
    return array_values( array_diff( $allowed, [ 'mis-dashboards-templates', 'mis-custom-dashboards' ] ) );
}

/* ============================================================
 * 2) ONE-SHOT SEED — clear MIS preview + add Website Template sample
 * ============================================================ */
add_action( 'wp_loaded', 'hk_seed_v5_run', 60 );

function hk_seed_v5_run() {
    if ( get_option( 'hk_seed_v5_done' ) ) return;

    $summary = [ 'mis_cleared' => 0, 'web_seeded' => 0, 'started' => time() ];

    /* --- Step A: Remove preview meta from existing MIS sample --- */
    $mis_sample = get_page_by_path( 'sample-sales-dashboard-template', OBJECT, 'product' );
    if ( $mis_sample ) {
        delete_post_meta( $mis_sample->ID, '_hk_preview_url' );
        delete_post_meta( $mis_sample->ID, '_hk_preview_open_in' );
        $summary['mis_cleared'] = 1;
    }

    /* --- Step B: Seed sample WC product in `website-templates` cat --- */
    if ( class_exists( 'WC_Product_Simple' ) ) {
        $slug = 'sample-website-template-demo';
        $existing = get_page_by_path( $slug, OBJECT, 'product' );
        $product_id = $existing ? $existing->ID : 0;

        if ( ! $product_id ) {
            $p = new WC_Product_Simple();
            $p->set_name( 'Sample: Modern Landing Page Template (Demo)' );
            $p->set_slug( $slug );
            $p->set_status( 'publish' );
            $p->set_catalog_visibility( 'visible' );
            $p->set_description(
                "<h3>Modern Landing Page — Responsive HTML Template</h3>" .
                "<p>Yeh ek <strong>sample / demo</strong> Website Template hai. Click <em>Live Preview</em> button to see the live demo open karein.</p>" .
                "<ul>" .
                "<li>100% responsive (mobile/tablet/desktop)</li>" .
                "<li>Pure HTML/CSS/JS — koi build step nahi</li>" .
                "<li>SEO ready (semantic markup, OG tags)</li>" .
                "<li>Easy customization — colors, fonts, sections</li>" .
                "</ul>" .
                "<p><strong>Format:</strong> HTML5 + CSS3 + Vanilla JS | <strong>License:</strong> Personal / Commercial | <strong>Support:</strong> 30 days</p>"
            );
            $p->set_short_description( 'Modern responsive landing page template. Click Live Preview to try the demo.' );
            $p->set_regular_price( '799' );
            $p->set_sale_price( '79' );
            $p->set_virtual( true );

            /* Categories: parent "Website Templates" + sub "HTML Templates" */
            $cat_ids = [];
            foreach ( [ 'website-templates', 'html-templates' ] as $sl ) {
                $t = get_term_by( 'slug', $sl, 'product_cat' );
                if ( $t && ! is_wp_error( $t ) ) $cat_ids[] = (int) $t->term_id;
            }
            if ( $cat_ids ) $p->set_category_ids( $cat_ids );

            $product_id = $p->save();
        }

        if ( $product_id ) {
            /* Live Preview meta — opens in NEW TAB (safer default for cross-origin demos) */
            update_post_meta( $product_id, '_hk_preview_url', 'https://html5up.net/uploads/demos/parallelism/' );
            update_post_meta( $product_id, '_hk_preview_open_in', 'newtab' );
            update_post_meta( $product_id, '_hk_seed_v5', '1' );
            $summary['web_seeded'] = 1;
            $summary['product_id'] = $product_id;
        }
    }

    $summary['finished'] = time();
    update_option( 'hk_seed_v5_done', time() );
    update_option( 'hk_seed_v5_summary', $summary );
}
