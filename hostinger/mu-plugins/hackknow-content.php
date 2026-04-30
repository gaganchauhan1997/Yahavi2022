<?php
/**
 * Plugin Name: HackKnow Content CMS
 * Description: CPTs (hk_course, hk_roadmap, hk_release) + hierarchical taxonomies,
 *              meta boxes (admin-editable, no code), REST endpoints under
 *              /wp-json/hackknow/v1/, verification flow (MIS / Student) +
 *              auto-coupon application, admin review page.
 * Author:      HackKnow
 * Version:     1.0.0
 *
 * Loads after hackknow-checkout.php (alphabetical) so the auth helper
 * `hackknow_authed_uid()` is available for REST callbacks at runtime.
 *
 * All functions are prefixed `hk_content_` to avoid collisions.
 */

if (!defined('ABSPATH')) exit;

/* ════════════════════════════════════════════════════════════════════
   SECTION 1: CPTs + TAXONOMIES
   ════════════════════════════════════════════════════════════════════ */

add_action('init', 'hk_content_register_cpts', 5);
function hk_content_register_cpts() {

    /* ─── Course CPT ──────────────────────────────────────────── */
    register_post_type('hk_course', [
        'labels' => [
            'name'               => 'Courses',
            'singular_name'      => 'Course',
            'menu_name'          => 'Courses',
            'add_new'            => 'Add Course',
            'add_new_item'       => 'Add New Course',
            'edit_item'          => 'Edit Course',
            'all_items'          => 'All Courses',
            'view_item'          => 'View Course',
            'search_items'       => 'Search Courses',
            'not_found'          => 'No courses found',
        ],
        'public'              => true,
        'has_archive'         => false,    // frontend served by external SPA
        'show_in_menu'        => 'hk_content_root',
        'show_in_rest'        => true,
        'rest_base'           => 'hk_course',
        'menu_icon'           => 'dashicons-welcome-learn-more',
        'supports'            => ['title', 'editor', 'excerpt', 'thumbnail'],
        'taxonomies'          => ['hk_course_cat'],
        'capability_type'     => 'post',
        'rewrite'             => ['slug' => 'courses', 'with_front' => false],
    ]);

    register_taxonomy('hk_course_cat', ['hk_course'], [
        'labels' => [
            'name'              => 'Course Categories',
            'singular_name'     => 'Course Category',
            'menu_name'         => 'Categories',
            'all_items'         => 'All Categories',
            'edit_item'         => 'Edit Category',
            'add_new_item'      => 'Add New Category',
        ],
        'hierarchical'      => true,
        'public'            => true,
        'show_in_rest'      => true,
        'rewrite'           => ['slug' => 'course-cat'],
        'show_admin_column' => true,
    ]);

    /* ─── Roadmap CPT ─────────────────────────────────────────── */
    register_post_type('hk_roadmap', [
        'labels' => [
            'name'               => 'Roadmaps',
            'singular_name'      => 'Roadmap',
            'menu_name'          => 'Roadmaps',
            'add_new'            => 'Add Roadmap',
            'add_new_item'       => 'Add New Roadmap',
            'edit_item'          => 'Edit Roadmap',
            'all_items'          => 'All Roadmaps',
            'view_item'          => 'View Roadmap',
        ],
        'public'              => true,
        'has_archive'         => false,
        'show_in_menu'        => 'hk_content_root',
        'show_in_rest'        => true,
        'rest_base'           => 'hk_roadmap',
        'menu_icon'           => 'dashicons-networking',
        'supports'            => ['title', 'editor', 'excerpt', 'thumbnail'],
        'taxonomies'          => ['hk_roadmap_career'],
        'capability_type'     => 'post',
        'rewrite'             => ['slug' => 'roadmaps', 'with_front' => false],
    ]);

    register_taxonomy('hk_roadmap_career', ['hk_roadmap'], [
        'labels' => [
            'name'              => 'Career Tracks',
            'singular_name'     => 'Career Track',
        ],
        'hierarchical'      => false,
        'public'            => true,
        'show_in_rest'      => true,
        'show_admin_column' => true,
    ]);

    /* ─── Release / Hacked News CPT ──────────────────────────── */
    register_post_type('hk_release', [
        'labels' => [
            'name'               => 'Hacked News',
            'singular_name'      => 'Release',
            'menu_name'          => 'Hacked News',
            'add_new'            => 'Add Release',
            'add_new_item'       => 'Add New Release',
            'edit_item'          => 'Edit Release',
            'all_items'          => 'All Releases',
        ],
        'public'              => true,
        'has_archive'         => false,
        'show_in_menu'        => 'hk_content_root',
        'show_in_rest'        => true,
        'rest_base'           => 'hk_release',
        'menu_icon'           => 'dashicons-megaphone',
        'supports'            => ['title', 'editor', 'excerpt', 'thumbnail'],
        'taxonomies'          => ['hk_release_type'],
        'capability_type'     => 'post',
        'rewrite'             => ['slug' => 'hacked-news', 'with_front' => false],
    ]);

    register_taxonomy('hk_release_type', ['hk_release'], [
        'labels' => [
            'name'              => 'Release Types',
            'singular_name'     => 'Release Type',
        ],
        'hierarchical'      => false,
        'public'            => true,
        'show_in_rest'      => true,
        'show_admin_column' => true,
    ]);
}

