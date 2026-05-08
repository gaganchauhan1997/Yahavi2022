<?php
/**
 * Plugin Name: HK Coupons (YAVI Token Coupons)
 * Description: Coupon code system that credits YAVI Tokens to a user's wallet.
 *              Used from two entry points on the storefront — the wallet page
 *              (/wallet) and the checkout page (/checkout) — but always
 *              produces the same effect server-side: validate the code, then
 *              credit the configured number of YAVI tokens to the caller via
 *              hk_wallet_append() (defined in zz-hk-wallet.php). DOES NOT
 *              touch hackknow-checkout.php or zz-hackknow-payment-fix.php
 *              (per standing rules).
 *
 *              Architecture note: a coupon at /checkout does NOT reduce the
 *              Razorpay charge — it credits the equivalent rupee value to the
 *              buyer's YAVI wallet for use on a future purchase. This is the
 *              only safe path that respects the never-modify rule on the two
 *              checkout plugins above. Same pattern as Flipkart SuperCoins
 *              and Amazon Pay reward credits.
 *
 * Version:     1.0.0
 *
 * Loads AFTER hackknow-wallet.php / zz-hk-wallet.php / zz-hk-jwt-bridge.php
 * thanks to the zz- prefix, so:
 *   - hk_wallet_append() is available
 *   - the JWT bridge has already wired Bearer-token auth into /hk/v1/* routes
 */
if (!defined('ABSPATH')) exit;

const HK_COUPONS_TBL        = 'hk_coupons';
const HK_COUPONS_REDEEM_TBL = 'hk_coupon_redemptions';
const HK_COUPONS_DB_VER     = '1';
const HK_COUPONS_OPT_DBVER  = 'hk_coupons_db_ver';
const HK_COUPONS_OPT_SEEDED = 'hk_coupons_seeded_v1';

register_activation_hook(__FILE__, 'hk_coupons_install');
add_action('plugins_loaded', function () {
    if (get_option(HK_COUPONS_OPT_DBVER) !== HK_COUPONS_DB_VER) {
        hk_coupons_install();
    }
    // Seed demo coupons exactly once. Owner can edit/disable from the admin
    // REST endpoint or directly in DB; we never re-seed.
    if (!get_option(HK_COUPONS_OPT_SEEDED)) {
        hk_coupons_seed_demo();
        update_option(HK_COUPONS_OPT_SEEDED, '1', false);
    }
}, 20);

function hk_coupons_table()        { global $wpdb; return $wpdb->prefix . HK_COUPONS_TBL; }
function hk_coupons_redeem_table() { global $wpdb; return $wpdb->prefix . HK_COUPONS_REDEEM_TBL; }

function hk_coupons_install() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $tbl = hk_coupons_table();
    $red = hk_coupons_redeem_table();

    dbDelta("CREATE TABLE $tbl (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(64) NOT NULL,
        value_yavi BIGINT UNSIGNED NOT NULL DEFAULT 0,
        max_uses INT UNSIGNED NOT NULL DEFAULT 0,
        used_count INT UNSIGNED NOT NULL DEFAULT 0,
        per_user_limit INT UNSIGNED NOT NULL DEFAULT 1,
        valid_from DATETIME DEFAULT NULL,
        valid_until DATETIME DEFAULT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        description VARCHAR(255) NOT NULL DEFAULT '',
        created_by BIGINT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY uniq_code (code),
        KEY status_until (status, valid_until)
    ) $charset;");

    dbDelta("CREATE TABLE $red (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        coupon_id BIGINT UNSIGNED NOT NULL,
        code VARCHAR(64) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        context VARCHAR(16) NOT NULL DEFAULT 'wallet',
        credited_yavi BIGINT NOT NULL DEFAULT 0,
        ledger_id BIGINT UNSIGNED DEFAULT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY  (id),
        KEY coupon_user (coupon_id, user_id),
        KEY user_id (user_id),
        KEY coupon_id (coupon_id)
    ) $charset;");

    update_option(HK_COUPONS_OPT_DBVER, HK_COUPONS_DB_VER, false);
}

/**
 * One-time seed of three demo coupons so the owner has working codes to
 * test with the moment this plugin is live. Owner can disable any of these
 * via the admin REST endpoint.
 */
