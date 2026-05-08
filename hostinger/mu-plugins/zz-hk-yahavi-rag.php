<?php
/**
 * Plugin Name: HackKnow — Yahavi v2 RAG Persistence Bridge
 * Description: Persists Yahavi v2 chat exchanges generated at the Cloudflare edge.
 *              The frontend POSTs each turn (user msg + AI reply + grounding sources)
 *              to /wp-json/hackknow/v1/chat/log so the existing wp_hk_chat_messages
 *              ledger stays the single source of truth for analytics, RLHF, and
 *              the Yahavi history side-rail.
 *              Also extends wp_hk_chat_messages with a `grounding_sources` JSON
 *              column so we can track which RAG docs each reply was grounded on.
 *
 *              Loads AFTER hackknow-checkout.php (zz-* prefix) so it can call
 *              hk_chat_messages_table() and other helpers.
 *
 * Version:     1.0.0
 * Author:      HackKnow
 *
 * Standing rules respected:
 *   - DOES NOT modify hackknow-checkout.php (PROTECTED).
 *   - DOES NOT modify zz-hackknow-payment-fix.php (PROTECTED).
 *   - English-only error messages.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

/* ---------- Schema migration: add grounding_sources column ---------- */

add_action( 'init', function () {
    if ( get_option( 'hk_yahavi_v2_schema_v', '' ) === '1' ) return;
    if ( ! function_exists( 'hk_chat_messages_table' ) ) return;  // checkout.php not loaded yet

    global $wpdb;
    $tbl = hk_chat_messages_table();
    // Suppress errors so a non-existent column probe doesn't litter the log.
    $wpdb->suppress_errors( true );
    $col = $wpdb->get_results( "SHOW COLUMNS FROM `{$tbl}` LIKE 'grounding_sources'" );
    $wpdb->suppress_errors( false );
    if ( empty( $col ) ) {
        // LONGTEXT — JSON of [{id, title, kind}, …]; nullable.
        $wpdb->query( "ALTER TABLE `{$tbl}` ADD COLUMN `grounding_sources` LONGTEXT NULL AFTER `meta`" );
    }
    update_option( 'hk_yahavi_v2_schema_v', '1', false );
}, 20 );

/* ---------- REST: POST /wp-json/hackknow/v1/chat/log ---------- */

add_action( 'rest_api_init', function () {
    register_rest_route( 'hackknow/v1', '/chat/log', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'permission_callback' => '__return_true',  // public — same surface as /chat
        'callback'            => 'hk_yahavi_v2_log_exchange',
        'args' => array(
            'session_id'     => array( 'required' => true,  'type' => 'string' ),
            'user_message'   => array( 'required' => true,  'type' => 'string' ),
            'bot_reply'      => array( 'required' => true,  'type' => 'string' ),
            'model_used'     => array( 'required' => false, 'type' => 'string' ),
            'tokens_in'      => array( 'required' => false, 'type' => 'integer' ),
            'tokens_out'     => array( 'required' => false, 'type' => 'integer' ),
            'grounding'      => array( 'required' => false, 'type' => 'array' ),
        ),
    ) );
} );

/**
 * Persist one chat exchange (user turn + bot turn) to wp_hk_chat_messages.
 * Idempotent on (session_id, user_message, bot_reply) within a 60s window —
 * matches the dedupe guarantee of zz-hk-chat-guard.php.
 *
 * @return WP_REST_Response { ok:true, user_message_id, bot_message_id }
 */
function hk_yahavi_v2_log_exchange( WP_REST_Request $req ) {
    if ( ! function_exists( 'hk_chat_messages_table' ) ) {
        return new WP_REST_Response( array( 'ok' => false, 'error' => 'checkout_helpers_unavailable' ), 503 );
    }
    global $wpdb;
    $tbl = hk_chat_messages_table();

    $sid     = trim( (string) $req->get_param( 'session_id' ) );
    $u_msg   = trim( (string) $req->get_param( 'user_message' ) );
    $b_reply = trim( (string) $req->get_param( 'bot_reply' ) );

    if ( $sid === '' || $u_msg === '' || $b_reply === '' ) {
        return new WP_REST_Response( array( 'ok' => false, 'error' => 'missing_fields' ), 400 );
    }
    if ( strlen( $u_msg ) > 4000 || strlen( $b_reply ) > 16000 ) {
        return new WP_REST_Response( array( 'ok' => false, 'error' => 'payload_too_large' ), 413 );
    }

    // Dedupe: skip if an identical (sid, role=user, content) row exists in the last 60s.
    $dup = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM `{$tbl}` WHERE session_id=%s AND role='user' AND content=%s
         AND created_at > (NOW() - INTERVAL 60 SECOND) LIMIT 1",
        $sid, $u_msg
    ) );
    if ( $dup ) {
        return new WP_REST_Response( array( 'ok' => true, 'deduped' => true ), 200 );
    }

    $user_id = get_current_user_id() ?: null;
    $ip      = isset( $_SERVER['HTTP_X_FORWARDED_FOR'] )
        ? trim( explode( ',', $_SERVER['HTTP_X_FORWARDED_FOR'] )[0] )
        : ( $_SERVER['REMOTE_ADDR'] ?? '' );

    $grounding = $req->get_param( 'grounding' );
    $grounding_json = is_array( $grounding ) ? wp_json_encode( array_slice( $grounding, 0, 8 ) ) : null;

    $meta_arr = array(
        'v'         => 2,
        'model'     => sanitize_text_field( (string) ( $req->get_param( 'model_used' ) ?? '' ) ),
        'tokens_in' => (int) ( $req->get_param( 'tokens_in' ) ?? 0 ),
        'tokens_out'=> (int) ( $req->get_param( 'tokens_out' ) ?? 0 ),
    );

    // user row
    $wpdb->insert( $tbl, array(
        'session_id' => $sid,
        'user_id'    => $user_id,
        'role'       => 'user',
        'content'    => $u_msg,
        'ip'         => $ip,
        'created_at' => current_time( 'mysql', true ),
        'meta'       => null,
    ) );
    $u_id = (int) $wpdb->insert_id;

    // bot row (carries grounding sources + model metadata)
    $wpdb->insert( $tbl, array(
        'session_id'        => $sid,
        'user_id'           => $user_id,
        'role'              => 'bot',
        'content'           => $b_reply,
        'ip'                => $ip,
        'created_at'        => current_time( 'mysql', true ),
        'meta'              => wp_json_encode( $meta_arr ),
        'grounding_sources' => $grounding_json,
    ) );
    $b_id = (int) $wpdb->insert_id;

    return new WP_REST_Response( array(
        'ok'               => true,
        'user_message_id'  => $u_id,
        'bot_message_id'   => $b_id,
    ), 200 );
}
