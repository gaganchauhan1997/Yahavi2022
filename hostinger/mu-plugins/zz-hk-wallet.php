<?php
/**
 * Plugin Name: HK Wallet (YAVI Tokens)
 * Description: User wallet with YAVI Tokens. Topup tiers ₹100→150, ₹200→300, ₹500→750 (1 YAVI = ₹1). Money-safe: pending-order table binds order_id↔user_id↔amount at create time; verify fetches the Razorpay payment server-side to confirm actual paid amount before crediting (client-supplied amount is ignored). Idempotent on rzp_payment_id (UNIQUE; nullable so admin-adjustment rows are not constrained).
 * Version: 2.0.0
 */
if (!defined('ABSPATH')) exit;

const HK_WALLET_OPT_KEYS  = 'hk_wallet_rzp_v1';
const HK_WALLET_TBL       = 'hk_wallet_ledger';
const HK_WALLET_TBL_PEND  = 'hk_wallet_pending';
const HK_WALLET_DB_VER    = '2';
const HK_WALLET_OPT_DBVER = 'hk_wallet_db_ver';

function hk_wallet_tiers() { return [100 => 150, 200 => 300, 500 => 750]; }

register_activation_hook(__FILE__, 'hk_wallet_install');
add_action('plugins_loaded', function () {
    if (get_option(HK_WALLET_OPT_DBVER) !== HK_WALLET_DB_VER) hk_wallet_install();
});

function hk_wallet_install() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $tbl  = $wpdb->prefix . HK_WALLET_TBL;
    $pend = $wpdb->prefix . HK_WALLET_TBL_PEND;

    dbDelta("CREATE TABLE $tbl (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        type VARCHAR(32) NOT NULL,
        delta_yavi BIGINT NOT NULL,
        balance_after BIGINT NOT NULL,
        ref_kind VARCHAR(32) DEFAULT '',
        ref_id VARCHAR(128) DEFAULT '',
        rzp_order_id VARCHAR(64) DEFAULT NULL,
        rzp_payment_id VARCHAR(64) DEFAULT NULL,
        amount_paise BIGINT DEFAULT 0,
        note VARCHAR(255) DEFAULT '',
        meta LONGTEXT,
        created_at DATETIME NOT NULL,
        PRIMARY KEY  (id),
        KEY user_id_created (user_id, created_at),
        UNIQUE KEY uniq_payment (rzp_payment_id)
    ) $charset;");

    dbDelta("CREATE TABLE $pend (
        rzp_order_id VARCHAR(64) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        amount_inr INT UNSIGNED NOT NULL,
        amount_paise BIGINT UNSIGNED NOT NULL,
        tokens_to_credit BIGINT UNSIGNED NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        ledger_id BIGINT UNSIGNED DEFAULT NULL,
        rzp_payment_id VARCHAR(64) DEFAULT NULL,
        created_at DATETIME NOT NULL,
        consumed_at DATETIME DEFAULT NULL,
        PRIMARY KEY  (rzp_order_id),
        KEY user_status (user_id, status)
    ) $charset;");

    // Migration v1 → v2: column was NOT NULL DEFAULT ''. dbDelta won't change column to NULL.
    // Convert legacy '' → NULL so the UNIQUE index allows multiple admin-adjust rows.
    $col = $wpdb->get_row("SHOW COLUMNS FROM $tbl LIKE 'rzp_payment_id'", ARRAY_A);
    if ($col && stripos((string)$col['Null'], 'YES') === false) {
        // First clear duplicate empties (only one '' can exist anyway, but be safe)
        $wpdb->query("UPDATE $tbl SET rzp_payment_id = NULL WHERE rzp_payment_id = ''");
        $wpdb->query("ALTER TABLE $tbl MODIFY rzp_payment_id VARCHAR(64) DEFAULT NULL");
    }
    $col2 = $wpdb->get_row("SHOW COLUMNS FROM $tbl LIKE 'rzp_order_id'", ARRAY_A);
    if ($col2 && stripos((string)$col2['Null'], 'YES') === false) {
        $wpdb->query("UPDATE $tbl SET rzp_order_id = NULL WHERE rzp_order_id = ''");
        $wpdb->query("ALTER TABLE $tbl MODIFY rzp_order_id VARCHAR(64) DEFAULT NULL");
    }

    update_option(HK_WALLET_OPT_DBVER, HK_WALLET_DB_VER, false);
}

