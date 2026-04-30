<?php
/**
 * Plugin Name: HackKnow Wallet, Community & Sponsor System
 * Description: HackCoins wallet (earn on orders/brainx, redeem at checkout) + Community membership badge + Sponsor tier badge.
 * Version:     1.0
 *
 * USER META KEYS:
 *   _hk_wallet_coins           int    HackCoins balance
 *   _hk_wallet_log             json   transaction log (last 50)
 *   _hk_community_joined_at    int    unix ts (0 = not joined)
 *   _hk_sponsor_tier           string none|bronze|silver|gold
 *   _hk_sponsor_since          int    unix ts
 *
 * REST (all under /wp-json/hackknow/v1/):
 *   GET  /wallet/me                  → {coins, log[]}                        [logged-in]
 *   POST /wallet/redeem              → {ok, coupon_code}                     [logged-in]
 *   POST /wallet/credit              → admin grants coins                    [admin]
 *
 *   GET  /community/me               → {joined, joined_at, member_count}     [public]
 *   POST /community/join             → {ok, joined_at}                       [logged-in]
 *
 *   GET  /sponsor/tiers              → array of tiers                        [public]
 *   GET  /sponsor/me                 → {tier, since}                         [logged-in]
 *   POST /sponsor/intent             → {ok, status:'pending'} (admin reviews)[logged-in]
 *
 * COIN ECONOMY:
 *   +100 on registration
 *   +1   per ₹10 of completed order total
 *   +10  per Brainx submission
 *   100 coins → ₹10 redemption coupon (one-time HKWALLET-XXXX)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ============================================================
 * Helpers
 * ============================================================ */
function hk_wallet_get( $user_id ) { return (int) get_user_meta( $user_id, '_hk_wallet_coins', true ); }

function hk_wallet_log_push( $user_id, $delta, $reason ) {
    $log = get_user_meta( $user_id, '_hk_wallet_log', true );
    if ( ! is_array( $log ) ) $log = [];
    array_unshift( $log, [ 't' => time(), 'd' => (int) $delta, 'r' => sanitize_text_field( $reason ) ] );
    if ( count( $log ) > 50 ) $log = array_slice( $log, 0, 50 );
    update_user_meta( $user_id, '_hk_wallet_log', $log );
}

function hk_wallet_credit( $user_id, $delta, $reason ) {
    if ( ! $user_id || ! $delta ) return false;
    $cur = hk_wallet_get( $user_id );
    update_user_meta( $user_id, '_hk_wallet_coins', max( 0, $cur + (int) $delta ) );
    hk_wallet_log_push( $user_id, $delta, $reason );
    return true;
}

/* ============================================================
 * Hooks: award coins automatically
 * ============================================================ */
add_action( 'user_register', function( $uid ) { hk_wallet_credit( $uid, 100, 'Welcome bonus' ); } );

add_action( 'woocommerce_order_status_completed', function( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) return;
    $uid = $order->get_user_id();
    if ( ! $uid ) return;
    $coins = (int) floor( (float) $order->get_total() / 10 );
    if ( $coins > 0 ) hk_wallet_credit( $uid, $coins, "Order #$order_id reward" );
} );

/* Brainx submit hook (if brainx plugin fires this action; safe to keep) */
add_action( 'hk_brainx_submitted', function( $user_id, $brainx_id ) {
    hk_wallet_credit( $user_id, 10, "Brainx submit #$brainx_id" );
}, 10, 2 );

/* ============================================================
 * REST Routes
 * ============================================================ */
