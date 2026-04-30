<?php
/**
 * Plugin Name: HackKnow Bulk Products
 * Description: Token-gated bulk product CRUD + blog post creation for HackKnow excel templates seed.
 *              Reuses dbtools token (X-HK-DB-Token). Endpoints under /hackknow-bulk/v1/*.
 * Version:     1.0.0
 * Author:      HackKnow
 */
defined('ABSPATH') || exit;

/* ───────────── auth ───────────── */
function hk_bulk_token() { return get_option('hk_db_token', ''); }
function hk_bulk_auth(WP_REST_Request $req) {
    $tok = $req->get_header('x-hk-db-token');
    return $tok && hash_equals(hk_bulk_token(), $tok);
}

/* ───────────── routes ───────────── */
add_action('rest_api_init', function() {
    $ns   = 'hackknow-bulk/v1';
    $auth = ['permission_callback' => 'hk_bulk_auth'];
    register_rest_route($ns, '/audit',          array_merge(['methods'=>'GET',  'callback'=>'hk_bulk_audit'],         $auth));
    register_rest_route($ns, '/wipe',           array_merge(['methods'=>'POST', 'callback'=>'hk_bulk_wipe'],          $auth));
    register_rest_route($ns, '/upsert-cat',     array_merge(['methods'=>'POST', 'callback'=>'hk_bulk_upsert_cat'],    $auth));
    register_rest_route($ns, '/create-product', array_merge(['methods'=>'POST', 'callback'=>'hk_bulk_create_product'],$auth));
    register_rest_route($ns, '/create-post',    array_merge(['methods'=>'POST', 'callback'=>'hk_bulk_create_post'],   $auth));
    register_rest_route($ns, '/cleanup-cats',   array_merge(['methods'=>'POST', 'callback'=>'hk_bulk_cleanup_cats'],  $auth));
    register_rest_route($ns, '/list-skus',     array_merge(['methods'=>'GET',  'callback'=>'hk_bulk_list_skus'],     $auth));
    register_rest_route($ns, '/update-product',array_merge(['methods'=>'POST', 'callback'=>'hk_bulk_update_product'],$auth));
    register_rest_route($ns, '/sideload-thumb',array_merge(['methods'=>'POST', 'callback'=>'hk_bulk_sideload_thumb'],$auth));
});

/* ───────────── audit (list excel-related cats + products) ───────────── */
function hk_bulk_audit(WP_REST_Request $req) {
    global $wpdb;
    $like = '%' . $wpdb->esc_like(sanitize_text_field($req->get_param('like') ?: 'excel')) . '%';
    $cats = $wpdb->get_results($wpdb->prepare(
        "SELECT t.term_id, t.name, t.slug, tt.parent, tt.count
         FROM {$wpdb->terms} t
         JOIN {$wpdb->term_taxonomy} tt ON t.term_id = tt.term_id
         WHERE tt.taxonomy = 'product_cat'
         AND (t.slug LIKE %s OR t.name LIKE %s)
         ORDER BY tt.parent, t.name",
        $like, $like
    ));
    $cat_ids = wp_list_pluck($cats, 'term_id');
    $products = [];
    if ($cat_ids) {
        $in = implode(',', array_map('intval', $cat_ids));
        $products = $wpdb->get_results(
            "SELECT p.ID, p.post_title, p.post_status, pm.meta_value AS is_virtual
             FROM {$wpdb->posts} p
             JOIN {$wpdb->term_relationships} tr ON tr.object_id = p.ID
             JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy='product_cat' AND tt.term_id IN ($in)
             LEFT JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID AND pm.meta_key='_virtual'
             WHERE p.post_type = 'product'
             AND p.post_status IN ('publish','draft','pending','private')
             GROUP BY p.ID
             ORDER BY p.ID DESC"
        );
    }
    return ['cats' => $cats, 'products' => $products, 'product_count' => count($products)];
}

