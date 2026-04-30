<?php
/**
 * Plugin Name: HackKnow DB Tools
 * Description: Inspect WordPress / WooCommerce database bloat and run safe cleanups.
 *              All write actions require ?token={HK_DB_TOKEN}. Read-only inspection
 *              is open (returns sizes, counts, top entries — no PII).
 *
 * Endpoints (under /wp-json/hackknow-db/v1):
 *   GET  /summary                  — overall DB size, server vars, table count
 *   GET  /tables                   — top 30 tables by size + row counts
 *   GET  /autoload                 — autoloaded option size + top 30 keys
 *   GET  /transients               — transient counts (regular + site)
 *   GET  /actionscheduler          — Action Scheduler row counts per status
 *   GET  /revisions                — post revisions per post type (top 30)
 *   GET  /comments                 — spam / trash / unapproved comment counts
 *   GET  /wc-sessions              — WooCommerce sessions table size
 *   GET  /orphans                  — orphaned postmeta / commentmeta / usermeta
 *
 *   POST /clean/transients?token=  — delete expired transients (safe)
 *   POST /clean/revisions?token=   — keep last 3 revisions per post (safe)
 *   POST /clean/actionscheduler?token=  — delete completed/failed AS logs >7d (safe)
 *   POST /clean/wc-sessions?token= — delete expired WC sessions (safe)
 *   POST /clean/spam-comments?token= — delete spam + trash comments (safe)
 *   POST /clean/optimize?token=    — OPTIMIZE TABLE on big tables (safe, reclaims space)
 *   POST /clean/all?token=         — runs all of the above in sequence
 */

if (!defined('ABSPATH')) exit;

// Token: stored in WP option on first run so it survives.
function hk_db_token() {
    $t = get_option('hk_db_token', '');
    if (!$t) {
        $t = wp_generate_password(32, false, false);
        update_option('hk_db_token', $t, false);
    }
    return $t;
}

function hk_db_check_token(WP_REST_Request $r) {
    // Accept token via header (preferred) or query param for backward compat.
    $hdr = (string) $r->get_header('x_hk_db_token');
    $qp  = (string) $r->get_param('token');
    $supplied = $hdr !== '' ? $hdr : $qp;
    if ($supplied !== '' && hash_equals(hk_db_token(), $supplied)) return true;
    // Fallback: an authenticated admin.
    return current_user_can('manage_options');
}

// Token retrieval requires admin; never expose via public REST.
function hk_db_check_token_read(WP_REST_Request $r) {
    return current_user_can('manage_options');
}

// Force no-cache for the entire hackknow-db namespace so LiteSpeed/CDN never
// serves a stale token or stale stats. Without this, /token responses got
// cached for 16+ min by LSCache/Hostinger CDN.
add_filter('rest_post_dispatch', function ($response, $server, $request) {
    if (!($response instanceof WP_REST_Response)) return $response;
    if (strpos($request->get_route(), '/hackknow-db/v1') !== 0) return $response;
    $response->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, private');
    $response->header('Pragma', 'no-cache');
    $response->header('X-LiteSpeed-Cache-Control', 'no-cache');
    return $response;
}, 10, 3);