add_action( 'rest_api_init', function() {

    $auth = [ 'permission_callback' => function() { return is_user_logged_in(); } ];
    $pub  = [ 'permission_callback' => '__return_true' ];
    $admn = [ 'permission_callback' => function() { return current_user_can( 'manage_options' ); } ];

    /* --- Wallet --- */
    register_rest_route( 'hackknow/v1', '/wallet/me', array_merge( $auth, [
        'methods' => 'GET',
        'callback' => function() {
            $uid = get_current_user_id();
            $log = get_user_meta( $uid, '_hk_wallet_log', true );
            return [ 'coins' => hk_wallet_get( $uid ), 'log' => is_array( $log ) ? $log : [] ];
        },
    ] ) );

    register_rest_route( 'hackknow/v1', '/wallet/redeem', array_merge( $auth, [
        'methods' => 'POST',
        'callback' => function( $req ) {
            $uid = get_current_user_id();
            $coins = hk_wallet_get( $uid );
            $spend = (int) $req->get_param( 'coins' );
            if ( $spend < 100 || $spend % 100 !== 0 ) {
                return new WP_Error( 'bad_amount', 'Minimum 100 coins, multiples of 100 only.', [ 'status' => 400 ] );
            }
            if ( $coins < $spend ) {
                return new WP_Error( 'no_balance', 'Not enough coins.', [ 'status' => 400 ] );
            }
            $rupees = intval( $spend / 10 );
            $code   = 'HKW' . strtoupper( substr( wp_generate_password( 8, false, false ), 0, 6 ) );

            /* Create one-time coupon */
            $coupon_id = wp_insert_post( [
                'post_title'  => $code,
                'post_status' => 'publish',
                'post_author' => 1,
                'post_type'   => 'shop_coupon',
            ] );
            if ( ! $coupon_id || is_wp_error( $coupon_id ) ) {
                return new WP_Error( 'coupon_fail', 'Coupon create failed.', [ 'status' => 500 ] );
            }
            update_post_meta( $coupon_id, 'discount_type', 'fixed_cart' );
            update_post_meta( $coupon_id, 'coupon_amount', (string) $rupees );
            update_post_meta( $coupon_id, 'usage_limit', 1 );
            update_post_meta( $coupon_id, 'usage_limit_per_user', 1 );
            update_post_meta( $coupon_id, 'individual_use', 'yes' );
            update_post_meta( $coupon_id, 'customer_email', [ wp_get_current_user()->user_email ] );
            update_post_meta( $coupon_id, '_hk_wallet_coupon', '1' );

            hk_wallet_credit( $uid, -1 * $spend, "Redeemed for ₹$rupees coupon $code" );
            return [ 'ok' => true, 'coupon_code' => $code, 'rupees_off' => $rupees, 'remaining_coins' => hk_wallet_get( $uid ) ];
        },
    ] ) );

    register_rest_route( 'hackknow/v1', '/wallet/credit', array_merge( $admn, [
        'methods' => 'POST',
        'callback' => function( $req ) {
            $uid = (int) $req->get_param( 'user_id' );
            $delta = (int) $req->get_param( 'coins' );
            $reason = (string) $req->get_param( 'reason' ) ?: 'Admin grant';
            $ok = hk_wallet_credit( $uid, $delta, $reason );
            return [ 'ok' => $ok, 'balance' => hk_wallet_get( $uid ) ];
        },
    ] ) );

    /* --- Community --- */
    register_rest_route( 'hackknow/v1', '/community/me', array_merge( $pub, [
        'methods' => 'GET',
        'callback' => function() {
            $uid = get_current_user_id();
            $joined = $uid ? (int) get_user_meta( $uid, '_hk_community_joined_at', true ) : 0;
            $count = (int) get_option( 'hk_community_member_count', 0 );
            return [ 'joined' => $joined > 0, 'joined_at' => $joined, 'member_count' => $count ];
        },
    ] ) );

    register_rest_route( 'hackknow/v1', '/community/join', array_merge( $auth, [
        'methods' => 'POST',
        'callback' => function() {
            $uid = get_current_user_id();
            $existing = (int) get_user_meta( $uid, '_hk_community_joined_at', true );
            if ( ! $existing ) {
                update_user_meta( $uid, '_hk_community_joined_at', time() );
                update_option( 'hk_community_member_count', (int) get_option( 'hk_community_member_count', 0 ) + 1 );
                hk_wallet_credit( $uid, 50, 'Community join bonus' );
            }
            return [ 'ok' => true, 'joined_at' => (int) get_user_meta( $uid, '_hk_community_joined_at', true ) ];
        },
    ] ) );

    /* --- Sponsor --- */
    register_rest_route( 'hackknow/v1', '/sponsor/tiers', array_merge( $pub, [
        'methods' => 'GET',
        'callback' => function() {
            return [
                [ 'tier' => 'bronze', 'name' => 'Bronze', 'monthly' => 500,  'perks' => [ 'Sponsor badge on profile', 'Early access to free templates', 'Monthly newsletter shoutout' ] ],
                [ 'tier' => 'silver', 'name' => 'Silver', 'monthly' => 2000, 'perks' => [ 'All Bronze perks', '20% off all premium products', 'Direct Q&A access', 'Sponsor badge in comments' ] ],
                [ 'tier' => 'gold',   'name' => 'Gold',   'monthly' => 5000, 'perks' => [ 'All Silver perks', '50% off everything', 'Logo on Sponsors page', 'Quarterly 1:1 strategy call' ] ],
            ];
        },
    ] ) );

    /* /sponsor/me is intentionally public — returns {tier:none, since:0} when
       the caller is not logged in (or token invalid). This prevents 401 from
       triggering the frontend session-expired interceptor on the public
       /sponsor page. */
    register_rest_route( 'hackknow/v1', '/sponsor/me', array_merge( $pub, [
        'methods' => 'GET',
        'callback' => function() {
            $uid = get_current_user_id();
            if ( ! $uid ) return [ 'tier' => 'none', 'since' => 0 ];
            return [
                'tier'  => (string) ( get_user_meta( $uid, '_hk_sponsor_tier', true ) ?: 'none' ),
                'since' => (int)    get_user_meta( $uid, '_hk_sponsor_since', true ),
            ];
        },
    ] ) );

    register_rest_route( 'hackknow/v1', '/sponsor/intent', array_merge( $auth, [
        'methods' => 'POST',
        'callback' => function( $req ) {
            $uid = get_current_user_id();
            $tier = sanitize_key( (string) $req->get_param( 'tier' ) );
            if ( ! in_array( $tier, [ 'bronze', 'silver', 'gold' ], true ) ) {
                return new WP_Error( 'bad_tier', 'Invalid tier.', [ 'status' => 400 ] );
            }
            update_user_meta( $uid, '_hk_sponsor_intent_tier', $tier );
            update_user_meta( $uid, '_hk_sponsor_intent_at', time() );
            return [ 'ok' => true, 'status' => 'pending', 'tier' => $tier, 'message' => 'Sponsor intent recorded. Admin will reach out via email with payment details.' ];
        },
    ] ) );

} );