/* Provision default course sub-categories on first run. */
add_action('init', 'hk_content_provision_terms', 6);
function hk_content_provision_terms() {
    if (get_option('hk_content_terms_v1_done')) return;
    if (!taxonomy_exists('hk_course_cat'))     return;

    $course_cats = [
        'python'           => 'Python',
        'java'             => 'Java',
        'wordpress'        => 'WordPress',
        'php'              => 'PHP',
        'nodejs'           => 'Node.js',
        'vercel'           => 'Vercel',
        'netlify'          => 'Netlify',
        'ai-infrastructure'=> 'AI Infrastructure',
    ];
    foreach ($course_cats as $slug => $name) {
        if (!term_exists($slug, 'hk_course_cat')) {
            wp_insert_term($name, 'hk_course_cat', ['slug' => $slug]);
        }
    }

    $release_types = [
        'tool-release'    => 'Tool Release',
        'championship'    => 'Championship',
        'hackathon'       => 'Hackathon',
        'form-deadline'   => 'Form Deadline',
        'ai-update'       => 'AI Update',
        'conference'      => 'Conference',
        'announcement'    => 'Announcement',
    ];
    foreach ($release_types as $slug => $name) {
        if (!term_exists($slug, 'hk_release_type')) {
            wp_insert_term($name, 'hk_release_type', ['slug' => $slug]);
        }
    }

    update_option('hk_content_terms_v1_done', time());
}

/* ════════════════════════════════════════════════════════════════════
   SECTION 2: ADMIN MENU ROOT
   ════════════════════════════════════════════════════════════════════ */

add_action('admin_menu', 'hk_content_admin_menu_root', 1);
function hk_content_admin_menu_root() {
    add_menu_page(
        'HackKnow CMS',
        'HackKnow',
        'edit_posts',
        'hk_content_root',
        'hk_content_root_page',
        'dashicons-shield-alt',
        3
    );
}
function hk_content_root_page() {
    $courses   = wp_count_posts('hk_course');
    $roadmaps  = wp_count_posts('hk_roadmap');
    $releases  = wp_count_posts('hk_release');
    $pending   = count(get_users(['meta_key' => '_hk_verify_status', 'meta_value' => 'pending', 'fields' => 'ID']));
    echo '<div class="wrap"><h1>HackKnow CMS</h1>';
    echo '<p style="font-size:14px;color:#555;">Yahaan se site ke saare courses, roadmaps, news aur user verifications manage karein.</p>';
    echo '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:20px;">';
    foreach ([
        ['Courses',         (int)($courses->publish ?? 0),  'edit.php?post_type=hk_course'],
        ['Roadmaps',        (int)($roadmaps->publish ?? 0), 'edit.php?post_type=hk_roadmap'],
        ['Hacked News',     (int)($releases->publish ?? 0), 'edit.php?post_type=hk_release'],
        ['Pending Verifs',  $pending,                       'admin.php?page=hk_verifications'],
    ] as $card) {
        printf(
            '<a href="%s" style="display:block;padding:20px;border:3px solid #000;background:#fff;box-shadow:6px 6px 0 #000;text-decoration:none;color:#000;"><div style="font-size:32px;font-weight:900;">%d</div><div style="font-size:14px;text-transform:uppercase;letter-spacing:1px;margin-top:6px;">%s</div></a>',
            esc_url(admin_url($card[2])),
            $card[1],
            esc_html($card[0])
        );
    }
    echo '</div></div>';
}

/* ════════════════════════════════════════════════════════════════════
   SECTION 3: META BOXES
   ════════════════════════════════════════════════════════════════════ */

add_action('add_meta_boxes', 'hk_content_register_meta_boxes');
function hk_content_register_meta_boxes() {
    add_meta_box('hk_course_meta',  'Course Details',   'hk_content_box_course',   'hk_course',   'normal', 'high');
    add_meta_box('hk_roadmap_meta', 'Roadmap Details',  'hk_content_box_roadmap',  'hk_roadmap',  'normal', 'high');
    add_meta_box('hk_release_meta', 'Release Details',  'hk_content_box_release',  'hk_release',  'normal', 'high');
}

function hk_content_meta_input($post_id, $key, $label, $help = '', $type = 'text', $opts = []) {
    $val = get_post_meta($post_id, $key, true);
    $id  = 'hkc_' . $key;
    echo '<p style="margin:14px 0 4px;"><label for="' . esc_attr($id) . '" style="font-weight:600;display:block;margin-bottom:4px;">' . esc_html($label) . '</label>';
    if ($help) echo '<span style="font-size:12px;color:#666;display:block;margin-bottom:6px;">' . esc_html($help) . '</span>';
    if ($type === 'textarea') {
        $rows = $opts['rows'] ?? 4;
        printf('<textarea id="%s" name="%s" rows="%d" style="width:100%%;font-family:monospace;font-size:13px;">%s</textarea>',
            esc_attr($id), esc_attr($key), (int)$rows, esc_textarea($val));
    } elseif ($type === 'select') {
        printf('<select id="%s" name="%s" style="width:100%%;">', esc_attr($id), esc_attr($key));
        foreach (($opts['choices'] ?? []) as $v => $l) {
            printf('<option value="%s"%s>%s</option>', esc_attr($v), selected($val, $v, false), esc_html($l));
        }
        echo '</select>';
    } elseif ($type === 'number') {
        printf('<input type="number" id="%s" name="%s" value="%s" step="%s" style="width:100%%;" />',
            esc_attr($id), esc_attr($key), esc_attr($val),
            esc_attr($opts['step'] ?? '1'));
    } elseif ($type === 'datetime-local') {
        $dt = $val ? date('Y-m-d\TH:i', strtotime($val)) : '';
        printf('<input type="datetime-local" id="%s" name="%s" value="%s" style="width:100%%;" />',
            esc_attr($id), esc_attr($key), esc_attr($dt));
    } elseif ($type === 'url') {
        printf('<input type="url" id="%s" name="%s" value="%s" style="width:100%%;" placeholder="https://" />',
            esc_attr($id), esc_attr($key), esc_attr($val));
    } else {
        printf('<input type="text" id="%s" name="%s" value="%s" style="width:100%%;" />',
            esc_attr($id), esc_attr($key), esc_attr($val));
    }
    echo '</p>';
}