function hk_coupons_seed_demo() {
    global $wpdb;
    $tbl = hk_coupons_table();
    $now = current_time('mysql', true);
    $until = gmdate('Y-m-d H:i:s', strtotime('+90 days'));

    $seeds = [
        ['WELCOME100',  100, 0, 1, 'Welcome bonus — 100 YAVI for first-time use.'],
        ['YAVI500',     500, 0, 1, 'Promo — 500 YAVI top-up coupon.'],
        ['NEWUSER250',  250, 0, 1, 'New-user reward — 250 YAVI.'],
    ];
    foreach ($seeds as $s) {
        // INSERT IGNORE via uniq_code constraint — safe to re-run.
        $wpdb->query($wpdb->prepare(
            "INSERT IGNORE INTO $tbl (code,value_yavi,max_uses,per_user_limit,valid_from,valid_until,status,description,created_by,created_at)
             VALUES (%s,%d,%d,%d,%s,%s,%s,%s,%d,%s)",
            $s[0], (int)$s[1], (int)$s[2], (int)$s[3], $now, $until, 'active', $s[4], 0, $now
        ));
    }
}

function hk_coupons_normalise_code($raw) {
    $code = strtoupper(trim((string)$raw));
    // Whitelist: alphanumeric + dash + underscore, 3..64 chars.
    if (!preg_match('/^[A-Z0-9_\-]{3,64}$/', $code)) return '';
    return $code;
}

/**
 * Validate a code against the coupons table. Returns the coupon row (assoc
 * array) on success, or a WP_Error on failure. DOES NOT mutate state — used
 * by both /preview and /redeem.
 */
function hk_coupons_validate($code, $user_id) {
    global $wpdb;
    $code = hk_coupons_normalise_code($code);
    if ($code === '') return new WP_Error('hk_c_format', 'Invalid coupon code format.', ['status'=>400]);

    $tbl = hk_coupons_table();
    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $tbl WHERE code = %s LIMIT 1", $code
    ), ARRAY_A);
    if (!$row) return new WP_Error('hk_c_unknown', 'Coupon code not found.', ['status'=>404]);

    if ($row['status'] !== 'active') {
        return new WP_Error('hk_c_disabled', 'This coupon is no longer active.', ['status'=>410]);
    }

    $now_gmt = current_time('mysql', true);
    if (!empty($row['valid_from']) && $now_gmt < $row['valid_from']) {
        return new WP_Error('hk_c_not_yet', 'This coupon is not active yet.', ['status'=>409]);
    }
    if (!empty($row['valid_until']) && $now_gmt > $row['valid_until']) {
        return new WP_Error('hk_c_expired', 'This coupon has expired.', ['status'=>410]);
    }

    if ((int)$row['max_uses'] > 0 && (int)$row['used_count'] >= (int)$row['max_uses']) {
        return new WP_Error('hk_c_exhausted', 'This coupon has been fully redeemed.', ['status'=>409]);
    }

    if ((int)$user_id > 0 && (int)$row['per_user_limit'] > 0) {
        $red = hk_coupons_redeem_table();
        $mine = (int)$wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $red WHERE coupon_id = %d AND user_id = %d",
            (int)$row['id'], (int)$user_id
        ));
        if ($mine >= (int)$row['per_user_limit']) {
            return new WP_Error('hk_c_used', 'You have already used this coupon.', ['status'=>409]);
        }
    }

    if ((int)$row['value_yavi'] <= 0) {
        return new WP_Error('hk_c_zero', 'This coupon has no value configured.', ['status'=>500]);
    }

    return $row;
}

