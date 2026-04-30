<?php
/**
 * Plugin Name: HackKnow Brainxercise + Product Preview
 * Description: Spreadsheet practice quizzes (CPT hk_brainx) + live Preview URL meta for Website Templates / Hackknow Premium products.
 * Version:     1.0.0
 * Author:      HackKnow
 *
 * Endpoints:
 *   GET  /wp-json/hackknow/v1/brainxercise              List exercises (filters: cat, difficulty, page, per_page)
 *   GET  /wp-json/hackknow/v1/brainxercise/{slug}       Detail (sheet JSON + question, NO expected answers leaked)
 *   POST /wp-json/hackknow/v1/brainxercise/{slug}/check Body: {cells:{A1:"...",B2:123}} → {pass, score, correct, total, wrong[]}
 *   GET  /wp-json/hackknow/v1/brainxercise-cats         Taxonomy list
 *   GET  /wp-json/hackknow/v1/product/{id}/preview      Returns {preview_url} for a product
 *
 * Admin:
 *   wp-admin → Brainxercise → All / Add New / Categories
 *   wp-admin → Products → edit → "Live Preview URL" box (only for Website Templates / Hackknow Premium)
 *
 * Author of cell answers MUST keep them in JSON form like {"D5":"John","F10":350}.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/* ============================================================
 *  PART A — BRAINXERCISE CPT + TAXONOMY
 * ============================================================ */

add_action( 'init', 'hk_brainx_register', 10 );
function hk_brainx_register() {
	register_post_type( 'hk_brainx', [
		'label'              => 'Brainxercise',
		'labels'             => [
			'name'               => 'Brainxercise',
			'singular_name'      => 'Brainxercise',
			'add_new'            => 'Add New',
			'add_new_item'       => 'Add New Brainxercise',
			'edit_item'          => 'Edit Brainxercise',
			'all_items'          => 'All Brainxercise',
			'menu_name'          => 'Brainxercise',
		],
		'public'             => true,
		'publicly_queryable' => false,
		'show_ui'            => true,
		'show_in_menu'       => true,
		'show_in_rest'       => true,
		'rest_base'          => 'hk_brainx',
		'menu_position'      => 26,
		'menu_icon'          => 'dashicons-welcome-learn-more',
		'supports'           => [ 'title', 'editor', 'thumbnail', 'excerpt' ],
		'has_archive'        => false,
		'rewrite'            => false,
		'capability_type'    => 'post',
	] );

	register_taxonomy( 'hk_brainx_cat', 'hk_brainx', [
		'label'             => 'Brainxercise Categories',
		'hierarchical'      => true,
		'show_ui'           => true,
		'show_in_rest'      => true,
		'show_admin_column' => true,
		'rewrite'           => false,
	] );
}

/* Auto-seed default categories on first activation */
add_action( 'init', 'hk_brainx_seed_cats', 99 );
function hk_brainx_seed_cats() {
	if ( get_option( 'hk_brainx_cats_seeded_v1' ) === 'yes' ) { return; }
	if ( ! taxonomy_exists( 'hk_brainx_cat' ) ) { return; }

	$cats = [
		'VLOOKUP & XLOOKUP',
		'Pivot Tables',
		'Conditional Formatting',
		'Charts & Visualization',
		'Data Cleaning',
		'Power Query',
		'Macros & VBA',
		'Formulas (SUM, IF, INDEX-MATCH)',
		'Date & Time Functions',
	];
	foreach ( $cats as $c ) {
		if ( ! term_exists( $c, 'hk_brainx_cat' ) ) {
			wp_insert_term( $c, 'hk_brainx_cat' );
		}
	}
	update_option( 'hk_brainx_cats_seeded_v1', 'yes', false );
}

/* ============================================================
 *  PART B — ADMIN META BOXES (Brainxercise)
 * ============================================================ */

add_action( 'add_meta_boxes', 'hk_brainx_meta_boxes' );
function hk_brainx_meta_boxes() {
	add_meta_box( 'hk_brainx_quiz', 'Quiz Definition', 'hk_brainx_box_quiz', 'hk_brainx', 'normal', 'high' );
	add_meta_box( 'hk_brainx_help', 'How To Build a Brainxercise', 'hk_brainx_box_help', 'hk_brainx', 'side', 'low' );
}