add_action('rest_api_init', function () {
    $ns = 'hackknow-db/v1';
    $public = ['permission_callback' => '__return_true'];
    $auth   = ['permission_callback' => 'hk_db_check_token'];

    register_rest_route($ns, '/summary',         array_merge(['methods'=>'GET',  'callback'=>'hk_db_summary'],         $public));
    register_rest_route($ns, '/tables',          array_merge(['methods'=>'GET',  'callback'=>'hk_db_tables'],          $public));
    register_rest_route($ns, '/autoload',        array_merge(['methods'=>'GET',  'callback'=>'hk_db_autoload'],        $public));
    register_rest_route($ns, '/transients',      array_merge(['methods'=>'GET',  'callback'=>'hk_db_transients'],      $public));
    register_rest_route($ns, '/actionscheduler', array_merge(['methods'=>'GET',  'callback'=>'hk_db_actionscheduler'], $public));
    register_rest_route($ns, '/revisions',       array_merge(['methods'=>'GET',  'callback'=>'hk_db_revisions'],       $public));
    register_rest_route($ns, '/comments',        array_merge(['methods'=>'GET',  'callback'=>'hk_db_comments'],        $public));
    register_rest_route($ns, '/wc-sessions',     array_merge(['methods'=>'GET',  'callback'=>'hk_db_wc_sessions'],     $public));
    register_rest_route($ns, '/orphans',         array_merge(['methods'=>'GET',  'callback'=>'hk_db_orphans'],         $public));
    register_rest_route($ns, '/token',           array_merge(['methods'=>'GET',  'callback'=>function(){ return ['token'=>hk_db_token()]; }], ['permission_callback'=>'hk_db_check_token_read']));

    register_rest_route($ns, '/clean/transients',      array_merge(['methods'=>'POST', 'callback'=>'hk_db_clean_transients'],      $auth));
    register_rest_route($ns, '/clean/revisions',       array_merge(['methods'=>'POST', 'callback'=>'hk_db_clean_revisions'],       $auth));
    register_rest_route($ns, '/clean/actionscheduler', array_merge(['methods'=>'POST', 'callback'=>'hk_db_clean_actionscheduler'], $auth));
    register_rest_route($ns, '/clean/wc-sessions',     array_merge(['methods'=>'POST', 'callback'=>'hk_db_clean_wc_sessions'],     $auth));
    register_rest_route($ns, '/clean/spam-comments',   array_merge(['methods'=>'POST', 'callback'=>'hk_db_clean_spam'],            $auth));
    register_rest_route($ns, '/clean/optimize',        array_merge(['methods'=>'POST', 'callback'=>'hk_db_clean_optimize'],        $auth));
    register_rest_route($ns, '/clean/all',             array_merge(['methods'=>'POST', 'callback'=>'hk_db_clean_all'],             $auth));
});

function hk_db_summary() {
    global $wpdb;
    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT
           ROUND(SUM(data_length+index_length)/1024/1024, 2) AS total_mb,
           ROUND(SUM(data_length)/1024/1024, 2)              AS data_mb,
           ROUND(SUM(index_length)/1024/1024, 2)             AS index_mb,
           ROUND(SUM(data_free)/1024/1024, 2)                AS free_mb,
           COUNT(*)                                          AS table_count
         FROM information_schema.tables WHERE table_schema = %s",
        DB_NAME
    ), ARRAY_A);
    return ['db_name' => DB_NAME, 'wp_prefix' => $wpdb->prefix] + ($row ?: []);
}

function hk_db_tables() {
    global $wpdb;
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT table_name AS tbl,
                ROUND((data_length+index_length)/1024/1024, 2) AS size_mb,
                ROUND(data_length/1024/1024, 2)               AS data_mb,
                ROUND(index_length/1024/1024, 2)              AS index_mb,
                ROUND(data_free/1024/1024, 2)                 AS free_mb,
                table_rows                                    AS rows_estimate,
                engine
         FROM information_schema.tables
         WHERE table_schema = %s
         ORDER BY (data_length+index_length) DESC
         LIMIT 30",
        DB_NAME
    ), ARRAY_A);
    return ['tables' => $rows];
}

function hk_db_autoload() {
    global $wpdb;
    $sum = $wpdb->get_row(
        "SELECT ROUND(SUM(LENGTH(option_value))/1024/1024, 2) AS autoload_mb,
                COUNT(*) AS autoload_count
         FROM {$wpdb->options} WHERE autoload IN ('yes','on')",
        ARRAY_A
    );
    $top = $wpdb->get_results(
        "SELECT option_name, ROUND(LENGTH(option_value)/1024, 2) AS size_kb
         FROM {$wpdb->options} WHERE autoload IN ('yes','on')
         ORDER BY LENGTH(option_value) DESC LIMIT 30",
        ARRAY_A
    );
    return ['summary' => $sum, 'top_autoloaded' => $top];
}

function hk_db_transients() {
    global $wpdb;
    $regular = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_%'");
    $expired = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->options}
         WHERE option_name LIKE '\\_transient\\_timeout\\_%' AND option_value < %d",
        time()
    ));
    $size_kb = $wpdb->get_var("SELECT ROUND(SUM(LENGTH(option_value))/1024,2) FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_%'");
    return ['regular_count' => (int)$regular, 'expired_count' => (int)$expired, 'total_size_kb' => (float)$size_kb];
}