/* ============================================================
 * Inject wallet/community/sponsor into WC Store API customer + custom /me
 * ============================================================ */
add_action( 'rest_api_init', function() {
    register_rest_route( 'hackknow/v1', '/me/badges', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function() {
            if ( ! is_user_logged_in() ) return [ 'logged_in' => false ];
            $uid = get_current_user_id();
            return [
                'logged_in'      => true,
                'wallet_coins'   => hk_wallet_get( $uid ),
                'community'      => (bool) get_user_meta( $uid, '_hk_community_joined_at', true ),
                'sponsor_tier'   => (string) ( get_user_meta( $uid, '_hk_sponsor_tier', true ) ?: 'none' ),
                'verified_role'  => (string) ( get_user_meta( $uid, '_hk_verified_role', true ) ?: '' ),
            ];
        },
    ] );
} );

/* ============================================================
 * Admin sub-menu under HackKnow
 * ============================================================ */
add_action( 'admin_menu', function() {
    add_submenu_page(
        'hackknow', /* parent slug from hackknow-content.php; falls back if absent */
        'Wallet & Sponsors',
        'Wallet & Sponsors',
        'manage_options',
        'hk-wallet-admin',
        'hk_wallet_admin_render'
    );
}, 30 );

function hk_wallet_admin_render() {
    if ( ! current_user_can( 'manage_options' ) ) return;
    echo '<div class="wrap"><h1>HackKnow Wallet, Community & Sponsors</h1>';

    /* Quick stats */
    global $wpdb;
    $total_coins = (int) $wpdb->get_var( "SELECT SUM(CAST(meta_value AS UNSIGNED)) FROM {$wpdb->usermeta} WHERE meta_key='_hk_wallet_coins'" );
    $member_count = (int) get_option( 'hk_community_member_count', 0 );
    $sponsor_intents = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->usermeta} WHERE meta_key='_hk_sponsor_intent_tier'" );
    echo "<p><strong>Total coins issued:</strong> $total_coins | <strong>Community members:</strong> $member_count | <strong>Sponsor intents (pending):</strong> $sponsor_intents</p>";

    /* Pending sponsor intents table */
    echo '<h2>Pending Sponsor Intents</h2>';
    $rows = $wpdb->get_results( "SELECT u.ID, u.user_email, u.display_name, m1.meta_value AS tier, m2.meta_value AS at FROM {$wpdb->users} u JOIN {$wpdb->usermeta} m1 ON m1.user_id=u.ID AND m1.meta_key='_hk_sponsor_intent_tier' LEFT JOIN {$wpdb->usermeta} m2 ON m2.user_id=u.ID AND m2.meta_key='_hk_sponsor_intent_at' ORDER BY m2.meta_value DESC LIMIT 50" );
    if ( ! $rows ) {
        echo '<p>No pending intents.</p>';
    } else {
        echo '<table class="widefat striped"><thead><tr><th>User</th><th>Email</th><th>Tier</th><th>When</th><th>Approve</th></tr></thead><tbody>';
        foreach ( $rows as $r ) {
            $when = $r->at ? date( 'Y-m-d H:i', (int) $r->at ) : '—';
            echo '<tr>';
            echo "<td>{$r->display_name} (#{$r->ID})</td>";
            echo "<td>{$r->user_email}</td>";
            echo "<td><strong>" . esc_html( $r->tier ) . "</strong></td>";
            echo "<td>$when</td>";
            $nonce = wp_create_nonce( 'hk_sponsor_approve_' . $r->ID );
            echo "<td><a href='?page=hk-wallet-admin&approve={$r->ID}&_n=$nonce' class='button button-primary'>Approve</a></td>";
            echo '</tr>';
        }
        echo '</tbody></table>';
    }

    /* Approve handler */
    if ( isset( $_GET['approve'] ) ) {
        $uid = (int) $_GET['approve'];
        $n = (string) ( $_GET['_n'] ?? '' );
        if ( wp_verify_nonce( $n, 'hk_sponsor_approve_' . $uid ) ) {
            $tier = (string) get_user_meta( $uid, '_hk_sponsor_intent_tier', true );
            if ( in_array( $tier, [ 'bronze', 'silver', 'gold' ], true ) ) {
                update_user_meta( $uid, '_hk_sponsor_tier', $tier );
                update_user_meta( $uid, '_hk_sponsor_since', time() );
                delete_user_meta( $uid, '_hk_sponsor_intent_tier' );
                delete_user_meta( $uid, '_hk_sponsor_intent_at' );
                echo '<div class="notice notice-success"><p>Approved.</p></div>';
            }
        }
    }

    echo '</div>';
}