function hk_content_box_course($post) {
    wp_nonce_field('hk_content_save_meta', 'hk_content_nonce');
    hk_content_meta_input($post->ID, '_hk_course_level',          'Level',                  'Beginner / Intermediate / Advanced', 'select', ['choices' => ['' => '— select —', 'beginner' => 'Beginner', 'intermediate' => 'Intermediate', 'advanced' => 'Advanced']]);
    hk_content_meta_input($post->ID, '_hk_course_duration_weeks', 'Duration (weeks)',       'Total course length in weeks',        'number');
    hk_content_meta_input($post->ID, '_hk_course_hours_total',    'Total Hours',            'Total content hours',                 'number');
    hk_content_meta_input($post->ID, '_hk_course_price_inr',      'Price (INR)',            'Selling price in rupees',             'number');
    hk_content_meta_input($post->ID, '_hk_course_tools',          'Tools / Tech Stack',     'Comma-separated, e.g. "Python, Pandas, NumPy"');
    hk_content_meta_input($post->ID, '_hk_course_chapters',       'Chapters',               'One per line. Format: "Chapter Title | hours | optional description"', 'textarea', ['rows' => 8]);
    hk_content_meta_input($post->ID, '_hk_course_requirements',   'Requirements',           'One per line — what student needs before starting', 'textarea', ['rows' => 4]);
    hk_content_meta_input($post->ID, '_hk_course_outcomes',       'Learning Outcomes',      'One per line — what student will achieve',          'textarea', ['rows' => 4]);
    hk_content_meta_input($post->ID, '_hk_course_product_id',     'Linked WC Product ID',   'Optional: WooCommerce product ID for purchase. Leave blank if free.', 'number');
    hk_content_meta_input($post->ID, '_hk_course_video_intro',    'Intro Video URL',        'YouTube/Vimeo embed URL (optional)', 'url');
}

function hk_content_box_roadmap($post) {
    wp_nonce_field('hk_content_save_meta', 'hk_content_nonce');
    hk_content_meta_input($post->ID, '_hk_roadmap_career',          'Career Outcome',     'e.g. "Full-Stack Developer", "Data Analyst"');
    hk_content_meta_input($post->ID, '_hk_roadmap_hours_estimated', 'Estimated Hours',    'Total study time to complete the roadmap', 'number');
    hk_content_meta_input($post->ID, '_hk_roadmap_difficulty',      'Difficulty',         '', 'select', ['choices' => ['' => '— select —', 'beginner' => 'Beginner', 'intermediate' => 'Intermediate', 'advanced' => 'Advanced']]);
    hk_content_meta_input($post->ID, '_hk_roadmap_requirements',    'Prerequisites',      'One per line', 'textarea', ['rows' => 4]);
    hk_content_meta_input($post->ID, '_hk_roadmap_outcomes',        'Outcomes',           'One per line — what learner will be able to do', 'textarea', ['rows' => 4]);
    hk_content_meta_input($post->ID, '_hk_roadmap_outline',         'Roadmap Outline',
        'INDENTATION-BASED. Top level = section header (no indent). Nested topics use 2-space indent. Lines starting with "-" are topics. Format: "- Topic Name | optional description". Example: ' . "\n" .
        '# Foundations' . "\n" .
        '  - HTML & CSS | Build static pages' . "\n" .
        '  - JavaScript Basics | Variables, functions',
        'textarea', ['rows' => 14]);
    hk_content_meta_input($post->ID, '_hk_roadmap_json',            'Advanced JSON (optional)',
        'For advanced users only — overrides the outline above. JSON array of nodes: [{"id":"x","label":"X","parent":null,"description":"..."},...]',
        'textarea', ['rows' => 6]);
}

function hk_content_box_release($post) {
    wp_nonce_field('hk_content_save_meta', 'hk_content_nonce');
    hk_content_meta_input($post->ID, '_hk_release_date',       'Release Date / Time', 'When the event/release happens', 'datetime-local');
    hk_content_meta_input($post->ID, '_hk_release_type',       'Type',                'Tool release / championship / form deadline etc',
        'select', ['choices' => [
            '' => '— select —',
            'tool-release'  => 'Tool Release',
            'championship'  => 'Championship',
            'hackathon'     => 'Hackathon',
            'form-deadline' => 'Form Deadline',
            'ai-update'     => 'AI Update',
            'conference'    => 'Conference',
            'announcement'  => 'Announcement',
        ]]);
    hk_content_meta_input($post->ID, '_hk_release_source_url', 'Source URL',          'Link to official announcement', 'url');
    hk_content_meta_input($post->ID, '_hk_release_image_url',  'Cover Image URL',     'External image URL (or use Featured Image above)', 'url');
    hk_content_meta_input($post->ID, '_hk_release_summary',    'One-line Summary',    'Short summary shown on cards', 'textarea', ['rows' => 2]);
    hk_content_meta_input($post->ID, '_hk_release_tags',       'Tags',                'Comma-separated keywords for search');
}

/* ─── SAVE META ─────────────────────────────────────────────────── */
add_action('save_post', 'hk_content_save_meta_boxes', 10, 2);
function hk_content_save_meta_boxes($post_id, $post) {
    if (!in_array($post->post_type, ['hk_course', 'hk_roadmap', 'hk_release'], true)) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)        return;
    if (wp_is_post_revision($post_id))                      return;
    if (!isset($_POST['hk_content_nonce']))                 return;
    if (!wp_verify_nonce($_POST['hk_content_nonce'], 'hk_content_save_meta')) return;
    if (!current_user_can('edit_post', $post_id))           return;

    $allowed_keys = [
        'hk_course'  => ['_hk_course_level', '_hk_course_duration_weeks', '_hk_course_hours_total',
                         '_hk_course_price_inr', '_hk_course_tools', '_hk_course_chapters',
                         '_hk_course_requirements', '_hk_course_outcomes',
                         '_hk_course_product_id', '_hk_course_video_intro'],
        'hk_roadmap' => ['_hk_roadmap_career', '_hk_roadmap_hours_estimated', '_hk_roadmap_difficulty',
                         '_hk_roadmap_requirements', '_hk_roadmap_outcomes',
                         '_hk_roadmap_outline', '_hk_roadmap_json'],
        'hk_release' => ['_hk_release_date', '_hk_release_type', '_hk_release_source_url',
                         '_hk_release_image_url', '_hk_release_summary', '_hk_release_tags'],
    ];

    foreach ($allowed_keys[$post->post_type] as $key) {
        if (!isset($_POST[$key])) continue;
        $raw = $_POST[$key];
        if (in_array($key, ['_hk_course_chapters', '_hk_course_requirements', '_hk_course_outcomes',
                            '_hk_roadmap_requirements', '_hk_roadmap_outcomes',
                            '_hk_roadmap_outline', '_hk_roadmap_json',
                            '_hk_release_summary'], true)) {
            $clean = sanitize_textarea_field($raw);
        } elseif ($key === '_hk_release_date') {
            $clean = $raw ? date('Y-m-d H:i:s', strtotime($raw)) : '';
        } elseif (in_array($key, ['_hk_release_source_url', '_hk_release_image_url', '_hk_course_video_intro'], true)) {
            $clean = esc_url_raw($raw);
        } else {
            $clean = sanitize_text_field($raw);
        }
        update_post_meta($post_id, $key, $clean);
    }
}