function hk_brainx_box_quiz( $post ) {
	wp_nonce_field( 'hk_brainx_save', 'hk_brainx_nonce' );

	$question      = get_post_meta( $post->ID, '_hk_brainx_question', true );
	$difficulty    = get_post_meta( $post->ID, '_hk_brainx_difficulty', true ) ?: 'beginner';
	$sheet         = get_post_meta( $post->ID, '_hk_brainx_sheet', true ) ?: '{"rows":15,"cols":8,"cells":{"A1":"Product","B1":"Price","A2":"Apple","B2":50,"A3":"Mango","B3":80}}';
	$expected      = get_post_meta( $post->ID, '_hk_brainx_expected', true ) ?: '{"D5":"answer here"}';
	$hint          = get_post_meta( $post->ID, '_hk_brainx_hint', true );
	$time_limit    = (int) get_post_meta( $post->ID, '_hk_brainx_time_limit', true );

	?>
	<style>
		.hk-brainx-grid { display:grid; grid-template-columns:140px 1fr; gap:12px; align-items:start; margin-bottom:14px; }
		.hk-brainx-grid label { font-weight:600; padding-top:6px; }
		.hk-brainx-grid textarea, .hk-brainx-grid input[type=text], .hk-brainx-grid input[type=number], .hk-brainx-grid select {
			width:100%; font-family:Menlo,Consolas,monospace; font-size:13px;
		}
		.hk-brainx-help { background:#fffbe6; border-left:3px solid #facc15; padding:10px 14px; margin-bottom:14px; font-size:12px; }
		.hk-brainx-help code { background:#fef3c7; padding:1px 4px; border-radius:3px; }
	</style>

	<div class="hk-brainx-help">
		<strong>Quick guide:</strong> Sheet JSON cells use Excel notation (<code>A1</code>, <code>B5</code>, <code>AA10</code>).
		Expected cells JSON tells the checker which cells to validate after submission.
		Example expected: <code>{"D5":"John","F10":350}</code> — comparison is case-insensitive + trimmed.
	</div>

	<div class="hk-brainx-grid">
		<label>Question Text</label>
		<textarea name="hk_brainx_question" rows="3" placeholder="e.g. Cell D5 mein VLOOKUP lagao jo Product 'Mango' ka Price return kare."><?php echo esc_textarea( $question ); ?></textarea>

		<label>Difficulty</label>
		<select name="hk_brainx_difficulty">
			<?php foreach ( [ 'beginner' => 'Beginner', 'intermediate' => 'Intermediate', 'advanced' => 'Advanced', 'pro' => 'Pro' ] as $k => $v ) : ?>
				<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $difficulty, $k ); ?>><?php echo esc_html( $v ); ?></option>
			<?php endforeach; ?>
		</select>

		<label>Time Limit (sec)<br><span style="font-weight:400;font-size:11px;color:#888">0 = no limit</span></label>
		<input type="number" min="0" max="3600" name="hk_brainx_time_limit" value="<?php echo esc_attr( $time_limit ); ?>" />

		<label>Hint</label>
		<textarea name="hk_brainx_hint" rows="2" placeholder="Shown after first wrong attempt (optional)."><?php echo esc_textarea( $hint ); ?></textarea>

		<label>Sheet JSON<br><span style="font-weight:400;font-size:11px;color:#888">{rows, cols, cells:{A1:"x"}}</span></label>
		<textarea name="hk_brainx_sheet" rows="8"><?php echo esc_textarea( $sheet ); ?></textarea>

		<label>Expected Cells JSON<br><span style="font-weight:400;font-size:11px;color:#d00">SECRET — never returned to client until check</span></label>
		<textarea name="hk_brainx_expected" rows="4"><?php echo esc_textarea( $expected ); ?></textarea>
	</div>
	<?php
}

function hk_brainx_box_help( $post ) {
	?>
	<p style="font-size:12px;line-height:1.5">
		<strong>Sheet JSON example:</strong><br>
		<code style="display:block;white-space:pre-wrap;background:#f6f7f7;padding:6px;border-radius:3px;font-size:11px;">{
  "rows": 15,
  "cols": 8,
  "cells": {
    "A1": "Product",
    "B1": "Price",
    "A2": "Apple",
    "B2": 50
  }
}</code>
	</p>
	<p style="font-size:12px;">User can type formulas like <code>=VLOOKUP(...)</code>; client computes the visible value, server only checks the final cell value.</p>
	<p style="font-size:12px;color:#d00">⚠️ Keep <strong>Expected Cells</strong> simple — string match only, case-insensitive.</p>
	<?php
}

add_action( 'save_post_hk_brainx', 'hk_brainx_save', 10, 2 );
function hk_brainx_save( $post_id, $post ) {
	if ( ! isset( $_POST['hk_brainx_nonce'] ) || ! wp_verify_nonce( $_POST['hk_brainx_nonce'], 'hk_brainx_save' ) ) { return; }
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) { return; }
	if ( ! current_user_can( 'edit_post', $post_id ) ) { return; }

	$fields = [
		'_hk_brainx_question'   => isset( $_POST['hk_brainx_question'] )   ? wp_kses_post( wp_unslash( $_POST['hk_brainx_question'] ) ) : '',
		'_hk_brainx_difficulty' => isset( $_POST['hk_brainx_difficulty'] ) ? sanitize_key( $_POST['hk_brainx_difficulty'] ) : 'beginner',
		'_hk_brainx_hint'       => isset( $_POST['hk_brainx_hint'] )       ? wp_kses_post( wp_unslash( $_POST['hk_brainx_hint'] ) ) : '',
		'_hk_brainx_time_limit' => isset( $_POST['hk_brainx_time_limit'] ) ? max( 0, (int) $_POST['hk_brainx_time_limit'] ) : 0,
	];

	/* Validate JSON fields before saving */
	foreach ( [ 'hk_brainx_sheet' => '_hk_brainx_sheet', 'hk_brainx_expected' => '_hk_brainx_expected' ] as $in => $meta ) {
		if ( isset( $_POST[ $in ] ) ) {
			$raw = wp_unslash( $_POST[ $in ] );
			$decoded = json_decode( $raw, true );
			if ( json_last_error() === JSON_ERROR_NONE ) {
				$fields[ $meta ] = wp_json_encode( $decoded );
			} else {
				$fields[ $meta ] = $raw; /* keep raw so admin can fix */
			}
		}
	}

	foreach ( $fields as $k => $v ) {
		update_post_meta( $post_id, $k, $v );
	}
}