function hk_db_actionscheduler() {
    global $wpdb;
    $tbl = $wpdb->prefix . 'actionscheduler_actions';
    $log = $wpdb->prefix . 'actionscheduler_logs';
    $exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $tbl));
    if (!$exists) return ['installed' => false];
    $by_status = $wpdb->get_results("SELECT status, COUNT(*) AS n FROM {$tbl} GROUP BY status", ARRAY_A);
    $logs_total = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$log}");
    $oldest = $wpdb->get_var("SELECT MIN(scheduled_date_gmt) FROM {$tbl}");
    return ['installed' => true, 'by_status' => $by_status, 'logs_total' => $logs_total, 'oldest_action' => $oldest];
}

function hk_db_revisions() {
    global $wpdb;
    $rows = $wpdb->get_results(
        "SELECT post_parent, COUNT(*) AS n
         FROM {$wpdb->posts}
         WHERE post_type = 'revision'
         GROUP BY post_parent
         ORDER BY n DESC LIMIT 30",
        ARRAY_A
    );
    $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='revision'");
    $auto  = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status='auto-draft'");
    $trash = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status='trash'");
    return ['total_revisions' => $total, 'auto_drafts' => $auto, 'trashed_posts' => $trash, 'top_30_posts' => $rows];
}

function hk_db_comments() {
    global $wpdb;
    $by_status = $wpdb->get_results("SELECT comment_approved AS status, COUNT(*) AS n FROM {$wpdb->comments} GROUP BY comment_approved", ARRAY_A);
    return ['by_status' => $by_status];
}

function hk_db_wc_sessions() {
    global $wpdb;
    $tbl = $wpdb->prefix . 'woocommerce_sessions';
    $exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $tbl));
    if (!$exists) return ['installed' => false];
    $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$tbl}");
    $expired = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$tbl} WHERE session_expiry < %d", time()));
    $size_mb = (float) $wpdb->get_var($wpdb->prepare(
        "SELECT ROUND((data_length+index_length)/1024/1024,2) FROM information_schema.tables
         WHERE table_schema=%s AND table_name=%s", DB_NAME, $tbl));
    return ['installed' => true, 'total' => $total, 'expired' => $expired, 'size_mb' => $size_mb];
}

function hk_db_orphans() {
    global $wpdb;
    $pm = (int) $wpdb->get_var(
        "SELECT COUNT(*) FROM {$wpdb->postmeta} pm
         LEFT JOIN {$wpdb->posts} p ON p.ID = pm.post_id
         WHERE p.ID IS NULL"
    );
    $cm = (int) $wpdb->get_var(
        "SELECT COUNT(*) FROM {$wpdb->commentmeta} cm
         LEFT JOIN {$wpdb->comments} c ON c.comment_ID = cm.comment_id
         WHERE c.comment_ID IS NULL"
    );
    return ['orphan_postmeta' => $pm, 'orphan_commentmeta' => $cm];
}

// --- CLEANUPS ---------------------------------------------------------------

function hk_db_clean_transients() {
    global $wpdb;
    $time = time();
    $expired = $wpdb->get_col($wpdb->prepare(
        "SELECT REPLACE(option_name,'_transient_timeout_','')
         FROM {$wpdb->options}
         WHERE option_name LIKE '\\_transient\\_timeout\\_%%' AND option_value < %d",
        $time
    ));
    $deleted = 0;
    foreach ($expired as $key) {
        delete_transient($key);
        $deleted++;
    }
    // also purge any orphan _transient_* without a _timeout_ partner via direct SQL
    $orphans = $wpdb->query(
        "DELETE FROM {$wpdb->options}
         WHERE option_name LIKE '\\_transient\\_%'
           AND option_name NOT LIKE '\\_transient\\_timeout\\_%'
           AND REPLACE(option_name, '_transient_', '_transient_timeout_') NOT IN (
             SELECT option_name FROM (SELECT option_name FROM {$wpdb->options}) AS o
           )"
    );
    return ['expired_purged' => $deleted, 'orphan_rows_removed' => (int)$orphans];
}

function hk_db_clean_revisions(WP_REST_Request $r) {
    global $wpdb;
    $keep = max(0, (int) ($r->get_param('keep') ?? 3));
    $rows = $wpdb->get_results(
        "SELECT post_parent, GROUP_CONCAT(ID ORDER BY post_modified DESC) AS ids
         FROM {$wpdb->posts}
         WHERE post_type='revision'
         GROUP BY post_parent",
        ARRAY_A
    );
    $deleted = 0;
    foreach ($rows as $row) {
        $ids = array_map('intval', explode(',', $row['ids']));
        $to_delete = array_slice($ids, $keep);
        foreach ($to_delete as $rid) {
            wp_delete_post_revision($rid);
            $deleted++;
        }
    }
    // also auto-drafts older than 30d
    $auto = (int) $wpdb->query(
        "DELETE FROM {$wpdb->posts}
         WHERE post_status='auto-draft' AND post_modified < DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );
    return ['revisions_deleted' => $deleted, 'auto_drafts_deleted' => $auto, 'kept_per_post' => $keep];
}

function hk_db_clean_actionscheduler() {
    global $wpdb;
    $a = $wpdb->prefix . 'actionscheduler_actions';
    $l = $wpdb->prefix . 'actionscheduler_logs';
    $c = $wpdb->prefix . 'actionscheduler_claims';
    $g = $wpdb->prefix . 'actionscheduler_groups';
    if (!$wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $a))) return ['installed' => false];

    // delete completed/failed/canceled actions older than 7 days; logs follow
    $del = (int) $wpdb->query(
        "DELETE FROM {$a}
         WHERE status IN ('complete','failed','canceled')
           AND scheduled_date_gmt < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)"
    );
    // orphan logs whose action no longer exists
    $logs = (int) $wpdb->query(
        "DELETE l FROM {$l} l
         LEFT JOIN {$a} a ON a.action_id = l.action_id
         WHERE a.action_id IS NULL"
    );
    // empty claims
    $claims = (int) $wpdb->query(
        "DELETE c FROM {$c} c
         LEFT JOIN {$a} a ON a.claim_id = c.claim_id
         WHERE a.claim_id IS NULL"
    );
    return ['actions_deleted' => $del, 'orphan_logs_deleted' => $logs, 'orphan_claims_deleted' => $claims];
}