function hk_wallet_table()      { global $wpdb; return $wpdb->prefix . HK_WALLET_TBL; }
function hk_wallet_table_pend() { global $wpdb; return $wpdb->prefix . HK_WALLET_TBL_PEND; }

function hk_wallet_balance_for($user_id) {
    global $wpdb;
    $user_id = (int)$user_id;
    if ($user_id <= 0) return 0;
    return (int)$wpdb->get_var($wpdb->prepare(
        "SELECT COALESCE(SUM(delta_yavi),0) FROM " . hk_wallet_table() . " WHERE user_id = %d",
        $user_id
    ));
}

function hk_wallet_append($args) {
    global $wpdb;
    $defaults = ['user_id'=>0,'type'=>'','delta_yavi'=>0,'ref_kind'=>'','ref_id'=>'','rzp_order_id'=>null,'rzp_payment_id'=>null,'amount_paise'=>0,'note'=>'','meta'=>[]];
    $a = array_merge($defaults, $args);
    if ((int)$a['user_id'] <= 0) return new WP_Error('hk_w_no_user', 'No user', ['status' => 400]);
    if ((int)$a['delta_yavi'] === 0) return new WP_Error('hk_w_zero', 'Zero delta', ['status' => 400]);
    if ($a['type'] === '') return new WP_Error('hk_w_type', 'No type', ['status' => 400]);

    // Normalise: empty string → NULL so UNIQUE index allows multiple non-payment rows.
    $rzp_pid = (isset($a['rzp_payment_id']) && $a['rzp_payment_id'] !== '') ? (string)$a['rzp_payment_id'] : null;
    $rzp_oid = (isset($a['rzp_order_id'])   && $a['rzp_order_id']   !== '') ? (string)$a['rzp_order_id']   : null;

    $tbl = hk_wallet_table();

    if ($rzp_pid !== null) {
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id, balance_after FROM $tbl WHERE rzp_payment_id = %s LIMIT 1", $rzp_pid
        ), ARRAY_A);
        if ($existing) return ['ok'=>true, 'balance'=>(int)$existing['balance_after'], 'id'=>(int)$existing['id'], 'duplicate'=>true];
    }

    $wpdb->query('START TRANSACTION');
    try {
        $cur = (int)$wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(delta_yavi),0) FROM $tbl WHERE user_id = %d FOR UPDATE",
            (int)$a['user_id']
        ));
        $new_bal = $cur + (int)$a['delta_yavi'];
        if ($new_bal < 0) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('hk_w_insuff', 'Insufficient YAVI balance', ['status' => 402]);
        }

        // Prepare row; insert NULL (not '') for nullable Razorpay fields.
        $data = [
            'user_id'        => (int)$a['user_id'],
            'type'           => substr((string)$a['type'], 0, 32),
            'delta_yavi'     => (int)$a['delta_yavi'],
            'balance_after'  => $new_bal,
            'ref_kind'       => substr((string)$a['ref_kind'], 0, 32),
            'ref_id'         => substr((string)$a['ref_id'], 0, 128),
            'rzp_order_id'   => $rzp_oid,
            'rzp_payment_id' => $rzp_pid,
            'amount_paise'   => (int)$a['amount_paise'],
            'note'           => substr((string)$a['note'], 0, 255),
            'meta'           => wp_json_encode((array)$a['meta']),
            'created_at'     => current_time('mysql', true),
        ];
        // Build format strings; NULL fields use no format (wpdb handles via $data).
        $fmt = ['%d','%s','%d','%d','%s','%s', $rzp_oid===null?null:'%s', $rzp_pid===null?null:'%s', '%d','%s','%s','%s'];
        // wpdb->insert needs all-format-or-all-data; safer path: use $wpdb->prepare manually.
        // Simpler: temporarily replace NULL values with placeholders not present in $fmt — instead use direct query.

        $cols = array_keys($data);
        $place = [];
        $vals  = [];
        foreach ($cols as $c) {
            $v = $data[$c];
            if ($v === null) { $place[] = 'NULL'; }
            else { $place[] = is_int($v) ? '%d' : '%s'; $vals[] = $v; }
        }
        $sql = "INSERT INTO $tbl (" . implode(',', $cols) . ") VALUES (" . implode(',', $place) . ")";
        $ok  = $wpdb->query($wpdb->prepare($sql, $vals));

        if ($ok === false) {
            $err = $wpdb->last_error;
            $wpdb->query('ROLLBACK');
            // Race on UNIQUE rzp_payment_id (duplicate concurrent verify) → re-read.
            if ($rzp_pid !== null) {
                $existing = $wpdb->get_row($wpdb->prepare(
                    "SELECT id, balance_after FROM $tbl WHERE rzp_payment_id = %s LIMIT 1", $rzp_pid
                ), ARRAY_A);
                if ($existing) return ['ok'=>true, 'balance'=>(int)$existing['balance_after'], 'id'=>(int)$existing['id'], 'duplicate'=>true];
            }
            return new WP_Error('hk_w_insert_fail', 'Insert failed: '.$err, ['status'=>500]);
        }
        $id = (int)$wpdb->insert_id;
        $wpdb->query('COMMIT');
        return ['ok'=>true, 'balance'=>$new_bal, 'id'=>$id, 'duplicate'=>false];
    } catch (Throwable $e) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('hk_w_exc', 'Exception: '.$e->getMessage(), ['status'=>500]);
    }
}