/* ============================================================
 *  PART C — REST: BRAINXERCISE
 * ============================================================ */

add_action( 'rest_api_init', 'hk_brainx_rest' );
function hk_brainx_rest() {
	$pub = [ 'permission_callback' => '__return_true' ];

	register_rest_route( 'hackknow/v1', '/brainxercise', array_merge( $pub, [
		'methods'  => 'GET',
		'callback' => 'hk_brainx_rest_list',
	] ) );

	register_rest_route( 'hackknow/v1', '/brainxercise/(?P<slug>[a-z0-9-]+)', array_merge( $pub, [
		'methods'  => 'GET',
		'callback' => 'hk_brainx_rest_get',
	] ) );

	register_rest_route( 'hackknow/v1', '/brainxercise/(?P<slug>[a-z0-9-]+)/check', array_merge( $pub, [
		'methods'  => 'POST',
		'callback' => 'hk_brainx_rest_check',
	] ) );

	register_rest_route( 'hackknow/v1', '/brainxercise-cats', array_merge( $pub, [
		'methods'  => 'GET',
		'callback' => 'hk_brainx_rest_cats',
	] ) );

	register_rest_route( 'hackknow/v1', '/product/(?P<id>\d+)/preview', array_merge( $pub, [
		'methods'  => 'GET',
		'callback' => 'hk_brainx_rest_product_preview',
	] ) );
}

