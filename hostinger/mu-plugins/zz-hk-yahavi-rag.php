<?php
/**
 * Plugin Name: HackKnow — Yahavi v2 RAG Persistence Bridge
 * Description: Persists Yahavi v2 chat exchanges generated at the Cloudflare edge.
 *              Uses the existing hackknow_chat_insert_row() helper from
 *              hackknow-checkout.php so the table contract stays in one place.
 *              Grounding sources, model, and token usage are stashed into the
 *              existing `meta` JSON column — NO schema change required.
 *
 *              Loads AFTER hackknow-checkout.php (zz-* prefix) so the helper
 *              is guaranteed to be defined.
 *
 * Version:     1.0.2
 * Author:      HackKnow
 *
 * Standing rules respected:
 *   - DOES NOT modify hackknow-checkout.php (PROTECTED).
 *   - DOES NOT modify zz-hackknow-payment-fix.php (PROTECTED).
 *   - English-only error messages.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

/* ---------- REST: POST /wp-json/hackknow/v1/chat/log ---------- */

add_action( 'rest_api_init', function () {
    register_rest_route( 'hackknow/v1', '/chat/log', array(
        'methods'             => WP_REST_Server::CREATABLE,
        'permission_callback' => '__return_true',
        'callback'            => 'hk_yahavi_v2_log_exchange',
        'args' => array(
            'session_id'   => array( 'required' => true,  'type' => 'string' ),
            'user_message' => array( 'required' => true,  'type' => 'string' ),
            'bot_reply'    => array( 'required' => true,  'type' => 'string' ),
            'model_used'   => array( 'required' => false, 'type' => 'string' ),
            'tokens_in'    => array( 'required' => false, 'type' => 'integer' ),
            'tokens_out'   => array( 'required' => false, 'type' => 'integer' ),
            'grounding'    => array( 'required' => false, 'type' => 'array' ),
        ),
    ) );
} );

/**
 * Persist one chat exchange (user turn + bot turn) to wp_hk_chat_messages
 * via the canonical hackknow_chat_insert_row() helper.
 *
 * Idempotent on (session_id, user_message) within a 60s window.
 */
function hk_yahavi_v2_log_exchange( WP_REST_Request $req ) {
    if ( ! function_exists( 'hackknow_chat_insert_row' ) ) {
        return new WP_REST_Response( array( 'ok' => false, 'error' => 'helper_unavailable' ), 503 );
    }
    global $wpdb;
    $tbl = $wpdb->prefix . 'hk_chat_messages';

    $sid     = trim( (string) $req->get_param( 'session_id' ) );
    $u_msg   = trim( (string) $req->get_param( 'user_message' ) );
    $b_reply = trim( (string) $req->get_param( 'bot_reply' ) );

    if ( $sid === '' || $u_msg === '' || $b_reply === '' ) {
        return new WP_REST_Response( array( 'ok' => false, 'error' => 'missing_fields' ), 400 );
    }
    if ( strlen( $u_msg ) > 4000 || strlen( $b_reply ) > 16000 ) {
        return new WP_REST_Response( array( 'ok' => false, 'error' => 'payload_too_large' ), 413 );
    }

    // Dedupe: skip if an identical (sid, role=user, message) row exists in the last 60s.
    $dup = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM `{$tbl}` WHERE session_id=%s AND role='user' AND message=%s
         AND created_at > (NOW() - INTERVAL 60 SECOND) LIMIT 1",
        $sid, $u_msg
    ) );
    if ( $dup ) {
        return new WP_REST_Response( array( 'ok' => true, 'deduped' => true ), 200 );
    }

    $user_id    = (int) ( get_current_user_id() ?: 0 );
    $user_email = '';
    if ( $user_id ) {
        $u = get_userdata( $user_id );
        if ( $u && ! empty( $u->user_email ) ) $user_email = $u->user_email;
    }

    // Stash all v2 telemetry into `meta` (existing LONGTEXT JSON column).
    $grounding = $req->get_param( 'grounding' );
    $bot_meta  = array(
        'v'         => 2,
        'model'     => sanitize_text_field( (string) ( $req->get_param( 'model_used' ) ?? '' ) ),
        'tokens_in' => (int) ( $req->get_param( 'tokens_in' ) ?? 0 ),
        'tokens_out'=> (int) ( $req->get_param( 'tokens_out' ) ?? 0 ),
        'grounding' => is_array( $grounding ) ? array_slice( $grounding, 0, 8 ) : array(),
    );

    $u_id = hackknow_chat_insert_row( $user_id, $user_email, $sid, 'user', $u_msg, array( 'v' => 2 ) );
    $b_id = hackknow_chat_insert_row( $user_id, $user_email, $sid, 'bot',  $b_reply, $bot_meta );

    if ( ! $u_id || ! $b_id ) {
        return new WP_REST_Response( array(
            'ok'    => false,
            'error' => 'insert_failed',
            'detail'=> $wpdb->last_error ?: 'unknown',
        ), 500 );
    }
    return new WP_REST_Response( array(
        'ok'              => true,
        'user_message_id' => (int) $u_id,
        'bot_message_id'  => (int) $b_id,
    ), 200 );
}