/* ---------- Razorpay ---------- */
/**
 * Returns the Razorpay credentials the wallet plugin should use for
 * topup orders.
 *
 * Lookup order (mirrors zz-hackknow-payment-fix.php so wallet topups
 * use the SAME live keys the paid checkout already uses — no admin
 * action ever needed):
 *
 *   0. EXPLICIT OFF SHORT-CIRCUIT: if the dedicated `hk_wallet_keys`
 *      option exists as an array AND has the `enabled` key explicitly
 *      set to a falsy value, treat that as authoritative OFF and skip
 *      every fallback. This lets the owner kill wallet topups
 *      independently from paid checkout.
 *
 *   1. EXPLICIT WALLET OVERRIDE: if `hk_wallet_keys` has enabled=true
 *      AND non-empty key_id+key_secret, use those (lets owner run a
 *      separate Razorpay account for wallet vs. paid checkout if ever
 *      needed).
 *
 *   2. wp-config CONSTANTS: HACKKNOW_RAZORPAY_KEY_ID + (HACKKNOW_RAZORPAY_KEY_SECRET
 *      or HACKKNOW_RAZORPAY_SECRET) — same constants payment-fix uses
 *      at lines 1586-1588.
 *
 *   3. WC OPTION FALLBACK: woocommerce_razorpay_settings — same option
 *      payment-fix falls through to at line 1592.
 *
 * Standing rules: this function only READS from the same sources
 * payment-fix already uses. It NEVER writes them and NEVER modifies
 * zz-hackknow-payment-fix.php or hackknow-checkout.php.
 */