/* ════════════════════════════════════════════════════════════════════
   SECTION 4: REST ENDPOINTS  (namespace hackknow/v1)
   ════════════════════════════════════════════════════════════════════ */

add_action('rest_api_init', 'hk_content_register_rest_routes');
function hk_content_register_rest_routes() {
    $public = ['permission_callback' => '__return_true'];

    /* ─── Read endpoints ─── */
    register_rest_route('hackknow/v1', '/courses',                array_merge($public, ['methods' => 'GET', 'callback' => 'hk_content_rest_courses_list']));
    register_rest_route('hackknow/v1', '/courses/(?P<slug>[a-z0-9-]+)', array_merge($public, ['methods' => 'GET', 'callback' => 'hk_content_rest_course_get']));
    register_rest_route('hackknow/v1', '/course-categories',      array_merge($public, ['methods' => 'GET', 'callback' => 'hk_content_rest_course_cats']));
    register_rest_route('hackknow/v1', '/roadmaps',               array_merge($public, ['methods' => 'GET', 'callback' => 'hk_content_rest_roadmaps_list']));
    register_rest_route('hackknow/v1', '/roadmaps/(?P<slug>[a-z0-9-]+)', array_merge($public, ['methods' => 'GET', 'callback' => 'hk_content_rest_roadmap_get']));
    register_rest_route('hackknow/v1', '/releases',               array_merge($public, ['methods' => 'GET', 'callback' => 'hk_content_rest_releases_list']));
    register_rest_route('hackknow/v1', '/release-types',          array_merge($public, ['methods' => 'GET', 'callback' => 'hk_content_rest_release_types']));

    /* ─── Verification (auth required, checked inside callback) ─── */
    register_rest_route('hackknow/v1', '/verify',                 array_merge($public, ['methods' => 'POST', 'callback' => 'hk_content_rest_verify_submit']));
    register_rest_route('hackknow/v1', '/verify/me',              array_merge($public, ['methods' => 'GET',  'callback' => 'hk_content_rest_verify_me']));
}

/* ─── helper: format a hk_course post for REST ─── */
function hk_content_format_course($p) {
    $cats = wp_get_post_terms($p->ID, 'hk_course_cat', ['fields' => 'all']);
    $cats_out = array_map(function($t) {
        return ['slug' => $t->slug, 'name' => $t->name, 'parent' => (int)$t->parent];
    }, $cats);

    $thumb = get_the_post_thumbnail_url($p->ID, 'large');

    $chapters_raw = (string) get_post_meta($p->ID, '_hk_course_chapters', true);
    $chapters = [];
    foreach (preg_split("/\r?\n/", $chapters_raw) as $line) {
        $line = trim($line);
        if (!$line) continue;
        $parts = array_map('trim', explode('|', $line));
        $chapters[] = [
            'title'       => $parts[0] ?? '',
            'hours'       => isset($parts[1]) ? (float)$parts[1] : null,
            'description' => $parts[2] ?? '',
        ];
    }

    $list = function($key) use ($p) {
        $raw = (string) get_post_meta($p->ID, $key, true);
        return array_values(array_filter(array_map('trim', preg_split("/\r?\n/", $raw))));
    };

    $tools_raw = (string) get_post_meta($p->ID, '_hk_course_tools', true);
    $tools = array_values(array_filter(array_map('trim', explode(',', $tools_raw))));

    return [
        'id'                => $p->ID,
        'slug'              => $p->post_name,
        'title'             => get_the_title($p),
        'excerpt'           => get_the_excerpt($p),
        'content_html'      => apply_filters('the_content', $p->post_content),
        'thumbnail'         => $thumb ?: null,
        'categories'        => $cats_out,
        'level'             => get_post_meta($p->ID, '_hk_course_level', true) ?: null,
        'duration_weeks'    => (int)  get_post_meta($p->ID, '_hk_course_duration_weeks', true),
        'hours_total'       => (float)get_post_meta($p->ID, '_hk_course_hours_total', true),
        'price_inr'         => (float)get_post_meta($p->ID, '_hk_course_price_inr', true),
        'tools'             => $tools,
        'chapters'          => $chapters,
        'requirements'      => $list('_hk_course_requirements'),
        'outcomes'          => $list('_hk_course_outcomes'),
        'product_id'        => (int)get_post_meta($p->ID, '_hk_course_product_id', true) ?: null,
        'video_intro'       => get_post_meta($p->ID, '_hk_course_video_intro', true) ?: null,
        'date_published'    => mysql2date('c', $p->post_date_gmt, false),
        'date_modified'     => mysql2date('c', $p->post_modified_gmt, false),
    ];
}

