<?php
/**
 * Plugin Name: HK Chat Dedupe Guard
 * Description: Rate-limits & dedupes POST /hackknow/v1/chat and /chat/history
 *              to stop runaway duplicate writes into wp_hk_chat_messages.
 *              Same (session+role+message_hash) within 60s → 200 OK without
 *              re-running the handler. Also caps any single session at 30 req/min.
 */
if (!defined('ABSPATH')) exit;

add_filter('rest_pre_dispatch', function ($result, $server, $request) {
    if ($result !== null) return $result;
    $route = $request->get_route();
    if (strpos($route, '/hackknow/v1/chat') !== 0) return $result;
    if (strtoupper($request->get_method()) !== 'POST') return $result;

    $body = $request->get_json_params();
    if (!is_array($body)) $body = $request->get_body_params();
    $session = isset($body['session_id']) ? (string)$body['session_id'] : '';
    if ($session === '') {
        $hdr = $request->get_header('x_session_id');
        if ($hdr) $session = (string)$hdr;
    }
    if ($session === '') return $result; // can't rate-limit without session

    $msg  = isset($body['message']) ? (string)$body['message'] : (isset($body['text']) ? (string)$body['text'] : '');
    $role = isset($body['role']) ? (string)$body['role'] : 'user';

    // Per-session global rate limit: 30 requests / 60s
    $rk = 'hkrl_' . md5($session);
    $cnt = (int) get_transient($rk);
    if ($cnt >= 30) {
        return new WP_REST_Response(['ok' => true, 'rate_limited' => true, 'message' => 'too many requests, slow down'], 200);
    }
    set_transient($rk, $cnt + 1, 60);

    // Dedupe: identical msg from same session within 60s → swallow
    if ($msg !== '') {
        $dk = 'hkdd_' . md5($session . '|' . $role . '|' . md5($msg));
        if (get_transient($dk)) {
            return new WP_REST_Response(['ok' => true, 'deduped' => true], 200);
        }
        set_transient($dk, 1, 60);
    }
    return $result;
}, 5, 3);