function hk_wallet_keys() {
    $o = get_option(HK_WALLET_OPT_KEYS, []);
    $is_array = is_array($o);

    // Tier 0 — EXPLICIT OFF short-circuit. If admin saved
    // hk_wallet_keys with enabled=false (any falsy value) we honour it
    // and refuse to fall back. This is the architect-flagged invariant.
    if ($is_array && array_key_exists('enabled', $o) && empty($o['enabled'])) {
        return [
            'key_id'     => '',
            'key_secret' => '',
            'enabled'    => false,
            'source'     => 'explicit_off',
        ];
    }

    // Tier 1 — explicit wallet override (separate Razorpay account)
    if ($is_array) {
        $key_id     = (string)($o['key_id'] ?? '');
        $key_secret = (string)($o['key_secret'] ?? '');
        if (!empty($o['enabled']) && $key_id !== '' && $key_secret !== '') {
            return [
                'key_id'     => $key_id,
                'key_secret' => $key_secret,
                'enabled'    => true,
                'source'     => 'hk_wallet_keys',
            ];
        }
    }

    // Tier 2 — wp-config constants (where the LIVE keys actually live
    // on this server; payment-fix uses these at 1586-1588).
    $kid  = '';
    $ksec = '';
    if (defined('HACKKNOW_RAZORPAY_KEY_ID')) {
        $kid = (string) HACKKNOW_RAZORPAY_KEY_ID;
    }
    if (defined('HACKKNOW_RAZORPAY_KEY_SECRET')) {
        $ksec = (string) HACKKNOW_RAZORPAY_KEY_SECRET;
    } elseif (defined('HACKKNOW_RAZORPAY_SECRET')) {
        $ksec = (string) HACKKNOW_RAZORPAY_SECRET;
    }
    if ($kid !== '' && $ksec !== '') {
        return [
            'key_id'     => $kid,
            'key_secret' => $ksec,
            'enabled'    => true,
            'source'     => 'wp_config_constants',
        ];
    }

    // Tier 3 — WooCommerce Razorpay plugin option fallback
    $wc = get_option('woocommerce_razorpay_settings', []);
    if (is_array($wc)) {
        $wc_key    = (string)($wc['key_id'] ?? '');
        $wc_secret = (string)($wc['key_secret'] ?? '');
        $wc_on     = isset($wc['enabled']) ? ($wc['enabled'] === 'yes' || $wc['enabled'] === true) : true;
        if ($wc_key !== '' && $wc_secret !== '' && $wc_on) {
            return [
                'key_id'     => $wc_key,
                'key_secret' => $wc_secret,
                'enabled'    => true,
                'source'     => 'woocommerce_razorpay_settings',
            ];
        }
    }

    // Nothing configured anywhere → disabled.
    return [
        'key_id'     => '',
        'key_secret' => '',
        'enabled'    => false,
        'source'     => 'none',
    ];
}

function hk_wallet_rzp_create_order($amount_paise, $receipt) {
    $k = hk_wallet_keys();
    if (!$k['enabled'] || !$k['key_id'] || !$k['key_secret']) {
        return new WP_Error('hk_w_keys', 'Wallet payments not configured by admin yet.', ['status'=>503]);
    }
    $r = wp_remote_post('https://api.razorpay.com/v1/orders', [
        'timeout' => 12,
        'headers' => [
            'Authorization' => 'Basic ' . base64_encode($k['key_id'] . ':' . $k['key_secret']),
            'Content-Type'  => 'application/json',
        ],
        'body' => wp_json_encode([
            'amount'   => (int)$amount_paise,
            'currency' => 'INR',
            'receipt'  => substr((string)$receipt, 0, 40),
            'notes'    => ['source' => 'hk_wallet_topup'],
        ]),
    ]);
    if (is_wp_error($r)) return new WP_Error('hk_w_net', 'Razorpay network error: '.$r->get_error_message(), ['status'=>502]);
    $code = wp_remote_retrieve_response_code($r);
    $body = json_decode(wp_remote_retrieve_body($r), true);
    if ($code !== 200 || empty($body['id'])) return new WP_Error('hk_w_rzp', 'Razorpay error', ['status'=>502, 'rzp'=>$body]);
    return $body;
}

/** Server-side fetch of a Razorpay payment to confirm captured amount (anti-mint). */
function hk_wallet_rzp_fetch_payment($payment_id) {
    $k = hk_wallet_keys();
    if (!$k['key_id'] || !$k['key_secret']) return new WP_Error('hk_w_keys', 'Keys missing', ['status'=>503]);
    $r = wp_remote_get('https://api.razorpay.com/v1/payments/' . rawurlencode($payment_id), [
        'timeout' => 12,
        'headers' => [
            'Authorization' => 'Basic ' . base64_encode($k['key_id'] . ':' . $k['key_secret']),
            'Accept'        => 'application/json',
        ],
    ]);
    if (is_wp_error($r)) return new WP_Error('hk_w_net', 'Razorpay network error: '.$r->get_error_message(), ['status'=>502]);
    $code = wp_remote_retrieve_response_code($r);
    $body = json_decode(wp_remote_retrieve_body($r), true);
    if ($code !== 200 || empty($body['id'])) return new WP_Error('hk_w_rzp', 'Razorpay payment fetch failed', ['status'=>502, 'rzp'=>$body, 'http'=>$code]);
    return $body;
}