function hk_content_rest_courses_list(WP_REST_Request $req) {
    $args = [
        'post_type'      => 'hk_course',
        'post_status'    => 'publish',
        'posts_per_page' => min(50, max(1, (int)($req->get_param('per_page') ?: 20))),
        'paged'          => max(1, (int)($req->get_param('page') ?: 1)),
        'orderby'        => 'date',
        'order'          => 'DESC',
    ];
    if ($cat = $req->get_param('cat')) {
        $args['tax_query'] = [[ 'taxonomy' => 'hk_course_cat', 'field' => 'slug', 'terms' => sanitize_title($cat) ]];
    }
    if ($level = $req->get_param('level')) {
        $args['meta_query'] = [[ 'key' => '_hk_course_level', 'value' => sanitize_text_field($level) ]];
    }
    if ($s = $req->get_param('search')) {
        $args['s'] = sanitize_text_field($s);
    }
    $q = new WP_Query($args);
    $items = array_map('hk_content_format_course', $q->posts);
    return new WP_REST_Response([
        'items'       => $items,
        'total'       => (int)$q->found_posts,
        'total_pages' => (int)$q->max_num_pages,
        'page'        => (int)$args['paged'],
    ], 200);
}

function hk_content_rest_course_get(WP_REST_Request $req) {
    $slug = sanitize_title($req['slug']);
    $posts = get_posts(['name' => $slug, 'post_type' => 'hk_course', 'post_status' => 'publish', 'numberposts' => 1]);
    if (!$posts) return new WP_Error('not_found', 'Course not found', ['status' => 404]);
    return new WP_REST_Response(hk_content_format_course($posts[0]), 200);
}

function hk_content_rest_course_cats() {
    $terms = get_terms(['taxonomy' => 'hk_course_cat', 'hide_empty' => false]);
    if (is_wp_error($terms)) return new WP_REST_Response(['items' => []], 200);
    $out = array_map(function($t) {
        return [
            'id'          => (int)$t->term_id,
            'slug'        => $t->slug,
            'name'        => $t->name,
            'parent'      => (int)$t->parent,
            'description' => $t->description,
            'count'       => (int)$t->count,
        ];
    }, $terms);
    return new WP_REST_Response(['items' => $out], 200);
}

/* ─── helper: format a hk_roadmap post for REST ─── */
function hk_content_format_roadmap($p) {
    $list = function($key) use ($p) {
        $raw = (string) get_post_meta($p->ID, $key, true);
        return array_values(array_filter(array_map('trim', preg_split("/\r?\n/", $raw))));
    };

    /* Parse outline into nested tree */
    $outline_raw = (string) get_post_meta($p->ID, '_hk_roadmap_outline', true);
    $sections = [];
    $current_section = null;
    foreach (preg_split("/\r?\n/", $outline_raw) as $line) {
        if (trim($line) === '') continue;
        if (preg_match('/^\s*#\s+(.+)$/', $line, $m)) {
            $current_section = ['title' => trim($m[1]), 'topics' => []];
            $sections[] = &$current_section;
            unset($current_section);
            $current_section = &$sections[count($sections) - 1];
            continue;
        }
        if (preg_match('/^(\s*)-\s+(.+)$/', $line, $m)) {
            $indent = strlen($m[1]);
            $level  = (int) floor($indent / 2);
            $body   = trim($m[2]);
            $parts  = array_map('trim', explode('|', $body, 2));
            $topic  = ['name' => $parts[0], 'description' => $parts[1] ?? '', 'level' => $level];
            if ($current_section === null) {
                $current_section = ['title' => 'Untitled', 'topics' => []];
                $sections[] = &$current_section;
                unset($current_section);
                $current_section = &$sections[count($sections) - 1];
            }
            $current_section['topics'][] = $topic;
        }
    }
    unset($current_section);

    /* Optional advanced JSON override */
    $json_raw = trim((string) get_post_meta($p->ID, '_hk_roadmap_json', true));
    $nodes_json = null;
    if ($json_raw !== '') {
        $decoded = json_decode($json_raw, true);
        if (is_array($decoded)) $nodes_json = $decoded;
    }

    $careers = wp_get_post_terms($p->ID, 'hk_roadmap_career', ['fields' => 'all']);

    return [
        'id'             => $p->ID,
        'slug'           => $p->post_name,
        'title'          => get_the_title($p),
        'excerpt'        => get_the_excerpt($p),
        'content_html'   => apply_filters('the_content', $p->post_content),
        'thumbnail'      => get_the_post_thumbnail_url($p->ID, 'large') ?: null,
        'career'         => get_post_meta($p->ID, '_hk_roadmap_career', true) ?: null,
        'careers'        => array_map(function($t){return ['slug'=>$t->slug,'name'=>$t->name];}, $careers),
        'difficulty'     => get_post_meta($p->ID, '_hk_roadmap_difficulty', true) ?: null,
        'hours_estimated'=> (int) get_post_meta($p->ID, '_hk_roadmap_hours_estimated', true),
        'requirements'   => $list('_hk_roadmap_requirements'),
        'outcomes'       => $list('_hk_roadmap_outcomes'),
        'sections'       => $sections,
        'nodes_json'     => $nodes_json,
        'date_published' => mysql2date('c', $p->post_date_gmt, false),
    ];
}

function hk_content_rest_roadmaps_list(WP_REST_Request $req) {
    $args = [
        'post_type'      => 'hk_roadmap',
        'post_status'    => 'publish',
        'posts_per_page' => min(50, max(1, (int)($req->get_param('per_page') ?: 20))),
        'paged'          => max(1, (int)($req->get_param('page') ?: 1)),
        'orderby'        => 'date',
        'order'          => 'DESC',
    ];
    if ($s = $req->get_param('search')) $args['s'] = sanitize_text_field($s);
    $q = new WP_Query($args);
    return new WP_REST_Response([
        'items'       => array_map('hk_content_format_roadmap', $q->posts),
        'total'       => (int)$q->found_posts,
        'total_pages' => (int)$q->max_num_pages,
        'page'        => (int)$args['paged'],
    ], 200);
}

function hk_content_rest_roadmap_get(WP_REST_Request $req) {
    $slug = sanitize_title($req['slug']);
    $posts = get_posts(['name' => $slug, 'post_type' => 'hk_roadmap', 'post_status' => 'publish', 'numberposts' => 1]);
    if (!$posts) return new WP_Error('not_found', 'Roadmap not found', ['status' => 404]);
    return new WP_REST_Response(hk_content_format_roadmap($posts[0]), 200);
}