function hk_brainx_rest_list( $req ) {
	$args = [
		'post_type'      => 'hk_brainx',
		'post_status'    => 'publish',
		'posts_per_page' => min( 50, max( 1, (int) $req->get_param( 'per_page' ) ?: 20 ) ),
		'paged'          => max( 1, (int) $req->get_param( 'page' ) ?: 1 ),
		'orderby'        => 'menu_order date',
		'order'          => 'ASC',
	];

	$cat = sanitize_key( (string) $req->get_param( 'cat' ) );
	if ( $cat ) {
		$args['tax_query'] = [ [ 'taxonomy' => 'hk_brainx_cat', 'field' => 'slug', 'terms' => $cat ] ];
	}
	$diff = sanitize_key( (string) $req->get_param( 'difficulty' ) );
	if ( $diff ) {
		$args['meta_query'] = [ [ 'key' => '_hk_brainx_difficulty', 'value' => $diff ] ];
	}

	$q = new WP_Query( $args );
	$out = [];
	while ( $q->have_posts() ) {
		$q->the_post();
		$id = get_the_ID();
		$cats = wp_get_post_terms( $id, 'hk_brainx_cat', [ 'fields' => 'names' ] );
		$out[] = [
			'id'         => $id,
			'slug'       => get_post_field( 'post_name', $id ),
			'title'      => get_the_title(),
			'excerpt'    => wp_strip_all_tags( get_the_excerpt() ),
			'difficulty' => get_post_meta( $id, '_hk_brainx_difficulty', true ) ?: 'beginner',
			'time_limit' => (int) get_post_meta( $id, '_hk_brainx_time_limit', true ),
			'categories' => is_wp_error( $cats ) ? [] : $cats,
			'thumbnail'  => get_the_post_thumbnail_url( $id, 'medium' ) ?: null,
		];
	}
	wp_reset_postdata();

	return new WP_REST_Response( [
		'items'       => $out,
		'total'       => (int) $q->found_posts,
		'total_pages' => (int) $q->max_num_pages,
	], 200 );
}

function hk_brainx_rest_get( $req ) {
	$slug = sanitize_title( $req['slug'] );
	$posts = get_posts( [ 'name' => $slug, 'post_type' => 'hk_brainx', 'post_status' => 'publish', 'numberposts' => 1 ] );
	if ( empty( $posts ) ) {
		return new WP_REST_Response( [ 'error' => 'not_found' ], 404 );
	}
	$p = $posts[0];
	$id = $p->ID;

	$sheet = get_post_meta( $id, '_hk_brainx_sheet', true );
	$decoded = json_decode( $sheet, true );

	$cats = wp_get_post_terms( $id, 'hk_brainx_cat', [ 'fields' => 'names' ] );

	return new WP_REST_Response( [
		'id'          => $id,
		'slug'        => $p->post_name,
		'title'       => $p->post_title,
		'description' => apply_filters( 'the_content', $p->post_content ),
		'question'    => get_post_meta( $id, '_hk_brainx_question', true ),
		'difficulty'  => get_post_meta( $id, '_hk_brainx_difficulty', true ) ?: 'beginner',
		'time_limit'  => (int) get_post_meta( $id, '_hk_brainx_time_limit', true ),
		'sheet'       => is_array( $decoded ) ? $decoded : [ 'rows' => 10, 'cols' => 6, 'cells' => new stdClass() ],
		'has_hint'    => (bool) get_post_meta( $id, '_hk_brainx_hint', true ),
		'categories'  => is_wp_error( $cats ) ? [] : $cats,
		'thumbnail'   => get_the_post_thumbnail_url( $id, 'large' ) ?: null,
	], 200 );
}