function hk_wallet_verify_signature($order_id, $payment_id, $signature) {
    $k = hk_wallet_keys();
    if (!$k['key_secret']) return false;
    $expected = hash_hmac('sha256', $order_id . '|' . $payment_id, $k['key_secret']);
    return hash_equals($expected, (string)$signature);
}

/* ---------- REST routes ---------- */
add_action('rest_api_init', function () {
    $auth  = function () { return is_user_logged_in(); };
    $admin = function () { return current_user_can('manage_options'); };

    register_rest_route('hk/v1', '/wallet/me', [
        'methods'=>'GET','permission_callback'=>$auth,
        'callback'=>function () {
            $uid = get_current_user_id();
            global $wpdb; $tbl = hk_wallet_table();
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT id,type,delta_yavi,balance_after,ref_kind,ref_id,amount_paise,note,created_at FROM $tbl WHERE user_id=%d ORDER BY id DESC LIMIT 20",
                $uid
            ), ARRAY_A);
            return new WP_REST_Response([
                'ok'=>true,
                'balance_yavi'=>hk_wallet_balance_for($uid),
                'tiers'=>hk_wallet_tiers(),
                'recent'=>$rows ?: [],
                'currency'=>'YAVI',
                'topup_enabled'=>hk_wallet_keys()['enabled'],
            ], 200);
        },
    ]);

    register_rest_route('hk/v1', '/wallet/history', [
        'methods'=>'GET','permission_callback'=>$auth,
        'args'=>['limit'=>['type'=>'integer','default'=>50],'offset'=>['type'=>'integer','default'=>0]],
        'callback'=>function (WP_REST_Request $req) {
            $uid = get_current_user_id();
            $limit  = max(1, min(100, (int)$req->get_param('limit')));
            $offset = max(0, (int)$req->get_param('offset'));
            global $wpdb; $tbl = hk_wallet_table();
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT id,type,delta_yavi,balance_after,ref_kind,ref_id,amount_paise,note,created_at FROM $tbl WHERE user_id=%d ORDER BY id DESC LIMIT %d OFFSET %d",
                $uid, $limit, $offset
            ), ARRAY_A);
            $total = (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $tbl WHERE user_id=%d", $uid));
            return new WP_REST_Response(['ok'=>true,'total'=>$total,'items'=>$rows ?: []], 200);
        },
    ]);

    register_rest_route('hk/v1', '/wallet/topup/create-order', [
        'methods'=>'POST','permission_callback'=>$auth,
        'callback'=>function (WP_REST_Request $req) {
            global $wpdb;
            $uid = get_current_user_id();
            $params = $req->get_json_params() ?: $req->get_params();
            $amount_inr = (int)($params['amount_inr'] ?? 0);
            $tiers = hk_wallet_tiers();
            if (!isset($tiers[$amount_inr])) {
                return new WP_Error('hk_w_tier', 'Invalid topup amount. Allowed: '.implode(', ', array_keys($tiers)), ['status'=>400]);
            }
            $tk = 'hk_w_throttle_' . $uid;
            $hits = (int)get_transient($tk);
            if ($hits >= 6) return new WP_Error('hk_w_rate', 'Too many topup attempts. Try later.', ['status'=>429]);
            set_transient($tk, $hits + 1, HOUR_IN_SECONDS);

            $receipt = 'hk_w_' . $uid . '_' . time();
            $order = hk_wallet_rzp_create_order($amount_inr * 100, $receipt);
            if (is_wp_error($order)) return $order;

            $tokens = $tiers[$amount_inr];

            // Persist pending order — verify will trust THIS, not the client.
            $ok = $wpdb->insert(hk_wallet_table_pend(), [
                'rzp_order_id'     => (string)$order['id'],
                'user_id'          => $uid,
                'amount_inr'       => $amount_inr,
                'amount_paise'     => $amount_inr * 100,
                'tokens_to_credit' => $tokens,
                'status'           => 'pending',
                'created_at'       => current_time('mysql', true),
            ], ['%s','%d','%d','%d','%d','%s','%s']);
            if ($ok === false) {
                return new WP_Error('hk_w_pend_fail', 'Could not record pending order: '.$wpdb->last_error, ['status'=>500]);
            }

            return new WP_REST_Response([
                'ok'               => true,
                'order_id'         => $order['id'],
                'amount_paise'     => $amount_inr * 100,
                'amount_inr'       => $amount_inr,
                'tokens_to_credit' => $tokens,
                'currency'         => 'INR',
                'key_id'           => hk_wallet_keys()['key_id'],
                'name'             => get_bloginfo('name'),
                'description'      => "Add {$tokens} YAVI Tokens",
                'prefill_email'    => wp_get_current_user()->user_email,
            ], 200);
        },
    ]);

    register_rest_route('hk/v1', '/wallet/topup/verify', [
        'methods'=>'POST','permission_callback'=>$auth,
        'callback'=>function (WP_REST_Request $req) {
            global $wpdb;
            $uid = get_current_user_id();
            $p = $req->get_json_params() ?: $req->get_params();
            $order_id   = (string)($p['razorpay_order_id']   ?? '');
            $payment_id = (string)($p['razorpay_payment_id'] ?? '');
            $signature  = (string)($p['razorpay_signature']  ?? '');
            if (!$order_id || !$payment_id || !$signature) return new WP_Error('hk_w_missing', 'Missing payment fields', ['status'=>400]);

            // 1. Signature check — proves callback came from Razorpay.
            if (!hk_wallet_verify_signature($order_id, $payment_id, $signature)) {
                return new WP_Error('hk_w_sig', 'Bad signature', ['status'=>400]);
            }

            // 2. Look up server-side pending order. THIS is the source of truth for amount + user.
            $pend_tbl = hk_wallet_table_pend();
            $pend = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM $pend_tbl WHERE rzp_order_id = %s LIMIT 1", $order_id
            ), ARRAY_A);
            if (!$pend) return new WP_Error('hk_w_no_pend', 'Unknown order', ['status'=>400]);

            // 3. Order must belong to caller (prevents "verify someone else's order").
            if ((int)$pend['user_id'] !== $uid) {
                return new WP_Error('hk_w_owner', 'Order does not belong to current user', ['status'=>403]);
            }

            // 4. Server-side fetch the actual payment from Razorpay.
            $pay = hk_wallet_rzp_fetch_payment($payment_id);
            if (is_wp_error($pay)) return $pay;

            // 5. Payment must be linked to THIS order, fully captured, in INR, and amount must match.
            if (($pay['order_id'] ?? '') !== $order_id) {
                return new WP_Error('hk_w_pay_order', 'Payment does not belong to this order', ['status'=>400]);
            }
            if (strtolower((string)($pay['status'] ?? '')) !== 'captured') {
                return new WP_Error('hk_w_not_captured', 'Payment not captured (status: '.($pay['status'] ?? 'unknown').')', ['status'=>400]);
            }
            if (strtolower((string)($pay['currency'] ?? '')) !== 'inr') {
                return new WP_Error('hk_w_currency', 'Wrong currency', ['status'=>400]);
            }
            if ((int)($pay['amount'] ?? 0) !== (int)$pend['amount_paise']) {
                return new WP_Error('hk_w_amount', 'Paid amount does not match the pending order', ['status'=>400, 'paid'=>$pay['amount'], 'expected'=>$pend['amount_paise']]);
            }

            // 6. Credit using server-side tokens (NEVER trust client).
            $tokens     = (int)$pend['tokens_to_credit'];
            $amount_inr = (int)$pend['amount_inr'];
            $res = hk_wallet_append([
                'user_id'        => $uid,
                'type'           => 'topup',
                'delta_yavi'     => +$tokens,
                'ref_kind'       => 'razorpay',
                'ref_id'         => $payment_id,
                'rzp_order_id'   => $order_id,
                'rzp_payment_id' => $payment_id,
                'amount_paise'   => $amount_inr * 100,
                'note'           => "Topup ₹{$amount_inr} → {$tokens} YAVI",
                'meta'           => ['signature_verified'=>true, 'rzp_method'=>($pay['method'] ?? '')],
            ]);
            if (is_wp_error($res)) return $res;

            // 7. Mark pending consumed (idempotent — second verify just no-ops here too).
            $wpdb->update($pend_tbl,
                ['status'=>'consumed','ledger_id'=>$res['id'],'rzp_payment_id'=>$payment_id,'consumed_at'=>current_time('mysql', true)],
                ['rzp_order_id'=>$order_id],
                ['%s','%d','%s','%s'], ['%s']
            );

            return new WP_REST_Response([
                'ok'=>true,'credited_yavi'=>$tokens,'balance_yavi'=>$res['balance'],
                'duplicate'=>!empty($res['duplicate']),'ledger_id'=>$res['id'],
            ], 200);
        },
    ]);

    register_rest_route('hk/v1', '/wallet/admin/summary', [
        'methods'=>'GET','permission_callback'=>$admin,
        'callback'=>function () {
            global $wpdb; $tbl = hk_wallet_table();
            $row = $wpdb->get_row("SELECT COUNT(*) AS rows_total, COALESCE(SUM(delta_yavi),0) AS yavi_outstanding, COALESCE(SUM(amount_paise),0) AS paise_collected FROM $tbl", ARRAY_A);
            $top = $wpdb->get_results("SELECT user_id, COALESCE(SUM(delta_yavi),0) AS bal FROM $tbl GROUP BY user_id ORDER BY bal DESC LIMIT 20", ARRAY_A);
            $pend_tbl = hk_wallet_table_pend();
            $pend_count = (int)$wpdb->get_var("SELECT COUNT(*) FROM $pend_tbl WHERE status='pending' AND created_at < (NOW() - INTERVAL 30 MINUTE)");
            return new WP_REST_Response(['ok'=>true,'summary'=>$row,'top_users'=>$top,'orphan_pending'=>$pend_count], 200);
        },
    ]);

    register_rest_route('hk/v1', '/wallet/admin/adjust', [
        'methods'=>'POST','permission_callback'=>$admin,
        'callback'=>function (WP_REST_Request $req) {
            $p = $req->get_json_params() ?: $req->get_params();
            $uid   = (int)($p['user_id'] ?? 0);
            $delta = (int)($p['delta_yavi'] ?? 0);
            $note  = sanitize_text_field((string)($p['note'] ?? 'Admin adjustment'));
            if ($uid <= 0 || $delta === 0) return new WP_Error('hk_w_bad', 'Bad params', ['status'=>400]);
            $res = hk_wallet_append([
                'user_id'=>$uid,
                'type'=> $delta > 0 ? 'admin_credit' : 'admin_debit',
                'delta_yavi'=>$delta,
                'ref_kind'=>'admin',
                'ref_id'=>'admin_'.get_current_user_id(),
                'note'=>$note,
                'meta'=>['admin_id'=>get_current_user_id()],
            ]);
            if (is_wp_error($res)) return $res;
            return new WP_REST_Response($res, 200);
        },
    ]);
});

