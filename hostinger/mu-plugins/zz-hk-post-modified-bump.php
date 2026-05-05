<?php
/**
 * Plugin Name: HK Post-Modified Bump (one-shot, SEO)
 * Description: Bumps post_modified + post_modified_gmt for the two posts
 *              edited by the Hinglish purge (#1016, #1721) so sitemap
 *              lastmod refreshes and search engines recrawl. Self-disables
 *              after one run via wp_options guard.
 */
if ( ! defined( 'ABSPATH' ) ) exit;
add_action( 'init', function () {
    $GUARD = 'hk_post_modified_bump_v1_done';
    if ( get_option( $GUARD ) === 'yes' ) return;
    global $wpdb;
    $now_local = current_time( 'mysql' );
    $now_gmt   = current_time( 'mysql', 1 );
    $log = [];
    foreach ( [ 1016, 1721 ] as $pid ) {
        $ok = $wpdb->update(
            $wpdb->posts,
            [ 'post_modified' => $now_local, 'post_modified_gmt' => $now_gmt ],
            [ 'ID' => $pid ],
            [ '%s', '%s' ],
            [ '%d' ]
        );
        clean_post_cache( $pid );
        $log[] = "  #{$pid}: rows_affected={$ok}";
    }
    update_option( $GUARD, 'yes', false );
    error_log( '[hk-post-modified-bump] done: ' . implode( ' | ', $log ) );
}, 999 );