function hk_brainx_rest_check( $req ) {
	$slug = sanitize_title( $req['slug'] );
	$posts = get_posts( [ 'name' => $slug, 'post_type' => 'hk_brainx', 'post_status' => 'publish', 'numberposts' => 1 ] );
	if ( empty( $posts ) ) {
		return new WP_REST_Response( [ 'error' => 'not_found' ], 404 );
	}
	$id = $posts[0]->ID;

	$body = $req->get_json_params();
	$user_cells = isset( $body['cells'] ) && is_array( $body['cells'] ) ? $body['cells'] : [];

	$expected_raw = get_post_meta( $id, '_hk_brainx_expected', true );
	$expected = json_decode( $expected_raw, true );
	if ( ! is_array( $expected ) || empty( $expected ) ) {
		return new WP_REST_Response( [ 'error' => 'no_answer_key' ], 500 );
	}

	$wrong = [];
	$correct = 0;
	$total = 0;
	foreach ( $expected as $cell => $expVal ) {
		$total++;
		$cell_norm = strtoupper( preg_replace( '/[^A-Za-z0-9]/', '', (string) $cell ) );
		$user_val_raw = '';
		foreach ( $user_cells as $k => $v ) {
			$k_norm = strtoupper( preg_replace( '/[^A-Za-z0-9]/', '', (string) $k ) );
			if ( $k_norm === $cell_norm ) { $user_val_raw = $v; break; }
		}
		$ok = hk_brainx_compare_cell( $expVal, $user_val_raw );
		if ( $ok ) { $correct++; } else { $wrong[] = $cell_norm; }
	}

	$pass  = ( $correct === $total );
	$score = $total > 0 ? (int) round( ( $correct / $total ) * 100 ) : 0;

	$resp = [
		'pass'    => $pass,
		'correct' => $correct,
		'total'   => $total,
		'score'   => $score,
		'wrong'   => $wrong,
	];

	/* Show hint if at least 1 wrong */
	if ( ! $pass ) {
		$hint = (string) get_post_meta( $id, '_hk_brainx_hint', true );
		if ( $hint ) { $resp['hint'] = $hint; }
	}

	return new WP_REST_Response( $resp, 200 );
}

function hk_brainx_compare_cell( $expected, $given ) {
	$norm = function( $v ) {
		if ( is_bool( $v ) ) { return $v ? 'true' : 'false'; }
		if ( is_null( $v ) ) { return ''; }
		$s = is_scalar( $v ) ? (string) $v : '';
		$s = trim( strtolower( $s ) );
		/* remove spaces + commas in numeric-like strings */
		if ( is_numeric( str_replace( [ ',', ' ', '₹', '$' ], '', $s ) ) ) {
			$s = (string) (float) str_replace( [ ',', ' ', '₹', '$' ], '', $s );
		}
		return $s;
	};
	return $norm( $expected ) === $norm( $given );
}

function hk_brainx_rest_cats() {
	$terms = get_terms( [ 'taxonomy' => 'hk_brainx_cat', 'hide_empty' => false ] );
	if ( is_wp_error( $terms ) ) { return new WP_REST_Response( [], 200 ); }
	$out = [];
	foreach ( $terms as $t ) {
		$out[] = [
			'id'    => $t->term_id,
			'name'  => $t->name,
			'slug'  => $t->slug,
			'count' => (int) $t->count,
		];
	}
	return new WP_REST_Response( $out, 200 );
}

/* ============================================================
 *  PART D — PRODUCT PREVIEW URL META
 * ============================================================ */

/* Categories that should display a Live Preview field */
function hk_preview_target_cat_slugs() {
	return apply_filters( 'hk_preview_target_cat_slugs', [
		'website-templates',
		'custom-website-templates',
		'hackknow-premium',
		'mis-custom-dashboards',
		'mis-dashboards-templates',
	] );
}

function hk_preview_product_eligible( $product_id ) {
	if ( ! $product_id ) { return false; }
	$terms = wp_get_post_terms( $product_id, 'product_cat', [ 'fields' => 'slugs' ] );
	if ( is_wp_error( $terms ) || empty( $terms ) ) { return false; }
	$targets = hk_preview_target_cat_slugs();
	return (bool) array_intersect( $terms, $targets );
}

/* Admin metabox for products */
add_action( 'add_meta_boxes', 'hk_preview_register_metabox' );
function hk_preview_register_metabox() {
	add_meta_box(
		'hk_product_preview',
		'Live Preview URL',
		'hk_preview_metabox_render',
		'product',
		'side',
		'default'
	);
}

