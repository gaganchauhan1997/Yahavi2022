<?php
/**
 * Plugin Name: HK Hinglish Purge — APPLY (one-shot)
 * Description: Replaces Hinglish phrases in wp_posts.post_content,
 *              wp_posts.post_excerpt, and wp_postmeta with enterprise
 *              English. Uses $wpdb->update directly (NOT wp_update_post)
 *              to bypass kses and preserve inline styles, links, tables.
 *              Backs up original values to wp_options before each write
 *              (rollback-safe). Self-disables after one run via guard.
 *              Writes verification JSON next to this file.
 *
 * Standing rules: read/write only on wp_posts + wp_postmeta + wp_options
 *                 (rollback). Does NOT touch SMTP/auth/login/email infra.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'init', function () {
    $GUARD = 'hk_hinglish_apply_v1_done';
    if ( get_option( $GUARD ) === 'yes' ) return;

    global $wpdb;
    $log = [
        'started_at' => date('c'),
        'updates'    => [],
        'verify'     => [],
    ];

    /**
     * Helper — apply a list of (old, new) string replacements to a single
     * stored field of a single post. Backs up the original to wp_options
     * before writing. Skips silently if NO replacements actually changed
     * the value (idempotent).
     */
    $apply = function( $post_id, $field, $pairs ) use ( $wpdb, &$log ) {
        $row = $wpdb->get_row( $wpdb->prepare(
            "SELECT ID, post_title, {$field} AS val FROM {$wpdb->posts} WHERE ID = %d",
            $post_id
        ), ARRAY_A );
        if ( ! $row ) {
            $log['updates'][] = [ 'post_id'=>$post_id, 'field'=>$field, 'status'=>'not_found' ];
            return;
        }
        $orig = (string) $row['val'];
        $next = $orig;
        $hits = [];
        foreach ( $pairs as $i => $pair ) {
            list( $old, $new ) = $pair;
            if ( $old !== '' && strpos( $next, $old ) !== false ) {
                $next = str_replace( $old, $new, $next );
                $hits[] = $i;
            }
        }
        if ( $next === $orig ) {
            $log['updates'][] = [
                'post_id'=>$post_id, 'title'=>$row['post_title'], 'field'=>$field,
                'status'=>'no_change_needed', 'pairs_total'=>count($pairs),
            ];
            return;
        }
        // Backup original (autoload=no, never expires; rollback-safe)
        $backup_key = "hk_hinglish_backup_{$post_id}_{$field}_v1";
        update_option( $backup_key, $orig, false );

        // Direct UPDATE — bypasses kses so inline styles/links survive
        $ok = $wpdb->update(
            $wpdb->posts,
            [ $field => $next ],
            [ 'ID' => $post_id ],
            [ '%s' ],
            [ '%d' ]
        );
        clean_post_cache( $post_id );

        $log['updates'][] = [
            'post_id'      => $post_id,
            'title'        => $row['post_title'],
            'field'        => $field,
            'status'       => $ok === false ? 'wpdb_error' : 'updated',
            'wpdb_result'  => $ok,
            'pairs_total'  => count( $pairs ),
            'pairs_hit'    => $hits,
            'len_before'   => strlen( $orig ),
            'len_after'    => strlen( $next ),
            'backup_key'   => $backup_key,
        ];
    };

    /**
     * Helper — apply pairs to one specific postmeta row by meta_id.
     * Backs up to wp_options. Idempotent.
     */
    $apply_meta = function( $meta_id, $pairs ) use ( $wpdb, &$log ) {
        $row = $wpdb->get_row( $wpdb->prepare(
            "SELECT meta_id, post_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE meta_id = %d",
            $meta_id
        ), ARRAY_A );
        if ( ! $row ) {
            $log['updates'][] = [ 'meta_id'=>$meta_id, 'status'=>'not_found' ];
            return;
        }
        $orig = (string) $row['meta_value'];
        $next = $orig;
        $hits = [];
        foreach ( $pairs as $i => $pair ) {
            list( $old, $new ) = $pair;
            if ( $old !== '' && strpos( $next, $old ) !== false ) {
                $next = str_replace( $old, $new, $next );
                $hits[] = $i;
            }
        }
        if ( $next === $orig ) {
            $log['updates'][] = [
                'meta_id'=>$meta_id, 'post_id'=>$row['post_id'], 'meta_key'=>$row['meta_key'],
                'status'=>'no_change_needed',
            ];
            return;
        }
        $backup_key = "hk_hinglish_backup_meta_{$meta_id}_v1";
        update_option( $backup_key, $orig, false );

        $ok = $wpdb->update(
            $wpdb->postmeta,
            [ 'meta_value' => $next ],
            [ 'meta_id' => $meta_id ],
            [ '%s' ],
            [ '%d' ]
        );
        wp_cache_delete( $row['post_id'], 'post_meta' );

        $log['updates'][] = [
            'meta_id'    => $meta_id,
            'post_id'    => $row['post_id'],
            'meta_key'   => $row['meta_key'],
            'status'     => $ok === false ? 'wpdb_error' : 'updated',
            'pairs_hit'  => $hits,
            'backup_key' => $backup_key,
        ];
    };

    // ╔═══════════════════════════════════════════════════════════════╗
    // ║  POST #1016 — hk_brainx "Pivot Logic: Count Unique Depts"     ║
    // ╚═══════════════════════════════════════════════════════════════╝
    $p1016_pairs = [
        [
            'Kitne unique departments hain? Count likhein <strong>D1</strong> mein.',
            'How many unique departments are there? Enter the count in <strong>D1</strong>.',
        ],
    ];
    $apply( 1016, 'post_content', $p1016_pairs );
    $apply_meta( 2901, $p1016_pairs );

    // ╔═══════════════════════════════════════════════════════════════╗
    // ║  POST #1721 — product "Python Mastery — Complete Course"      ║
    // ╚═══════════════════════════════════════════════════════════════╝

    // post_excerpt — 2 Hinglish lines
    $p1721_excerpt_pairs = [
        [
            'Pure 25-chapter Python course aap <a href="/python-course-free/" style="color:#FF6B35;font-weight:600">website pe FREE padh sakte hain</a> — koi charge nahi.',
            'The complete 25-chapter Python course is available <a href="/python-course-free/" style="color:#FF6B35;font-weight:600">to read for FREE on our website</a> — no charge.',
        ],
        [
            '<strong style="color:#0D1B4C">💰 ₹99 charge sirf:</strong> Offline ZIP download ke liye (sabhi 25 PDFs ek single download mein, lifetime offline access).',
            '<strong style="color:#0D1B4C">💰 ₹99 charge applies only:</strong> for the offline ZIP download (all 25 PDFs in a single download, with lifetime offline access).',
        ],
    ];
    $apply( 1721, 'post_excerpt', $p1721_excerpt_pairs );

    // post_content — 3 Hinglish blocks
    $p1721_content_pairs = [
        [
            '<strong style="color:#FF6B35">FREE option:</strong> Saare 25 chapters HackKnow website pe <a href="/python-course-free/" style="color:#FF6B35;font-weight:600">FREE padh sakte hain</a>. Online reading ka koi charge nahi hai. Bas Python seekhna chahte ho? <a href="/python-course-free/" style="color:#FF6B35;font-weight:600">→ Yahaan jao, free padho</a>.',
            '<strong style="color:#FF6B35">FREE option:</strong> All 25 chapters are available <a href="/python-course-free/" style="color:#FF6B35;font-weight:600">to read for FREE on the HackKnow website</a>. Online reading is completely free of charge. Just want to learn Python? <a href="/python-course-free/" style="color:#FF6B35;font-weight:600">→ Go here and start reading for free</a>.',
        ],
        [
            '<strong style="color:#FF6B35">₹99 paid option (this product):</strong> Sirf agar aap <strong>offline ZIP download</strong> chahte ho — sab 25 PDFs ek single ZIP mein download hote hain, jise aap apne computer/phone pe save karke kabhi bhi without internet padh sakte ho. Yeh charge sirf offline access ke liye hai.',
            '<strong style="color:#FF6B35">₹99 paid option (this product):</strong> Only if you want the <strong>offline ZIP download</strong> — all 25 PDFs are bundled into a single ZIP that you can save to your computer or phone and read anytime, even without an internet connection. This charge is purely for offline access.',
        ],
        [
            '<strong>💡 Quick decision:</strong> Sirf padhna hai? <a href="/python-course-free/" style="color:#FF6B35;font-weight:600">FREE pe jao</a>. Offline / commute / no-WiFi study karna hai? Yahaan se ₹99 ZIP le lo.',
            '<strong>💡 Quick decision:</strong> Just want to read? <a href="/python-course-free/" style="color:#FF6B35;font-weight:600">Go to the FREE version</a>. Need offline study, commute reading, or no-WiFi access? Get the ₹99 ZIP from here.',
        ],
    ];
    $apply( 1721, 'post_content', $p1721_content_pairs );

    // ╔═══════════════════════════════════════════════════════════════╗
    // ║  Verification re-scan — confirm no Hinglish remains in either ║
    // ╚═══════════════════════════════════════════════════════════════╝
    $verify_phrases = [
        'Kitne unique departments', 'Count likhein', 'likhein D1',
        'padh sakte hain', 'padh sakte ho', 'koi charge nahi',
        'Saare 25 chapters', 'Bas Python seekhna', 'Yahaan jao',
        'Sirf agar aap', 'chahte ho', 'sab 25 PDFs', 'kabhi bhi without',
        'Sirf padhna hai', 'FREE pe jao', 'Yahaan se',
        'charge sirf', 'ke liye hai',
    ];
    foreach ( $verify_phrases as $phr ) {
        $like = '%' . $wpdb->esc_like( $phr ) . '%';
        $cnt = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->posts}
              WHERE (post_content LIKE %s OR post_excerpt LIKE %s)
                AND post_status IN ('publish','draft','private','pending')",
            $like, $like
        ) );
        $cnt_meta = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_value LIKE %s",
            $like
        ) );
        $log['verify'][ $phr ] = [ 'posts' => $cnt, 'postmeta' => $cnt_meta ];
    }

    $log['finished_at'] = date('c');
    @file_put_contents(
        __DIR__ . '/hk-hinglish-apply-results.json',
        json_encode( $log, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES )
    );
    @chmod( __DIR__ . '/hk-hinglish-apply-results.json', 0644 );

    update_option( $GUARD, 'yes', false );
    error_log( '[hk-hinglish-apply] complete: ' . count($log['updates']) . ' updates, '
             . array_sum( array_map( function($v){ return $v['posts']+$v['postmeta']; }, $log['verify'] ) )
             . ' total leftover hits' );
}, 999 );