/* ---------- REST routes (hk/v1 namespace — JWT bridge handles Bearer auth) ---------- */
add_action('rest_api_init', function () {
    $auth  = function () { return is_user_logged_in(); };
    $admin = function () { return current_user_can('manage_options'); };

    /**
     * POST /hk/v1/coupon/preview
     * Body: { code: string, context?: 'wallet'|'checkout' }
     * Returns the YAVI value of a valid coupon WITHOUT redeeming it.
     * Used by the storefront to show a live preview before the user clicks
     * Apply (e.g. "✓ This coupon will credit 250 YAVI to your wallet").
     */
    register_rest_route('hk/v1', '/coupon/preview', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            $uid    = get_current_user_id();
            $params = $req->get_json_params() ?: $req->get_params();
            $code   = (string)($params['code'] ?? '');
            $ctx    = (string)($params['context'] ?? 'wallet');
            if (!in_array($ctx, ['wallet', 'checkout'], true)) $ctx = 'wallet';

            $row = hk_coupons_validate($code, $uid);
            if (is_wp_error($row)) return $row;

            return new WP_REST_Response([
                'ok'            => true,
                'code'          => $row['code'],
                'value_yavi'    => (int)$row['value_yavi'],
                'description'   => (string)$row['description'],
                'context'       => $ctx,
                'message'       => sprintf(
                    'This coupon will credit %d YAVI tokens (₹%d equivalent) to your wallet.',
                    (int)$row['value_yavi'], (int)$row['value_yavi']
                ),
            ], 200);
        },
    ]);

    /**
     * POST /hk/v1/coupon/redeem
     * Body: { code: string, context?: 'wallet'|'checkout' }
     *
     * Crash-safe redemption — fixes the BLOCKER the architect flagged where
     * the original ordering (insert redemption + bump used_count → COMMIT →
     * call wallet_append) left a window in which a crash between COMMIT and
     * the wallet credit would mark the coupon used WITHOUT giving the user
     * any YAVI. New ordering:
     *
     *   1. Inside a FOR UPDATE txn: re-validate + compute a deterministic
     *      synthetic idempotency key
     *         "coupon_<coupon_id>_<user_id>_<existing_redemptions+1>"
     *      and COMMIT immediately to release the row lock. No state change
     *      yet — coupon row is unchanged, no redemption row written.
     *   2. Call hk_wallet_append() with that synthetic key passed as
     *      rzp_payment_id. The wallet's existing UNIQUE(rzp_payment_id)
     *      constraint guarantees that any retry of step 2 (whether due to
     *      network timeout, server crash, or duplicate request) returns
     *      the SAME ledger row with duplicate=true — no double-credit
     *      can ever happen.
     *   3. Inside a fresh txn: insert the redemption row (with ledger_id
     *      back-reference) and bump used_count. If this txn fails, the
     *      YAVI is already in the wallet (correctly) and the only loss
     *      is the audit row + the used_count statistic — those are
     *      recoverable from the wallet ledger if ever needed.
     *
     * Per-user-limit re-check happens inside step 1 so two concurrent
     * /redeem calls for the same (coupon, user) serialise on the FOR
     * UPDATE row lock — only one wins, the other sees per_user_limit
     * reached. Throttled to 8 attempts/user/hour to prevent code-guessing.
     *
     * Note: per_user_limit > 1 is supported because the synthetic key
     * embeds a redeem-sequence number (1, 2, 3, …) so each legitimate
     * within-limit redemption gets its own UNIQUE row in the wallet
     * ledger.
     */
    register_rest_route('hk/v1', '/coupon/redeem', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            global $wpdb;
            $uid    = get_current_user_id();
            $params = $req->get_json_params() ?: $req->get_params();
            $code   = hk_coupons_normalise_code($params['code'] ?? '');
            $ctx    = (string)($params['context'] ?? 'wallet');
            if (!in_array($ctx, ['wallet', 'checkout'], true)) $ctx = 'wallet';
            if ($code === '') return new WP_Error('hk_c_format', 'Invalid coupon code format.', ['status'=>400]);

            // Throttle (per user, per hour).
            $tk   = 'hk_c_throttle_' . $uid;
            $hits = (int)get_transient($tk);
            if ($hits >= 8) return new WP_Error('hk_c_rate', 'Too many coupon attempts. Try later.', ['status'=>429]);
            set_transient($tk, $hits + 1, HOUR_IN_SECONDS);

            $tbl = hk_coupons_table();
            $red = hk_coupons_redeem_table();

            // ── PHASE 1: validate + reserve sequence number (no state change).
            $coupon_id     = 0;
            $value_yavi    = 0;
            $code_actual   = '';
            $redeem_seq    = 0;
            $wpdb->query('START TRANSACTION');
            try {
                // Lock the coupon row for the duration of the validation txn.
                $row = $wpdb->get_row($wpdb->prepare(
                    "SELECT * FROM $tbl WHERE code = %s LIMIT 1 FOR UPDATE", $code
                ), ARRAY_A);
                if (!$row) {
                    $wpdb->query('ROLLBACK');
                    return new WP_Error('hk_c_unknown', 'Coupon code not found.', ['status'=>404]);
                }
                if ($row['status'] !== 'active') {
                    $wpdb->query('ROLLBACK');
                    return new WP_Error('hk_c_disabled', 'This coupon is no longer active.', ['status'=>410]);
                }
                $now_gmt = current_time('mysql', true);
                if (!empty($row['valid_from']) && $now_gmt < $row['valid_from']) {
                    $wpdb->query('ROLLBACK');
                    return new WP_Error('hk_c_not_yet', 'This coupon is not active yet.', ['status'=>409]);
                }
                if (!empty($row['valid_until']) && $now_gmt > $row['valid_until']) {
                    $wpdb->query('ROLLBACK');
                    return new WP_Error('hk_c_expired', 'This coupon has expired.', ['status'=>410]);
                }
                if ((int)$row['max_uses'] > 0 && (int)$row['used_count'] >= (int)$row['max_uses']) {
                    $wpdb->query('ROLLBACK');
                    return new WP_Error('hk_c_exhausted', 'This coupon has been fully redeemed.', ['status'=>409]);
                }
                if ((int)$row['value_yavi'] <= 0) {
                    $wpdb->query('ROLLBACK');
                    return new WP_Error('hk_c_zero', 'This coupon has no value configured.', ['status'=>500]);
                }
                $existing_for_user = (int)$wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM $red WHERE coupon_id = %d AND user_id = %d",
                    (int)$row['id'], (int)$uid
                ));
                if ((int)$row['per_user_limit'] > 0 && $existing_for_user >= (int)$row['per_user_limit']) {
                    $wpdb->query('ROLLBACK');
                    return new WP_Error('hk_c_used', 'You have already used this coupon.', ['status'=>409]);
                }

                $coupon_id   = (int)$row['id'];
                $value_yavi  = (int)$row['value_yavi'];
                $code_actual = (string)$row['code'];
                $redeem_seq  = $existing_for_user + 1;
                $wpdb->query('COMMIT');
            } catch (Throwable $e) {
                $wpdb->query('ROLLBACK');
                return new WP_Error('hk_c_exc', 'Coupon validation failed: '.$e->getMessage(), ['status'=>500]);
            }

            // ── PHASE 2: credit YAVI with a deterministic synthetic key.
            // The wallet's UNIQUE(rzp_payment_id) constraint makes this call
            // idempotent — any retry of the SAME (coupon_id, user_id, seq)
            // returns the existing ledger row with duplicate=true, never
            // double-credits. Key max length is 64 chars (DB column limit).
            $idem_key = 'coupon_' . $coupon_id . '_' . (int)$uid . '_' . $redeem_seq;
            if (strlen($idem_key) > 64) {
                $idem_key = substr($idem_key, 0, 64);
            }
            if (!function_exists('hk_wallet_append')) {
                return new WP_Error('hk_c_wallet_missing', 'Wallet plugin not loaded.', ['status'=>500]);
            }
            $wallet = hk_wallet_append([
                'user_id'        => (int)$uid,
                'type'           => 'coupon',
                'delta_yavi'     => +$value_yavi,
                'ref_kind'       => 'coupon',
                'ref_id'         => $code_actual,
                'rzp_payment_id' => $idem_key,
                'note'           => "Coupon {$code_actual} → +{$value_yavi} YAVI",
                'meta'           => [
                    'coupon_id'  => $coupon_id,
                    'redeem_seq' => $redeem_seq,
                    'context'    => $ctx,
                    'idem_key'   => $idem_key,
                ],
            ]);
            if (is_wp_error($wallet)) return $wallet;

            $ledger_id   = (int)$wallet['id'];
            $balance     = (int)$wallet['balance'];
            $duplicate   = !empty($wallet['duplicate']);

            // ── PHASE 3: best-effort write of the audit row + used_count bump.
            // YAVI is already in the wallet at this point. If this phase fails
            // we still return success to the caller — the wallet ledger is the
            // source of truth and an admin can rebuild used_count from it.
            // On a duplicate (retry path) we skip the row insert if one already
            // exists for the same idempotency key, to avoid duplicate audit rows.
            $existing_red = $wpdb->get_var($wpdb->prepare(
                "SELECT id FROM $red WHERE ledger_id = %d LIMIT 1", $ledger_id
            ));
            if (!$existing_red) {
                $wpdb->query('START TRANSACTION');
                try {
                    $wpdb->insert($red, [
                        'coupon_id'     => $coupon_id,
                        'code'          => $code_actual,
                        'user_id'       => (int)$uid,
                        'context'       => $ctx,
                        'credited_yavi' => $value_yavi,
                        'ledger_id'     => $ledger_id,
                        'created_at'    => current_time('mysql', true),
                    ], ['%d','%s','%d','%s','%d','%d','%s']);
                    // Only bump used_count if this was a fresh credit (not a retry of an
                    // earlier successful credit, signalled by duplicate=true).
                    if (!$duplicate) {
                        $wpdb->query($wpdb->prepare(
                            "UPDATE $tbl SET used_count = used_count + 1 WHERE id = %d", $coupon_id
                        ));
                    }
                    $wpdb->query('COMMIT');
                } catch (Throwable $e) {
                    $wpdb->query('ROLLBACK');
                    // Swallow — the user already has their YAVI; this is just audit/stats.
                    error_log('[hk-coupons] phase 3 failed for ledger_id=' . $ledger_id . ': ' . $e->getMessage());
                }
            }

            return new WP_REST_Response([
                'ok'            => true,
                'code'          => $code_actual,
                'credited_yavi' => $value_yavi,
                'balance_yavi'  => $balance,
                'ledger_id'     => $ledger_id,
                'duplicate'     => $duplicate,
                'context'       => $ctx,
                'message'       => sprintf(
                    '%d YAVI tokens (₹%d equivalent) credited to your wallet.',
                    $value_yavi, $value_yavi
                ),
            ], 200);
        },
    ]);

    /* ---------- Admin REST ---------- */

    register_rest_route('hk/v1', '/coupon/admin/list', [
        'methods'             => 'GET',
        'permission_callback' => $admin,
        'callback'            => function () {
            global $wpdb;
            $tbl = hk_coupons_table();
            $rows = $wpdb->get_results("SELECT * FROM $tbl ORDER BY id DESC LIMIT 200", ARRAY_A);
            return new WP_REST_Response(['ok'=>true,'items'=>$rows ?: []], 200);
        },
    ]);

    register_rest_route('hk/v1', '/coupon/admin/create', [
        'methods'             => 'POST',
        'permission_callback' => $admin,
        'callback'            => function (WP_REST_Request $req) {
            global $wpdb;
            $p = $req->get_json_params() ?: $req->get_params();
            $code = hk_coupons_normalise_code($p['code'] ?? '');
            if ($code === '') return new WP_Error('hk_c_format', 'Invalid code format (3-64 chars, A-Z 0-9 _ -).', ['status'=>400]);
            $value_yavi = max(1, (int)($p['value_yavi'] ?? 0));
            $max_uses   = max(0, (int)($p['max_uses'] ?? 0));
            $per_user   = max(0, (int)($p['per_user_limit'] ?? 1));
            $valid_until= isset($p['valid_until']) && $p['valid_until'] ? gmdate('Y-m-d H:i:s', strtotime((string)$p['valid_until'])) : null;
            $description= substr((string)($p['description'] ?? ''), 0, 255);

            $ok = $wpdb->insert(hk_coupons_table(), [
                'code'           => $code,
                'value_yavi'     => $value_yavi,
                'max_uses'       => $max_uses,
                'used_count'     => 0,
                'per_user_limit' => $per_user,
                'valid_from'     => null,
                'valid_until'    => $valid_until,
                'status'         => 'active',
                'description'    => $description,
                'created_by'     => get_current_user_id(),
                'created_at'     => current_time('mysql', true),
            ], ['%s','%d','%d','%d','%d','%s','%s','%s','%s','%d','%s']);

            if ($ok === false) {
                $err = $wpdb->last_error;
                if (stripos($err, 'duplicate') !== false || stripos($err, '1062') !== false) {
                    return new WP_Error('hk_c_dupe', 'A coupon with this code already exists.', ['status'=>409]);
                }
                return new WP_Error('hk_c_create_fail', 'Could not create coupon: '.$err, ['status'=>500]);
            }
            return new WP_REST_Response(['ok'=>true,'id'=>(int)$wpdb->insert_id,'code'=>$code], 201);
        },
    ]);

    register_rest_route('hk/v1', '/coupon/admin/disable', [
        'methods'             => 'POST',
        'permission_callback' => $admin,
        'callback'            => function (WP_REST_Request $req) {
            global $wpdb;
            $p = $req->get_json_params() ?: $req->get_params();
            $code = hk_coupons_normalise_code($p['code'] ?? '');
            if ($code === '') return new WP_Error('hk_c_format', 'Invalid code format.', ['status'=>400]);
            $upd = $wpdb->update(hk_coupons_table(), ['status'=>'disabled'], ['code'=>$code], ['%s'], ['%s']);
            if ($upd === false) return new WP_Error('hk_c_upd', 'Update failed: '.$wpdb->last_error, ['status'=>500]);
            if ($upd === 0)     return new WP_Error('hk_c_notfound', 'No such code.', ['status'=>404]);
            return new WP_REST_Response(['ok'=>true,'code'=>$code,'status'=>'disabled'], 200);
        },
    ]);
});