function hk_preview_metabox_render( $post ) {
	wp_nonce_field( 'hk_preview_save', 'hk_preview_nonce' );
	$url = (string) get_post_meta( $post->ID, '_hk_preview_url', true );
	$open_in = (string) get_post_meta( $post->ID, '_hk_preview_open_in', true ) ?: 'newtab';
	$eligible = hk_preview_product_eligible( $post->ID );
	?>
	<p style="font-size:12px;color:#666;margin-top:0">
		Sirf Website Templates / Hackknow Premium product mein dikhega. Live demo URL paste karo.
	</p>
	<label style="display:block;margin-bottom:6px;font-weight:600">Preview URL</label>
	<input type="url" name="hk_preview_url" value="<?php echo esc_attr( $url ); ?>"
	       style="width:100%" placeholder="https://demo.example.com/template-x" />

	<label style="display:block;margin:10px 0 6px;font-weight:600">Open In</label>
	<select name="hk_preview_open_in" style="width:100%">
		<option value="newtab" <?php selected( $open_in, 'newtab' ); ?>>New Tab</option>
		<option value="iframe" <?php selected( $open_in, 'iframe' ); ?>>Iframe Modal (in-page)</option>
	</select>

	<?php if ( ! $eligible && $url ) : ?>
		<p style="margin-top:10px;color:#d00;font-size:11px">⚠️ Product is not in a target category. URL saved but button won't display until category is set.</p>
	<?php endif; ?>
	<?php
}

add_action( 'save_post_product', 'hk_preview_save', 10 );
function hk_preview_save( $post_id ) {
	if ( ! isset( $_POST['hk_preview_nonce'] ) || ! wp_verify_nonce( $_POST['hk_preview_nonce'], 'hk_preview_save' ) ) { return; }
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) { return; }
	if ( ! current_user_can( 'edit_post', $post_id ) ) { return; }

	$url = isset( $_POST['hk_preview_url'] ) ? esc_url_raw( wp_unslash( $_POST['hk_preview_url'] ) ) : '';
	update_post_meta( $post_id, '_hk_preview_url', $url );

	$open_in = isset( $_POST['hk_preview_open_in'] ) ? sanitize_key( $_POST['hk_preview_open_in'] ) : 'newtab';
	if ( ! in_array( $open_in, [ 'newtab', 'iframe' ], true ) ) { $open_in = 'newtab'; }
	update_post_meta( $post_id, '_hk_preview_open_in', $open_in );
}

/* Expose preview URL in WC Store API product response */
add_filter( 'woocommerce_rest_prepare_product_object', 'hk_preview_inject_into_wc_rest', 10, 3 );
function hk_preview_inject_into_wc_rest( $response, $product, $request ) {
	if ( ! $response || ! $product ) { return $response; }
	$pid = $product->get_id();
	$url = (string) get_post_meta( $pid, '_hk_preview_url', true );
	if ( $url && hk_preview_product_eligible( $pid ) ) {
		$data = $response->get_data();
		$data['hk_preview'] = [
			'url'     => $url,
			'open_in' => (string) get_post_meta( $pid, '_hk_preview_open_in', true ) ?: 'newtab',
		];
		$response->set_data( $data );
	}
	return $response;
}

/* Standalone REST endpoint */
function hk_brainx_rest_product_preview( $req ) {
	$pid = (int) $req['id'];
	if ( ! $pid || get_post_type( $pid ) !== 'product' ) {
		return new WP_REST_Response( [ 'error' => 'not_found' ], 404 );
	}
	$url = (string) get_post_meta( $pid, '_hk_preview_url', true );
	if ( ! $url || ! hk_preview_product_eligible( $pid ) ) {
		return new WP_REST_Response( [ 'preview_url' => null ], 200 );
	}
	return new WP_REST_Response( [
		'preview_url' => $url,
		'open_in'     => (string) get_post_meta( $pid, '_hk_preview_open_in', true ) ?: 'newtab',
	], 200 );
}

/* End of file */
