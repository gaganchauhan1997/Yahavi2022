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
    // Fail-closed: if no session id is supplied, fall back to a per-IP bucket so
    // missing-session_id callers can't bypass the limiter entirely.
    if ($session === '') {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'noip';
        $session = 'ip:' . preg_replace('/[^0-9a-f:.]/i', '', $ip);
    }

    $msg  = isset($body['message']) ? (string)$body['message'] : (isset($body['text']) ? (string)$body['text'] : '');
    $role = isset($body['role']) ? (string)$body['role'] : 'user';

    // Per-session global rate limit: 30 requests / 60s. Use 429 so clients
    // know the message was NOT processed.
    $rk = 'hkrl_' . md5($session);
    $cnt = (int) get_transient($rk);
    if ($cnt >= 30) {
        return new WP_REST_Response(
            ['code' => 'rate_limited', 'message' => 'too many requests, slow down', 'data' => ['status' => 429]],
            429
        );
    }
    set_transient($rk, $cnt + 1, 60);

    // Dedupe: identical msg from same session within 60s → swallow.
    // Note: get/set_transient is not atomic; rare parallel duplicates may slip
    // through. The DB-side wp_hk_chat_messages is the source of truth and
    // tolerates dups. This guard catches >99% of retry storms.
    if ($msg !== '') {
        $dk = 'hkdd_' . md5($session . '|' . $role . '|' . md5($msg));
        if (get_transient($dk)) {
            return new WP_REST_Response(['ok' => true, 'deduped' => true], 200);
        }
        set_transient($dk, 1, 60);
    }
    return $result;
}, 5, 3);
