<?php
/**
 * Plugin Name: HackKnow — hk/v1 JWT Bridge
 * Description: Honours the same Bearer token that hackknow-checkout.php
 *              issues, but on /wp-json/hk/v1/* requests too. Without this,
 *              the YAVI wallet UI shows "Sorry, you are not allowed to
 *              do that." because hackknow-checkout's JWT verification is
 *              only invoked manually inside hackknow/v1 route handlers,
 *              so the hk/v1 wallet routes (which use is_user_logged_in())
 *              never see the authenticated user.
 *
 *              This shim wires the existing hackknow_verify_token() into
 *              WordPress's determine_current_user filter, scoped to
 *              /hk/v1/* URIs only. Every other namespace is untouched.
 *
 * Version:     1.0.0
 *
 * Loads AFTER the namespace-defining plugin thanks to the zz- filename
 * prefix. Modifying the protected hackknow-checkout.php is NOT required.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_filter( 'determine_current_user', function ( $user_id ) {
    // Only act inside REST requests targeting /hk/v1/*
    $uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '';
    if ( strpos( $uri, '/wp-json/hk/v1/' ) === false
      && strpos( $uri, 'rest_route=/hk/v1/' ) === false ) {
        return $user_id;
    }

    // If WP already resolved a user (cookie session, app password, etc.),
    // respect it — never override an existing authentication.
    if ( ! empty( $user_id ) ) { return $user_id; }

    // Pull the bearer token from any of the headers shared hosts may
    // expose it under (mirrors hackknow_extract_bearer's fallbacks).
    $auth = '';
    if ( ! empty( $_SERVER['HTTP_AUTHORIZATION'] ) ) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif ( ! empty( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ) {
        $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif ( function_exists( 'apache_request_headers' ) ) {
        $h = apache_request_headers();
        if ( isset( $h['Authorization'] ) )      { $auth = $h['Authorization']; }
        elseif ( isset( $h['authorization'] ) )  { $auth = $h['authorization']; }
    } elseif ( function_exists( 'getallheaders' ) ) {
        $h = getallheaders();
        if ( isset( $h['Authorization'] ) )      { $auth = $h['Authorization']; }
        elseif ( isset( $h['authorization'] ) )  { $auth = $h['authorization']; }
    }

    if ( ! is_string( $auth ) || stripos( $auth, 'Bearer ' ) !== 0 ) {
        return $user_id;
    }
    $token = trim( substr( $auth, 7 ) );
    if ( $token === '' ) { return $user_id; }

    // Reuse hackknow-checkout.php's own verifier. Returns int uid on
    // success, null on failure. We intentionally do NOT 401 here on a
    // bad token — let the route's permission_callback decide. That way
    // a malformed Authorization header degrades to "guest" instead of
    // hard-erroring (matches hackknow/v1 behaviour for soft endpoints).
    if ( ! function_exists( 'hackknow_verify_token' ) ) {
        // hackknow-checkout.php not loaded for some reason — bail.
        return $user_id;
    }

    $uid = hackknow_verify_token( $token );
    if ( ! $uid ) { return $user_id; }

    return (int) $uid;
}, 20 );  // priority 20 — after WP cookie auth (10), before WC's filters (50)