/* ───────────── wipe (delete products in cats matching slug list) ───────────── */
function hk_bulk_wipe(WP_REST_Request $req) {
    global $wpdb;
    $b = $req->get_json_params();
    $slugs = array_map('sanitize_title', $b['slugs'] ?? []);
    $only_virtual = !empty($b['only_virtual']);
    if (!$slugs) return new WP_Error('bad_input', 'slugs[] required', ['status'=>400]);
    $term_ids = [];
    foreach ($slugs as $s) {
        $t = get_term_by('slug', $s, 'product_cat');
        if ($t) {
            $term_ids[] = (int)$t->term_id;
            // include children
            $children = get_term_children($t->term_id, 'product_cat');
            if (!is_wp_error($children)) foreach ($children as $c) $term_ids[] = (int)$c;
        }
    }
    if (!$term_ids) return ['ok'=>true, 'deleted'=>0, 'note'=>'no matching cats'];
    $in = implode(',', array_unique($term_ids));
    $sql = "SELECT DISTINCT p.ID, pm.meta_value AS is_virtual
            FROM {$wpdb->posts} p
            JOIN {$wpdb->term_relationships} tr ON tr.object_id = p.ID
            JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy='product_cat' AND tt.term_id IN ($in)
            LEFT JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID AND pm.meta_key='_virtual'
            WHERE p.post_type='product' AND p.post_status IN ('publish','draft','pending','private')";
    $rows = $wpdb->get_results($sql);
    $deleted_ids = [];
    foreach ($rows as $r) {
        if ($only_virtual && $r->is_virtual !== 'yes') continue;
        wp_delete_post((int)$r->ID, true);
        $deleted_ids[] = (int)$r->ID;
    }
    // also delete linked blog posts
    $blog_deleted = 0;
    if ($deleted_ids) {
        $in_p = implode(',', $deleted_ids);
        $blog_ids = $wpdb->get_col("SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key='_hk_product_id' AND meta_value IN ($in_p)");
        foreach ($blog_ids as $bid) { wp_delete_post((int)$bid, true); $blog_deleted++; }
    }
    return ['ok'=>true, 'product_deleted'=>count($deleted_ids), 'blog_deleted'=>$blog_deleted, 'cat_term_ids'=>$term_ids];
}

/* ───────────── upsert product_cat ───────────── */
function hk_bulk_upsert_cat(WP_REST_Request $req) {
    $b    = $req->get_json_params();
    $name = sanitize_text_field($b['name'] ?? '');
    $slug = sanitize_title($b['slug'] ?? $name);
    $desc = wp_kses_post($b['description'] ?? '');
    if (!$name) return new WP_Error('bad_input', 'name required', ['status'=>400]);
    $parent_id = 0;
    if (!empty($b['parent_slug'])) {
        $p = get_term_by('slug', sanitize_title($b['parent_slug']), 'product_cat');
        if ($p) $parent_id = (int)$p->term_id;
    }
    $existing = get_term_by('slug', $slug, 'product_cat');
    if ($existing) {
        wp_update_term($existing->term_id, 'product_cat', [
            'name' => $name, 'parent' => $parent_id, 'description' => $desc,
        ]);
        return ['ok'=>true, 'term_id'=>(int)$existing->term_id, 'updated'=>true];
    }
    $r = wp_insert_term($name, 'product_cat', ['slug'=>$slug, 'parent'=>$parent_id, 'description'=>$desc]);
    if (is_wp_error($r)) return new WP_Error('cat_insert', $r->get_error_message(), ['status'=>500]);
    return ['ok'=>true, 'term_id'=>(int)$r['term_id'], 'created'=>true];
}