/* ─── helper: format hk_release ─── */
function hk_content_format_release($p) {
    $tags_raw = (string) get_post_meta($p->ID, '_hk_release_tags', true);
    $tags = array_values(array_filter(array_map('trim', explode(',', $tags_raw))));
    $img  = get_post_meta($p->ID, '_hk_release_image_url', true);
    if (!$img) $img = get_the_post_thumbnail_url($p->ID, 'large');
    return [
        'id'             => $p->ID,
        'slug'           => $p->post_name,
        'title'          => get_the_title($p),
        'summary'        => get_post_meta($p->ID, '_hk_release_summary', true) ?: get_the_excerpt($p),
        'content_html'   => apply_filters('the_content', $p->post_content),
        'release_date'   => get_post_meta($p->ID, '_hk_release_date', true) ?: null,
        'type'           => get_post_meta($p->ID, '_hk_release_type', true) ?: null,
        'source_url'     => get_post_meta($p->ID, '_hk_release_source_url', true) ?: null,
        'image'          => $img ?: null,
        'tags'           => $tags,
        'date_published' => mysql2date('c', $p->post_date_gmt, false),
    ];
}

function hk_content_rest_releases_list(WP_REST_Request $req) {
    $args = [
        'post_type'      => 'hk_release',
        'post_status'    => 'publish',
        'posts_per_page' => min(100, max(1, (int)($req->get_param('per_page') ?: 30))),
        'paged'          => max(1, (int)($req->get_param('page') ?: 1)),
        'meta_key'       => '_hk_release_date',
        'orderby'        => 'meta_value',
        'order'          => 'DESC',
    ];
    $meta = [];
    if ($type = $req->get_param('type')) {
        $args['tax_query'] = [[ 'taxonomy' => 'hk_release_type', 'field' => 'slug', 'terms' => sanitize_title($type) ]];
    }
    if ($from = $req->get_param('from')) {
        $meta[] = ['key' => '_hk_release_date', 'value' => date('Y-m-d H:i:s', strtotime($from)), 'compare' => '>=', 'type' => 'DATETIME'];
    }
    if ($to = $req->get_param('to')) {
        $meta[] = ['key' => '_hk_release_date', 'value' => date('Y-m-d H:i:s', strtotime($to)), 'compare' => '<=', 'type' => 'DATETIME'];
    }
    if ($meta) $args['meta_query'] = $meta;
    if ($s = $req->get_param('search')) $args['s'] = sanitize_text_field($s);

    $q = new WP_Query($args);
    return new WP_REST_Response([
        'items'       => array_map('hk_content_format_release', $q->posts),
        'total'       => (int)$q->found_posts,
        'total_pages' => (int)$q->max_num_pages,
        'page'        => (int)$args['paged'],
    ], 200);
}

function hk_content_rest_release_types() {
    $terms = get_terms(['taxonomy' => 'hk_release_type', 'hide_empty' => false]);
    if (is_wp_error($terms)) return new WP_REST_Response(['items' => []], 200);
    return new WP_REST_Response(['items' => array_map(function($t){
        return ['slug' => $t->slug, 'name' => $t->name, 'count' => (int)$t->count];
    }, $terms)], 200);
}

/* ════════════════════════════════════════════════════════════════════
   SECTION 5: VERIFICATION FLOW (MIS / Student)
   ════════════════════════════════════════════════════════════════════ */

/* POST /hackknow/v1/verify
   Body: { type: 'mis'|'student', proof_type: 'linkedin'|'id', proof_url?, proof_image_base64?, notes? }
   Auth: Bearer token (uses existing hackknow_authed_uid). */
function hk_content_rest_verify_submit(WP_REST_Request $req) {
    if (!function_exists('hackknow_authed_uid')) {
        return new WP_Error('server_misconfig', 'Auth helper missing', ['status' => 500]);
    }
    $uid = hackknow_authed_uid($req);
    if (is_wp_error($uid)) return $uid;
    if (!$uid)             return new WP_Error('unauthorized', 'Login required', ['status' => 401]);

    $type        = sanitize_text_field((string)$req->get_param('type'));
    $proof_type  = sanitize_text_field((string)$req->get_param('proof_type'));
    $proof_url   = esc_url_raw((string)$req->get_param('proof_url'));
    $proof_image = (string)$req->get_param('proof_image_base64');
    $notes       = sanitize_textarea_field((string)$req->get_param('notes'));

    if (!in_array($type, ['mis', 'student'], true)) {
        return new WP_Error('bad_request', 'type must be mis or student', ['status' => 400]);
    }
    if (!in_array($proof_type, ['linkedin', 'id'], true)) {
        return new WP_Error('bad_request', 'proof_type must be linkedin or id', ['status' => 400]);
    }
    if ($proof_type === 'linkedin' && !$proof_url) {
        return new WP_Error('bad_request', 'proof_url required for LinkedIn proof', ['status' => 400]);
    }
    if ($proof_type === 'id' && !$proof_image) {
        return new WP_Error('bad_request', 'proof_image_base64 required for ID proof', ['status' => 400]);
    }

    /* Cap base64 image size (~700KB raw → ~525KB binary) */
    if ($proof_image && strlen($proof_image) > 750000) {
        return new WP_Error('image_too_large', 'Image too large; please keep under 500KB', ['status' => 413]);
    }

    update_user_meta($uid, '_hk_verify_type',         $type);
    update_user_meta($uid, '_hk_verify_proof_type',   $proof_type);
    update_user_meta($uid, '_hk_verify_proof_url',    $proof_url);
    update_user_meta($uid, '_hk_verify_proof_image',  $proof_image);   // base64 data URL
    update_user_meta($uid, '_hk_verify_notes',        $notes);
    update_user_meta($uid, '_hk_verify_status',       'pending');
    update_user_meta($uid, '_hk_verify_submitted_at', current_time('mysql'));

    return new WP_REST_Response([
        'status'         => 'pending',
        'message'        => 'Submitted. Admin review usually within 24 hours.',
        'submitted_at'   => current_time('mysql'),
    ], 200);
}

