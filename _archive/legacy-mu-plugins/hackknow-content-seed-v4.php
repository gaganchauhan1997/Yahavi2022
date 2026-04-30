<?php
/**
 * Plugin Name: HackKnow Content Seed v4
 * Description: One-shot seeder for WC "MIS Templates" cat + sample course + sample brainxercise + sample template product (with preview).
 *              Idempotent via option `hk_seed_v4b_done`. Re-run by admin via ?hk_reseed_v4b=1.
 *              Force fresh sample data with ?hk_reseed_v4b=force (admin only) to update existing seed posts.
 * Version:     4.0
 * Author:      HackKnow
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'wp_loaded', 'hk_seed_v4_run', 50 );

function hk_seed_v4_run() {
    $force = isset( $_GET['hk_reseed_v4b'] ) && current_user_can( 'manage_options' );
    if ( ! $force && get_option( 'hk_seed_v4b_done' ) ) return;

    $summary = [
        'wc_cats'   => 0,
        'wc_prods'  => 0,
        'courses'   => 0,
        'brainx'    => 0,
        'started'   => time(),
    ];

    /* ================================================================
     * 1) WC Categories — "MIS, Dashboards & Templates" parent + children
     * ================================================================ */
    if ( taxonomy_exists( 'product_cat' ) ) {
        $mis_parent = hk_v4_ensure_term(
            'MIS, Dashboards & Templates',
            'mis-dashboards-templates',
            'product_cat',
            0,
            'Premium Excel dashboards, MIS reports, and business templates. 90% off for verified MIS members.'
        );
        if ( $mis_parent ) $summary['wc_cats']++;

        $mis_children = [
            [ 'Sales Dashboards',         'sales-dashboards',         'Interactive sales dashboards with KPIs, funnels, and forecasts.' ],
            [ 'HR & Attendance MIS',      'hr-attendance-mis',        'HR templates: attendance, payroll, leave management, KPI scorecards.' ],
            [ 'Finance & Accounting',     'finance-accounting',       'P&L, balance sheets, cashflow, GST/TDS templates for SMBs.' ],
            [ 'Inventory & Operations',   'inventory-operations',     'Stock registers, warranty trackers, vendor MIS, ops dashboards.' ],
            [ 'Project Management',       'project-management-mis',   'Gantt charts, timelines, budget trackers, risk registers.' ],
            [ 'Marketing & Lead Gen',     'marketing-lead-gen',       'Lead trackers, campaign ROI, social media analytics dashboards.' ],
        ];
        foreach ( $mis_children as $c ) {
            if ( hk_v4_ensure_term( $c[0], $c[1], 'product_cat', $mis_parent ?: 0, $c[2] ) ) {
                $summary['wc_cats']++;
            }
        }
    }

    /* ================================================================
     * 2) Sample WC Product in MIS Templates (with Live Preview meta)
     * ================================================================ */
    if ( class_exists( 'WC_Product_Simple' ) ) {
        $sample_prod_slug = 'sample-sales-dashboard-template';
        $existing = get_page_by_path( $sample_prod_slug, OBJECT, 'product' );
        if ( ! $existing ) {
            $product = new WC_Product_Simple();
            $product->set_name( 'Sample: Sales Dashboard Template (Demo)' );
            $product->set_slug( $sample_prod_slug );
            $product->set_status( 'publish' );
            $product->set_catalog_visibility( 'visible' );
            $product->set_description(
                "<h3>Live Sales Dashboard for SMBs</h3>" .
                "<p>Yeh ek <strong>sample / demo template</strong> hai. Click <em>Live Preview</em> button to see the live demo.</p>" .
                "<ul><li>Interactive KPI cards (Revenue, MoM growth, top SKUs)</li>" .
                "<li>Pivot-driven sales funnel visualization</li>" .
                "<li>Region-wise heatmap + monthly trend charts</li>" .
                "<li>Auto-refresh on new data paste</li></ul>" .
                "<p><strong>Format:</strong> .xlsx (Excel 2016+) | <strong>Editable:</strong> Yes | <strong>Support:</strong> 30 days email</p>"
            );
            $product->set_short_description( 'Sample Sales Dashboard — interactive KPI cards, pivot funnels, regional heatmap. Click Live Preview to try.' );
            $product->set_regular_price( '999' );
            $product->set_sale_price( '99' );
            $product->set_virtual( true );
            $product->set_downloadable( false );

            $mis_term  = get_term_by( 'slug', 'mis-dashboards-templates', 'product_cat' );
            $sales_term = get_term_by( 'slug', 'sales-dashboards', 'product_cat' );
            $cat_ids = [];
            if ( $mis_term && ! is_wp_error( $mis_term ) )   $cat_ids[] = (int) $mis_term->term_id;
            if ( $sales_term && ! is_wp_error( $sales_term ) ) $cat_ids[] = (int) $sales_term->term_id;
            if ( $cat_ids ) $product->set_category_ids( $cat_ids );

            $product_id = $product->save();
            if ( $product_id ) {
                /* Live Preview meta — same keys hk_brainx_preview reads */
                update_post_meta( $product_id, '_hk_preview_url',
                    'https://docs.google.com/spreadsheets/d/1AsmK8R8wPjK4wZRlYwM6zRiXz1tHvCw1EJNKJ6tZK0w/edit?usp=sharing' );
                update_post_meta( $product_id, '_hk_preview_open_in', 'modal' );
                update_post_meta( $product_id, '_hk_seed_v4', '1' );
                $summary['wc_prods']++;
            }
        }
    }

    /* ================================================================
     * 3) Sample Course (hk_course CPT)
     * ================================================================ */
    if ( post_type_exists( 'hk_course' ) ) {
        $courses = [
            [
                'slug'   => 'sample-python-fastapi-fundamentals',
                'title'  => 'Sample: Python + FastAPI Fundamentals',
                'cat'    => 'python',
                'excerpt'=> 'Beginner-friendly Python + FastAPI course. Build a REST API + deploy to Render in 4 hours.',
                'meta'   => [
                    '_hk_course_level'           => 'beginner',
                    '_hk_course_duration_weeks'  => 4,
                    '_hk_course_hours_total'     => 16,
                    '_hk_course_price_inr'       => 0, /* free for verified students */
                    '_hk_course_video_intro'     => 'https://www.youtube.com/watch?v=tLKKmouUams',
                    '_hk_course_chapters'        => implode( "\n", [
                        'Setup: Python 3.12, venv, VS Code | 0.5 | Install Python 3.12 + create your first virtualenv',
                        'FastAPI hello world + auto docs | 0.75 | Spin up a FastAPI server, view auto Swagger UI',
                        'Path / query params, Pydantic models | 1.0 | Validate request inputs with Pydantic',
                        'SQLite + SQLAlchemy CRUD | 1.5 | Build a full CRUD API backed by SQLite',
                        'JWT auth + middleware | 1.25 | Protect routes with JSON Web Tokens',
                        'Deploy to Render (free) | 0.75 | Push to GitHub, deploy to Render free tier',
                    ] ),
                    '_hk_course_outcomes'        => implode( "\n", [
                        'Build production-ready REST APIs',
                        'Use Pydantic for validation',
                        'Implement JWT authentication',
                        'Deploy to free cloud (Render)',
                    ] ),
                    '_hk_course_requirements'    => implode( "\n", [
                        'Basic programming concepts (variables, loops, functions)',
                        'Laptop with 4GB+ RAM',
                        'Stable internet connection',
                    ] ),
                    '_hk_course_tools'           => 'Python 3.12, FastAPI, SQLAlchemy, VS Code, Postman',
                ],
            ],
            [
                'slug'   => 'sample-wordpress-headless-with-react',
                'title'  => 'Sample: Headless WordPress + React',
                'cat'    => 'wordpress',
                'excerpt'=> 'Use WordPress as a headless CMS, render with React. Full deployment to Hostinger + Vercel.',
                'meta'   => [
                    '_hk_course_level'           => 'intermediate',
                    '_hk_course_duration_weeks'  => 6,
                    '_hk_course_hours_total'     => 24,
                    '_hk_course_price_inr'       => 1499,
                    '_hk_course_chapters'        => implode( "\n", [
                        'WP REST API basics + auth | 1.0 | Application passwords, JWT plugin, custom endpoints',
                        'Custom post types + ACF | 1.5 | Model rich content with CPTs and Advanced Custom Fields',
                        'React + Vite frontend setup | 1.0 | Bootstrap a Vite + React app, Tailwind config',
                        'Fetching posts + dynamic routing | 1.5 | TanStack Query, react-router-dom 7',
                        'Deployment: WP on Hostinger, React on Vercel | 1.0 | DNS, SSL, env vars, CI',
                    ] ),
                    '_hk_course_outcomes'        => implode( "\n", [
                        'Decouple frontend from CMS',
                        'Use REST + GraphQL with WP',
                        'Deploy to production',
                    ] ),
                    '_hk_course_requirements'    => implode( "\n", [
                        'JavaScript fundamentals (ES2020+)',
                        'Comfortable with HTML/CSS',
                        'Basic command-line knowledge',
                    ] ),
                    '_hk_course_tools'           => 'WordPress, React, Vite, Hostinger, Vercel',
                ],
            ],
        ];

        foreach ( $courses as $c ) {
            $existing = get_page_by_path( $c['slug'], OBJECT, 'hk_course' );
            $post_id = $existing ? $existing->ID : 0;
            if ( ! $post_id ) {
                $post_id = wp_insert_post( [
                    'post_type'    => 'hk_course',
                    'post_status'  => 'publish',
                    'post_name'    => $c['slug'],
                    'post_title'   => $c['title'],
                    'post_excerpt' => $c['excerpt'],
                    'post_content' => $c['excerpt'],
                ], true );
                if ( is_wp_error( $post_id ) ) continue;
                $summary['courses']++;
            }
            foreach ( $c['meta'] as $k => $v ) update_post_meta( $post_id, $k, $v );
            update_post_meta( $post_id, '_hk_seed_v4', '1' );
            $term = get_term_by( 'slug', $c['cat'], 'hk_course_cat' );
            if ( $term && ! is_wp_error( $term ) ) {
                wp_set_object_terms( $post_id, [ (int) $term->term_id ], 'hk_course_cat', false );
            }
        }
    }

    /* ================================================================
     * 4) Sample Brainxercise Questions
     * ================================================================ */
    if ( post_type_exists( 'hk_brainx' ) ) {
        $brainx = [
            [
                'slug'   => 'sample-vlookup-basic',
                'title'  => 'VLOOKUP Basics: Find Employee Salary',
                'cat'    => 'vlookup',
                'sheet'  => [
                    'rows'  => 6,
                    'cols'  => 4,
                    'cells' => [
                        'A1' => 'EmpID',  'B1' => 'Name',    'C1' => 'Dept',     'D1' => 'Salary',
                        'A2' => 'E001',   'B2' => 'Aman',    'C2' => 'Sales',    'D2' => '45000',
                        'A3' => 'E002',   'B3' => 'Priya',   'C3' => 'HR',       'D3' => '52000',
                        'A4' => 'E003',   'B4' => 'Rahul',   'C4' => 'IT',       'D4' => '68000',
                        'A5' => 'E004',   'B5' => 'Sneha',   'C5' => 'Finance',  'D5' => '58000',
                    ],
                ],
                'expected' => [ 'F1' => '68000' ],
                'hint'     => "Use =VLOOKUP(\"E003\", A2:D5, 4, FALSE) — write the result in cell F1.",
                'question' => "Find Rahul ki salary (EmpID E003). Use VLOOKUP and put the answer in <strong>F1</strong>.",
                'difficulty' => 'easy',
                'time_limit' => 180,
            ],
            [
                'slug'   => 'sample-sumif-by-dept',
                'title'  => 'SUMIF: Total Salary by Department',
                'cat'    => 'formulas-sum-if-index-match',
                'sheet'  => [
                    'rows'  => 6,
                    'cols'  => 4,
                    'cells' => [
                        'A1' => 'Name',   'B1' => 'Dept',    'C1' => 'Salary',
                        'A2' => 'Aman',   'B2' => 'Sales',   'C2' => '45000',
                        'A3' => 'Priya',  'B3' => 'HR',      'C3' => '52000',
                        'A4' => 'Rahul',  'B4' => 'Sales',   'C4' => '68000',
                        'A5' => 'Sneha',  'B5' => 'HR',      'C5' => '58000',
                        'A6' => 'Vikas',  'B6' => 'Sales',   'C6' => '40000',
                    ],
                ],
                'expected' => [ 'E1' => '153000' ],
                'hint'     => "Use =SUMIF(B2:B6, \"Sales\", C2:C6) — write the answer in E1.",
                'question' => "Total salary for <strong>Sales</strong> department nikalo. Answer in <strong>E1</strong>.",
                'difficulty' => 'easy',
                'time_limit' => 180,
            ],
            [
                'slug'   => 'sample-pivot-mental',
                'title'  => 'Pivot Logic: Count Unique Departments',
                'cat'    => 'pivot-tables',
                'sheet'  => [
                    'rows'  => 6,
                    'cols'  => 3,
                    'cells' => [
                        'A1' => 'Name',  'B1' => 'Dept',
                        'A2' => 'Aman',  'B2' => 'Sales',
                        'A3' => 'Priya', 'B3' => 'HR',
                        'A4' => 'Rahul', 'B4' => 'Sales',
                        'A5' => 'Sneha', 'B5' => 'IT',
                        'A6' => 'Vikas', 'B6' => 'HR',
                    ],
                ],
                'expected' => [ 'D1' => '3' ],
                'hint'     => "Use =SUMPRODUCT(1/COUNTIF(B2:B6,B2:B6)) or just count unique values: Sales, HR, IT.",
                'question' => "Kitne unique departments hain? Count likhein <strong>D1</strong> mein.",
                'difficulty' => 'medium',
                'time_limit' => 240,
            ],
        ];

        foreach ( $brainx as $b ) {
            $existing = get_page_by_path( $b['slug'], OBJECT, 'hk_brainx' );
            $post_id = $existing ? $existing->ID : 0;
            if ( ! $post_id ) {
                $post_id = wp_insert_post( [
                    'post_type'    => 'hk_brainx',
                    'post_status'  => 'publish',
                    'post_name'    => $b['slug'],
                    'post_title'   => $b['title'],
                    'post_content' => $b['question'],
                ], true );
                if ( is_wp_error( $post_id ) ) continue;
                $summary['brainx']++;
            }
            update_post_meta( $post_id, '_hk_brainx_question',   $b['question'] );
            update_post_meta( $post_id, '_hk_brainx_difficulty', $b['difficulty'] );
            update_post_meta( $post_id, '_hk_brainx_sheet_json', wp_json_encode( $b['sheet'] ) );
            update_post_meta( $post_id, '_hk_brainx_expected_json', wp_json_encode( $b['expected'] ) );
            update_post_meta( $post_id, '_hk_brainx_hint',       $b['hint'] );
            update_post_meta( $post_id, '_hk_brainx_time_limit', $b['time_limit'] );
            update_post_meta( $post_id, '_hk_seed_v4', '1' );

            $term = get_term_by( 'slug', $b['cat'], 'hk_brainx_cat' );
            if ( $term && ! is_wp_error( $term ) ) {
                wp_set_object_terms( $post_id, [ (int) $term->term_id ], 'hk_brainx_cat', false );
            }
        }
    }

    $summary['finished'] = time();
    update_option( 'hk_seed_v4b_done', time() );
    update_option( 'hk_seed_v4b_summary', $summary );
}