function hk_db_clean_wc_sessions() {
    global $wpdb;
    $tbl = $wpdb->prefix . 'woocommerce_sessions';
    if (!$wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $tbl))) return ['installed' => false];
    $del = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tbl} WHERE session_expiry < %d", time()));
    return ['expired_sessions_deleted' => $del];
}

function hk_db_clean_spam() {
    global $wpdb;
    $del = (int) $wpdb->query("DELETE FROM {$wpdb->comments} WHERE comment_approved IN ('spam','trash')");
    // orphan commentmeta cleanup
    $cm  = (int) $wpdb->query("DELETE cm FROM {$wpdb->commentmeta} cm LEFT JOIN {$wpdb->comments} c ON c.comment_ID=cm.comment_id WHERE c.comment_ID IS NULL");
    return ['spam_trash_comments_deleted' => $del, 'orphan_commentmeta_deleted' => $cm];
}

function hk_db_clean_optimize() {
    global $wpdb;
    $tables = $wpdb->get_col($wpdb->prepare(
        "SELECT table_name FROM information_schema.tables
         WHERE table_schema=%s AND data_free > 1024*1024
         ORDER BY data_free DESC LIMIT 30",
        DB_NAME
    ));
    $results = [];
    foreach ($tables as $t) {
        $r = $wpdb->get_row("OPTIMIZE TABLE `{$t}`", ARRAY_A);
        $results[$t] = $r['Msg_text'] ?? 'ok';
    }
    return ['optimized' => $results];
}

function hk_db_clean_all(WP_REST_Request $r) {
    // NOTE: OPTIMIZE TABLE intentionally NOT included. It rebuilds InnoDB tables
    // and can lock checkout/order writes. Run /clean/optimize manually only in a
    // maintenance window and only against an explicit table allowlist if needed.
    return [
        'transients'      => hk_db_clean_transients(),
        'revisions'       => hk_db_clean_revisions($r),
        'actionscheduler' => hk_db_clean_actionscheduler(),
        'wc_sessions'     => hk_db_clean_wc_sessions(),
        'spam_comments'   => hk_db_clean_spam(),
    ];
}