function hk_content_rest_verify_me(WP_REST_Request $req) {
    if (!function_exists('hackknow_authed_uid')) {
        return new WP_Error('server_misconfig', 'Auth helper missing', ['status' => 500]);
    }
    $uid = hackknow_authed_uid($req);
    if (is_wp_error($uid)) return $uid;
    if (!$uid)             return new WP_Error('unauthorized', 'Login required', ['status' => 401]);

    $status = get_user_meta($uid, '_hk_verify_status', true);
    if (!$status) {
        return new WP_REST_Response(['status' => 'none'], 200);
    }

    $until = get_user_meta($uid, '_hk_verified_until', true);
    return new WP_REST_Response([
        'status'         => $status,
        'type'           => get_user_meta($uid, '_hk_verify_type', true) ?: null,
        'proof_type'     => get_user_meta($uid, '_hk_verify_proof_type', true) ?: null,
        'submitted_at'   => get_user_meta($uid, '_hk_verify_submitted_at', true) ?: null,
        'reviewed_at'    => get_user_meta($uid, '_hk_verify_reviewed_at',  true) ?: null,
        'verified_until' => $until ?: null,
        'is_active'      => ($status === 'approved' && (!$until || strtotime($until) > time())),
    ], 200);
}

/* ─── Admin verifications page ─── */
add_action('admin_menu', 'hk_content_register_verifications_page', 5);
function hk_content_register_verifications_page() {
    add_submenu_page(
        'hk_content_root',
        'Verifications',
        'Verifications',
        'manage_options',
        'hk_verifications',
        'hk_content_verifications_page'
    );
}

function hk_content_verifications_page() {
    if (!current_user_can('manage_options')) wp_die('Forbidden');

    /* Handle approve / reject */
    if (isset($_GET['action'], $_GET['user'], $_GET['_wpnonce'])
        && wp_verify_nonce($_GET['_wpnonce'], 'hk_verify_action')) {
        $target_uid = (int)$_GET['user'];
        $action     = sanitize_text_field($_GET['action']);
        if ($target_uid && get_userdata($target_uid)) {
            if ($action === 'approve') {
                update_user_meta($target_uid, '_hk_verify_status',     'approved');
                update_user_meta($target_uid, '_hk_verify_reviewed_at', current_time('mysql'));
                update_user_meta($target_uid, '_hk_verify_reviewed_by', get_current_user_id());
                $type = get_user_meta($target_uid, '_hk_verify_type', true);
                if ($type === 'student') {
                    update_user_meta($target_uid, '_hk_verified_until',
                        date('Y-m-d H:i:s', strtotime('+6 months')));
                } else {
                    /* MIS members get 1-year validity by default */
                    update_user_meta($target_uid, '_hk_verified_until',
                        date('Y-m-d H:i:s', strtotime('+1 year')));
                }
                hk_content_send_verification_email($target_uid, 'approved');
                echo '<div class="notice notice-success"><p>Approved user #' . (int)$target_uid . '</p></div>';
            } elseif ($action === 'reject') {
                update_user_meta($target_uid, '_hk_verify_status',     'rejected');
                update_user_meta($target_uid, '_hk_verify_reviewed_at', current_time('mysql'));
                update_user_meta($target_uid, '_hk_verify_reviewed_by', get_current_user_id());
                hk_content_send_verification_email($target_uid, 'rejected');
                echo '<div class="notice notice-warning"><p>Rejected user #' . (int)$target_uid . '</p></div>';
            }
        }
    }

    $tab = sanitize_text_field($_GET['tab'] ?? 'pending');
    echo '<div class="wrap"><h1>Verifications</h1>';
    echo '<h2 class="nav-tab-wrapper">';
    foreach (['pending' => 'Pending', 'approved' => 'Approved', 'rejected' => 'Rejected'] as $k => $l) {
        printf('<a href="%s" class="nav-tab%s">%s</a>',
            esc_url(add_query_arg(['page' => 'hk_verifications', 'tab' => $k], admin_url('admin.php'))),
            $tab === $k ? ' nav-tab-active' : '',
            esc_html($l));
    }
    echo '</h2>';

    $users = get_users([
        'meta_key'   => '_hk_verify_status',
        'meta_value' => $tab,
        'orderby'    => 'registered',
        'order'      => 'DESC',
        'number'     => 200,
    ]);

    if (!$users) {
        echo '<p style="margin-top:20px;">No ' . esc_html($tab) . ' verifications.</p></div>';
        return;
    }

    echo '<table class="wp-list-table widefat striped" style="margin-top:20px;"><thead><tr>';
    echo '<th>User</th><th>Type</th><th>Proof</th><th>Submitted</th><th>Verified Until</th><th>Actions</th>';
    echo '</tr></thead><tbody>';
    foreach ($users as $u) {
        $type        = get_user_meta($u->ID, '_hk_verify_type', true);
        $proof_type  = get_user_meta($u->ID, '_hk_verify_proof_type', true);
        $proof_url   = get_user_meta($u->ID, '_hk_verify_proof_url', true);
        $proof_image = get_user_meta($u->ID, '_hk_verify_proof_image', true);
        $submitted   = get_user_meta($u->ID, '_hk_verify_submitted_at', true);
        $until       = get_user_meta($u->ID, '_hk_verified_until', true);

        $proof_html = '';
        if ($proof_type === 'linkedin' && $proof_url) {
            $proof_html = '<a href="' . esc_url($proof_url) . '" target="_blank" rel="noopener">LinkedIn ↗</a>';
        } elseif ($proof_type === 'id' && $proof_image) {
            $proof_html = '<details><summary>View ID</summary><img src="' . esc_attr($proof_image) . '" style="max-width:400px;border:1px solid #ccc;margin-top:8px;" /></details>';
        }

        $approve_url = wp_nonce_url(add_query_arg(['page' => 'hk_verifications', 'tab' => $tab, 'action' => 'approve', 'user' => $u->ID], admin_url('admin.php')), 'hk_verify_action');
        $reject_url  = wp_nonce_url(add_query_arg(['page' => 'hk_verifications', 'tab' => $tab, 'action' => 'reject',  'user' => $u->ID], admin_url('admin.php')), 'hk_verify_action');

        echo '<tr>';
        printf('<td><strong>%s</strong><br><small>%s · ID %d</small></td>',
            esc_html($u->display_name ?: $u->user_login),
            esc_html($u->user_email),
            (int)$u->ID);
        printf('<td><span style="display:inline-block;padding:3px 8px;background:%s;color:#fff;font-weight:600;border-radius:3px;">%s</span></td>',
            $type === 'mis' ? '#FFD600' : '#5BFFB0',
            strtoupper(esc_html($type ?: '?')));
        echo '<td>' . $proof_html . '</td>';
        echo '<td>' . esc_html($submitted) . '</td>';
        echo '<td>' . esc_html($until ?: '—') . '</td>';
        echo '<td>';
        if ($tab !== 'approved') {
            echo '<a class="button button-primary" href="' . esc_url($approve_url) . '">Approve</a> ';
        }
        if ($tab !== 'rejected') {
            echo '<a class="button" href="' . esc_url($reject_url) . '" onclick="return confirm(\'Reject this verification?\');">Reject</a>';
        }
        echo '</td></tr>';
    }
    echo '</tbody></table></div>';
}