/** Helper: ensure term exists, return term_id. */
function hk_v4_ensure_term( $name, $slug, $taxonomy, $parent_id = 0, $description = '' ) {
    if ( ! taxonomy_exists( $taxonomy ) ) return 0;
    $term = get_term_by( 'slug', $slug, $taxonomy );
    if ( $term && ! is_wp_error( $term ) ) {
        if ( $description && empty( $term->description ) ) {
            wp_update_term( $term->term_id, $taxonomy, [ 'description' => $description, 'parent' => (int) $parent_id ] );
        }
        return (int) $term->term_id;
    }
    $res = wp_insert_term( $name, $taxonomy, [
        'slug'        => $slug,
        'parent'      => (int) $parent_id,
        'description' => $description,
    ] );
    if ( is_wp_error( $res ) ) return 0;
    return (int) $res['term_id'];
}

/** Admin status page: Tools → HackKnow Seed v4 */
add_action( 'admin_menu', function () {
    add_management_page(
        'HackKnow Seed v4',
        'HackKnow Seed v4',
        'manage_options',
        'hk-seed-v4',
        function () {
            $sum = get_option( 'hk_seed_v4b_summary', [] );
            echo '<div class="wrap"><h1>HackKnow Content Seed v4</h1>';
            echo '<p><strong>Status:</strong> ' . ( get_option( 'hk_seed_v4b_done' ) ? 'Done — ' . esc_html( gmdate( 'Y-m-d H:i:s', (int) get_option( 'hk_seed_v4b_done' ) ) ) . ' UTC' : 'Pending' ) . '</p>';
            if ( $sum ) {
                echo '<h3>Summary</h3><pre>' . esc_html( wp_json_encode( $sum, JSON_PRETTY_PRINT ) ) . '</pre>';
            }
            echo '<p><a class="button button-primary" href="' . esc_url( admin_url( '?hk_reseed_v4b=1' ) ) . '">Re-run seed (idempotent)</a></p>';
            echo '</div>';
        }
    );
} );