/* ───────────── create product ───────────── */
function hk_bulk_create_product(WP_REST_Request $req) {
    $b = $req->get_json_params();
    foreach (['sku','title','content','price','file_url','file_name'] as $k) {
        if (!isset($b[$k]) || $b[$k]==='') return new WP_Error('bad_input', "$k required", ['status'=>400]);
    }
    global $wpdb;
    $existing = (int)$wpdb->get_var($wpdb->prepare(
        "SELECT post_id FROM {$wpdb->postmeta} pm
         JOIN {$wpdb->posts} p ON p.ID = pm.post_id
         WHERE pm.meta_key='_sku' AND pm.meta_value=%s
         AND p.post_type='product' AND p.post_status IN ('publish','draft','pending','private')
         LIMIT 1", $b['sku']));
    if ($existing) return ['ok'=>true, 'skipped'=>true, 'product_id'=>$existing, 'permalink'=>get_permalink($existing)];
    $product_id = wp_insert_post([
        'post_type'    => 'product',
        'post_status'  => 'publish',
        'post_title'   => sanitize_text_field($b['title']),
        'post_name'    => sanitize_title($b['slug'] ?? $b['title']),
        'post_content' => wp_kses_post($b['content']),
        'post_excerpt' => wp_kses_post($b['excerpt'] ?? ''),
        'post_author'  => 1,
    ], true);
    if (is_wp_error($product_id) || !$product_id) {
        return new WP_Error('create_failed', is_wp_error($product_id) ? $product_id->get_error_message() : 'Insert failed', ['status'=>500]);
    }
    /* virtual + downloadable */
    update_post_meta($product_id, '_virtual',         'yes');
    update_post_meta($product_id, '_downloadable',    'yes');
    update_post_meta($product_id, '_sku',             sanitize_text_field($b['sku']));
    update_post_meta($product_id, '_regular_price',   strval($b['regular_price'] ?? $b['price']));
    update_post_meta($product_id, '_sale_price',      strval($b['price']));
    update_post_meta($product_id, '_price',           strval($b['price']));
    update_post_meta($product_id, '_stock_status',    'instock');
    update_post_meta($product_id, '_manage_stock',    'no');
    update_post_meta($product_id, '_sold_individually','no');
    update_post_meta($product_id, '_tax_status',      'taxable');
    update_post_meta($product_id, '_visibility',      'visible');
    update_post_meta($product_id, '_featured',        'no');
    update_post_meta($product_id, '_reviews_allowed', 'open');
    /* downloadable file */
    $file_id = md5($b['file_url']);
    $files = [ $file_id => [
        'id'   => $file_id,
        'name' => sanitize_text_field($b['file_name']),
        'file' => esc_url_raw($b['file_url']),
    ]];
    update_post_meta($product_id, '_downloadable_files', $files);
    update_post_meta($product_id, '_download_limit',  '-1');
    update_post_meta($product_id, '_download_expiry', '-1');
    update_post_meta($product_id, '_download_type',   'standard');
    /* mark as no-live-preview (frontend respects this meta) */
    update_post_meta($product_id, '_hk_no_live_preview', 'yes');
    update_post_meta($product_id, '_hk_template_kind',   sanitize_text_field($b['template_kind'] ?? 'excel'));
    /* product type */
    wp_set_object_terms($product_id, 'simple', 'product_type');
    /* product_cat assignment */
    if (!empty($b['cat_slugs']) && is_array($b['cat_slugs'])) {
        $term_ids = [];
        foreach ($b['cat_slugs'] as $s) {
            $t = get_term_by('slug', sanitize_title($s), 'product_cat');
            if ($t) $term_ids[] = (int)$t->term_id;
        }
        if ($term_ids) wp_set_object_terms($product_id, $term_ids, 'product_cat');
    }
    /* tags */
    if (!empty($b['tags']) && is_array($b['tags'])) {
        wp_set_object_terms($product_id, array_map('sanitize_text_field', $b['tags']), 'product_tag');
    }
    /* Yoast SEO */
    if (!empty($b['yoast_title']))   update_post_meta($product_id, '_yoast_wpseo_title',     sanitize_text_field($b['yoast_title']));
    if (!empty($b['yoast_desc']))    update_post_meta($product_id, '_yoast_wpseo_metadesc',  sanitize_text_field($b['yoast_desc']));
    if (!empty($b['yoast_focuskw'])) update_post_meta($product_id, '_yoast_wpseo_focuskw',   sanitize_text_field($b['yoast_focuskw']));
    if (!empty($b['og_title']))      update_post_meta($product_id, '_yoast_wpseo_opengraph-title',       sanitize_text_field($b['og_title']));
    if (!empty($b['og_desc']))       update_post_meta($product_id, '_yoast_wpseo_opengraph-description', sanitize_text_field($b['og_desc']));
    if (!empty($b['twitter_title'])) update_post_meta($product_id, '_yoast_wpseo_twitter-title',         sanitize_text_field($b['twitter_title']));
    if (!empty($b['twitter_desc']))  update_post_meta($product_id, '_yoast_wpseo_twitter-description',   sanitize_text_field($b['twitter_desc']));
    update_post_meta($product_id, '_yoast_wpseo_meta-robots-noindex',  '0');
    update_post_meta($product_id, '_yoast_wpseo_meta-robots-nofollow', '0');
    return ['ok'=>true, 'product_id'=>(int)$product_id, 'permalink'=>get_permalink($product_id)];
}

/* ───────────── create blog post ───────────── */
function hk_bulk_create_post(WP_REST_Request $req) {
    $b = $req->get_json_params();
    foreach (['title','slug','content'] as $k) {
        if (!isset($b[$k]) || $b[$k]==='') return new WP_Error('bad_input', "$k required", ['status'=>400]);
    }
    $existing = get_page_by_path(sanitize_title($b['slug']), OBJECT, 'post');
    if ($existing) return ['ok'=>true, 'skipped'=>true, 'post_id'=>(int)$existing->ID, 'permalink'=>get_permalink($existing->ID)];
    $post_id = wp_insert_post([
        'post_type'    => 'post',
        'post_status'  => 'publish',
        'post_title'   => sanitize_text_field($b['title']),
        'post_name'    => sanitize_title($b['slug']),
        'post_content' => wp_kses_post($b['content']),
        'post_excerpt' => wp_kses_post($b['excerpt'] ?? ''),
        'post_author'  => 1,
    ], true);
    if (is_wp_error($post_id)) return new WP_Error('post_failed', $post_id->get_error_message(), ['status'=>500]);
    /* category */
    if (!empty($b['cat_slugs']) && is_array($b['cat_slugs'])) {
        $term_ids = [];
        foreach ($b['cat_slugs'] as $s) {
            $slug = sanitize_title($s);
            $t = get_term_by('slug', $slug, 'category');
            if (!$t) {
                $r = wp_insert_term(sanitize_text_field($s), 'category', ['slug'=>$slug]);
                if (!is_wp_error($r)) $t = get_term((int)$r['term_id']);
            }
            if ($t) $term_ids[] = (int)$t->term_id;
        }
        if ($term_ids) wp_set_object_terms($post_id, $term_ids, 'category');
    }
    /* tags */
    if (!empty($b['tags']) && is_array($b['tags'])) {
        wp_set_object_terms($post_id, array_map('sanitize_text_field', $b['tags']), 'post_tag');
    }
    /* link to product */
    if (!empty($b['product_id'])) update_post_meta($post_id, '_hk_product_id', (int)$b['product_id']);
    /* Yoast SEO */
    if (!empty($b['yoast_title']))   update_post_meta($post_id, '_yoast_wpseo_title',    sanitize_text_field($b['yoast_title']));
    if (!empty($b['yoast_desc']))    update_post_meta($post_id, '_yoast_wpseo_metadesc', sanitize_text_field($b['yoast_desc']));
    if (!empty($b['yoast_focuskw'])) update_post_meta($post_id, '_yoast_wpseo_focuskw',  sanitize_text_field($b['yoast_focuskw']));
    if (!empty($b['og_title']))      update_post_meta($post_id, '_yoast_wpseo_opengraph-title',       sanitize_text_field($b['og_title']));
    if (!empty($b['og_desc']))       update_post_meta($post_id, '_yoast_wpseo_opengraph-description', sanitize_text_field($b['og_desc']));
    if (!empty($b['twitter_title'])) update_post_meta($post_id, '_yoast_wpseo_twitter-title',         sanitize_text_field($b['twitter_title']));
    if (!empty($b['twitter_desc']))  update_post_meta($post_id, '_yoast_wpseo_twitter-description',   sanitize_text_field($b['twitter_desc']));
    update_post_meta($post_id, '_yoast_wpseo_meta-robots-noindex',  '0');
    update_post_meta($post_id, '_yoast_wpseo_meta-robots-nofollow', '0');
    return ['ok'=>true, 'post_id'=>(int)$post_id, 'permalink'=>get_permalink($post_id)];
}

/* ───────────── cleanup empty / orphan cats ───────────── */
function hk_bulk_cleanup_cats(WP_REST_Request $req) {
    $b = $req->get_json_params();
    $slugs = array_map('sanitize_title', $b['slugs'] ?? []);
    if (!$slugs) return new WP_Error('bad_input', 'slugs[] required', ['status'=>400]);
    $deleted = [];
    foreach ($slugs as $s) {
        $t = get_term_by('slug', $s, 'product_cat');
        if ($t) {
            $r = wp_delete_term((int)$t->term_id, 'product_cat');
            if (!is_wp_error($r) && $r) $deleted[] = $s;
        }
    }
    return ['ok'=>true, 'deleted'=>$deleted];
}


function hk_bulk_list_skus(WP_REST_Request $req) {
    global $wpdb;
    $prefix = sanitize_text_field($req->get_param('prefix') ?: '');
    if ($prefix) {
        $like = $wpdb->esc_like($prefix) . '%';
        $rows = $wpdb->get_col($wpdb->prepare(
            "SELECT pm.meta_value FROM {$wpdb->postmeta} pm
             JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key='_sku' AND pm.meta_value LIKE %s
             AND p.post_type='product' AND p.post_status IN ('publish','draft','pending','private')",
            $like));
    } else {
        $rows = $wpdb->get_col(
            "SELECT pm.meta_value FROM {$wpdb->postmeta} pm
             JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key='_sku' AND pm.meta_value <> ''
             AND p.post_type='product' AND p.post_status IN ('publish','draft','pending','private')");
    }
    return ['ok'=>true, 'count'=>count($rows), 'skus'=>$rows];
}

/* ───────────── update product (content/excerpt/yoast/by SKU or ID) ───────────── */
function hk_bulk_update_product(WP_REST_Request $req) {
    $b = $req->get_json_params();
    global $wpdb;
    $product_id = 0;
    if (!empty($b['id'])) {
        $product_id = (int)$b['id'];
    } elseif (!empty($b['sku'])) {
        $product_id = (int)$wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} pm
             JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key='_sku' AND pm.meta_value=%s
             AND p.post_type='product' AND p.post_status IN ('publish','draft','pending','private')
             LIMIT 1", $b['sku']));
    }
    if (!$product_id) return new WP_Error('not_found', 'Product not found by id or sku', ['status'=>404]);
    $upd = ['ID' => $product_id];
    if (isset($b['content'])) $upd['post_content'] = wp_kses_post($b['content']);
    if (isset($b['excerpt'])) $upd['post_excerpt'] = wp_kses_post($b['excerpt']);
    if (isset($b['title']))   $upd['post_title']   = sanitize_text_field($b['title']);
    if (count($upd) > 1) {
        $r = wp_update_post($upd, true);
        if (is_wp_error($r)) return new WP_Error('update_failed', $r->get_error_message(), ['status'=>500]);
    }
    /* Yoast SEO refresh */
    if (!empty($b['yoast_title']))   update_post_meta($product_id, '_yoast_wpseo_title',     sanitize_text_field($b['yoast_title']));
    if (!empty($b['yoast_desc']))    update_post_meta($product_id, '_yoast_wpseo_metadesc',  sanitize_text_field($b['yoast_desc']));
    if (!empty($b['yoast_focuskw'])) update_post_meta($product_id, '_yoast_wpseo_focuskw',   sanitize_text_field($b['yoast_focuskw']));
    if (!empty($b['og_title']))      update_post_meta($product_id, '_yoast_wpseo_opengraph-title',       sanitize_text_field($b['og_title']));
    if (!empty($b['og_desc']))       update_post_meta($product_id, '_yoast_wpseo_opengraph-description', sanitize_text_field($b['og_desc']));
    if (!empty($b['twitter_title'])) update_post_meta($product_id, '_yoast_wpseo_twitter-title',         sanitize_text_field($b['twitter_title']));
    if (!empty($b['twitter_desc']))  update_post_meta($product_id, '_yoast_wpseo_twitter-description',   sanitize_text_field($b['twitter_desc']));
    /* mark as managed by us so we know what we touched */
    update_post_meta($product_id, '_hk_managed', 'yes');
    update_post_meta($product_id, '_hk_managed_at', gmdate('c'));
    if (!empty($b['version'])) update_post_meta($product_id, '_hk_managed_ver', sanitize_text_field($b['version']));
    return ['ok'=>true, 'product_id'=>(int)$product_id, 'permalink'=>get_permalink($product_id)];
}

/* ───────────── sideload thumbnail from external URL ───────────── */
function hk_bulk_sideload_thumb(WP_REST_Request $req) {
    $b = $req->get_json_params();
    if (empty($b['image_url'])) return new WP_Error('bad_input', 'image_url required', ['status'=>400]);
    global $wpdb;
    $product_id = 0;
    if (!empty($b['id'])) {
        $product_id = (int)$b['id'];
    } elseif (!empty($b['sku'])) {
        $product_id = (int)$wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} pm
             JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key='_sku' AND pm.meta_value=%s
             AND p.post_type='product' AND p.post_status IN ('publish','draft','pending','private')
             LIMIT 1", $b['sku']));
    }
    if (!$product_id) return new WP_Error('not_found', 'Product not found by id or sku', ['status'=>404]);
    /* idempotent: if already has _hk_thumb_src matching this URL, skip */
    $existing_src = get_post_meta($product_id, '_hk_thumb_src', true);
    $force = !empty($b['force']);
    if ($existing_src === $b['image_url'] && !$force && get_post_thumbnail_id($product_id)) {
        return ['ok'=>true, 'skipped'=>true, 'product_id'=>$product_id, 'attachment_id'=>get_post_thumbnail_id($product_id)];
    }
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    /* download */
    $tmp = download_url(esc_url_raw($b['image_url']), 30);
    if (is_wp_error($tmp)) return new WP_Error('download_failed', $tmp->get_error_message(), ['status'=>502]);
    $name = !empty($b['filename']) ? sanitize_file_name($b['filename']) : basename(parse_url($b['image_url'], PHP_URL_PATH));
    if (!preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $name)) $name .= '.png';
    $file_array = ['name' => $name, 'tmp_name' => $tmp];
    $att_id = media_handle_sideload($file_array, $product_id, !empty($b['alt']) ? sanitize_text_field($b['alt']) : '');
    if (is_wp_error($att_id)) {
        @unlink($tmp);
        return new WP_Error('sideload_failed', $att_id->get_error_message(), ['status'=>500]);
    }
    if (!empty($b['alt'])) update_post_meta($att_id, '_wp_attachment_image_alt', sanitize_text_field($b['alt']));
    set_post_thumbnail($product_id, $att_id);
    update_post_meta($product_id, '_hk_thumb_src', esc_url_raw($b['image_url']));
    update_post_meta($product_id, '_hk_thumb_set_at', gmdate('c'));
    return ['ok'=>true, 'product_id'=>$product_id, 'attachment_id'=>(int)$att_id, 'attachment_url'=>wp_get_attachment_url($att_id)];
}