function hk_content_send_verification_email($uid, $status) {
    $u = get_userdata($uid);
    if (!$u) return;
    $type = get_user_meta($uid, '_hk_verify_type', true);
    if ($status === 'approved') {
        $subject = 'HackKnow ' . strtoupper($type) . ' verification approved 🎉';
        $body    = "Hi " . ($u->display_name ?: $u->user_login) . ",\n\n";
        if ($type === 'mis') {
            $body .= "Aapka MIS verification approve ho gaya hai. Ab MIS, Dashboards & Templates par 90% off automatically apply hoga checkout par.\n";
        } else {
            $body .= "Aapka Student verification approve ho gaya hai. Next 6 months ke liye saare courses 100% free hain. Login karke courses access karein.\n";
        }
        $body .= "\nVisit: https://www.hackknow.com\n\n— HackKnow Team";
    } else {
        $subject = 'HackKnow verification update';
        $body    = "Hi " . ($u->display_name ?: $u->user_login) . ",\n\n";
        $body   .= "Aapka verification request approve nahi ho saka. Aap firse submit kar sakte hain valid LinkedIn URL ya clear ID screenshot ke saath.\n\n— HackKnow Team";
    }
    wp_mail($u->user_email, $subject, $body);
}

/* ════════════════════════════════════════════════════════════════════
   SECTION 6: AUTO-COUPON APPLICATION
   ════════════════════════════════════════════════════════════════════ */

/* Auto-apply MIS90 / STUDENT6FREE in cart for verified users. */
add_action('woocommerce_cart_loaded_from_session', 'hk_content_auto_apply_member_coupons', 20);
add_action('woocommerce_calculate_totals',         'hk_content_auto_apply_member_coupons', 20);
function hk_content_auto_apply_member_coupons() {
    if (!is_user_logged_in() || !function_exists('WC') || !WC()->cart) return;
    $uid    = get_current_user_id();
    $type   = get_user_meta($uid, '_hk_verify_type',   true);
    $status = get_user_meta($uid, '_hk_verify_status', true);
    if ($status !== 'approved') return;

    $until = get_user_meta($uid, '_hk_verified_until', true);
    if ($until && strtotime($until) < time()) return;

    if ($type === 'mis') {
        if (!WC()->cart->has_discount('MIS90')) {
            WC()->cart->apply_coupon('MIS90');
        }
    } elseif ($type === 'student') {
        if (!WC()->cart->has_discount('STUDENT6FREE')) {
            WC()->cart->apply_coupon('STUDENT6FREE');
        }
    }
}

/* Gate the coupons: only verified members of the right type can use them. */
add_filter('woocommerce_coupon_is_valid', 'hk_content_gate_member_coupons', 10, 3);
function hk_content_gate_member_coupons($valid, $coupon, $discount = null) {
    $code = strtoupper($coupon->get_code());
    if (!in_array($code, ['MIS90', 'STUDENT6FREE'], true)) return $valid;

    if (!is_user_logged_in()) {
        throw new Exception('This coupon is for verified members only. Please log in.');
    }
    $uid    = get_current_user_id();
    $type   = get_user_meta($uid, '_hk_verify_type',   true);
    $status = get_user_meta($uid, '_hk_verify_status', true);
    if ($status !== 'approved') {
        throw new Exception('This coupon requires verification. Visit /verify on hackknow.com to apply.');
    }
    if ($code === 'MIS90' && $type !== 'mis') {
        throw new Exception('MIS90 is for verified MIS / data analysts only.');
    }
    if ($code === 'STUDENT6FREE') {
        if ($type !== 'student') {
            throw new Exception('STUDENT6FREE is for verified students only.');
        }
        $until = get_user_meta($uid, '_hk_verified_until', true);
        if ($until && strtotime($until) < time()) {
            throw new Exception('Your 6-month student window has expired.');
        }
    }
    return $valid;
}

/* ════════════════════════════════════════════════════════════════════
   SECTION 7: CORS for hackknow/v1 namespace
   ════════════════════════════════════════════════════════════════════ */

/* The base mu-plugin already sets permissive CORS via send_headers,
   but ensure OPTIONS preflight on hackknow/v1 returns 200 cleanly. */
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? esc_url_raw($_SERVER['HTTP_ORIGIN']) : '';
        $allowed = [
            'https://www.hackknow.com',
            'https://hackknow.com',
            'http://localhost:5173',
            'http://localhost:3000',
        ];
        if (in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        } else {
            header('Access-Control-Allow-Origin: *');
        }
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, Accept');
        if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            status_header(200);
            exit;
        }
        return $value;
    });
}, 15);