/* ---------- Admin settings page ---------- */
add_action('admin_menu', function () {
    add_options_page('HK Wallet', 'HK Wallet (YAVI)', 'manage_options', 'hk-wallet', 'hk_wallet_admin');
});
add_action('admin_init', function () {
    register_setting('hk_wallet_group', HK_WALLET_OPT_KEYS, ['type'=>'array','sanitize_callback'=>function($i){
        if (!is_array($i)) $i = [];
        $secret_in = (string)($i['key_secret'] ?? '');
        if ($secret_in === '••••••••' || $secret_in === '') {
            $cur = hk_wallet_keys();
            $secret_in = $cur['key_secret'];
        }
        return [
            'key_id'     => sanitize_text_field((string)($i['key_id'] ?? '')),
            'key_secret' => sanitize_text_field($secret_in),
            'enabled'    => !empty($i['enabled']) ? 1 : 0,
        ];
    }]);
});
function hk_wallet_admin() {
    if (!current_user_can('manage_options')) return;
    $k = hk_wallet_keys();
    $secret_mask = $k['key_secret'] ? '••••••••' : '';
    global $wpdb; $tbl = hk_wallet_table();
    $sum = $wpdb->get_row("SELECT COUNT(*) AS rows_total, COALESCE(SUM(delta_yavi),0) AS yavi_outstanding, COALESCE(SUM(amount_paise),0) AS paise_collected FROM $tbl", ARRAY_A);
    ?>
    <div class="wrap">
      <style>
        .hkw-card{ background:#fff; border:1px solid #ccd0d4; border-radius:8px; padding:18px 22px; margin:14px 0; max-width:780px; }
        .hkw-stat{ display:inline-block; min-width:160px; margin-right:24px; }
        .hkw-stat .num{ font-size:28px; font-weight:700; color:#0D1B4C; }
        .hkw-stat .lbl{ font-size:12px; text-transform:uppercase; color:#666; letter-spacing:.5px; }
        .hkw-tier{ display:inline-block; background:#FEF3C7; border:2px solid #0D1B4C; border-radius:99px; padding:6px 14px; font-weight:700; margin-right:10px; margin-bottom:6px; }
        .hkw-card input[type=text], .hkw-card input[type=password]{ font-size:14px !important; padding:8px 10px !important; }
        .hkw-card .button{ font-size:15px !important; padding:8px 18px !important; min-height:40px; }
      </style>
      <h1>💎 HK Wallet — YAVI Tokens</h1>
      <div class="hkw-card">
        <h2 style="margin-top:0;">Live numbers</h2>
        <div class="hkw-stat"><div class="num"><?php echo (int)$sum['yavi_outstanding']; ?></div><div class="lbl">YAVI in circulation</div></div>
        <div class="hkw-stat"><div class="num">₹<?php echo number_format(((int)$sum['paise_collected'])/100, 2); ?></div><div class="lbl">Total topups (gross)</div></div>
        <div class="hkw-stat"><div class="num"><?php echo (int)$sum['rows_total']; ?></div><div class="lbl">Ledger rows</div></div>
      </div>
      <div class="hkw-card">
        <h2 style="margin-top:0;">Topup tiers (immutable)</h2>
        <p style="color:#555;">Hard-coded for safety. To add a new tier, deploy a code update. Verify endpoint independently re-fetches the actual paid amount from Razorpay before crediting — client cannot lie about amount.</p>
        <?php foreach (hk_wallet_tiers() as $inr => $yavi): ?><span class="hkw-tier">₹<?php echo $inr; ?> → <?php echo $yavi; ?> YAVI</span><?php endforeach; ?>
      </div>
      <form method="post" action="options.php">
        <?php settings_fields('hk_wallet_group'); ?>
        <div class="hkw-card">
          <h2 style="margin-top:0;">Razorpay (wallet-only — isolated from existing payment plugin)</h2>
          <p style="color:#555;">Paste Razorpay keys. Stored as a WP option with autoload off. Leaving the secret masked keeps the existing value.</p>
          <table class="form-table" role="presentation">
            <tr><th>Enabled</th><td><label><input type="checkbox" name="<?php echo HK_WALLET_OPT_KEYS; ?>[enabled]" value="1" <?php checked($k['enabled']); ?>> Allow users to top up YAVI</label></td></tr>
            <tr><th><label>Key ID</label></th><td><input type="text" class="regular-text" name="<?php echo HK_WALLET_OPT_KEYS; ?>[key_id]" value="<?php echo esc_attr($k['key_id']); ?>" placeholder="rzp_live_..." autocomplete="off"></td></tr>
            <tr><th><label>Key Secret</label></th><td><input type="password" class="regular-text" name="<?php echo HK_WALLET_OPT_KEYS; ?>[key_secret]" value="<?php echo esc_attr($secret_mask); ?>" placeholder="••••••••" autocomplete="new-password"></td></tr>
          </table>
          <?php submit_button('Save Razorpay keys'); ?>
        </div>
      </form>
    </div>
    <?php
}
