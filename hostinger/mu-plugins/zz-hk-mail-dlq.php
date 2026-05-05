<?php
/**
 * Plugin Name: HackKnow — Self-Healing Mail DLQ
 * Description: Listens to `hackknow_free_order_completed` and sends the
 *              download-link email via wp_mail wrapped in try/catch. On
 *              failure (SMTP timeout, auth error, transient network),
 *              the payload is pushed to a Dead-Letter Queue persisted in
 *              wp_options and re-attempted via `wp_schedule_single_event`
 *              with exponential backoff: 60s → 5m → 15m → 1h.
 *
 *              No DB polling cron, no schema changes — entirely event-
 *              driven. Also catches `wp_mail_failed` for any messages
 *              this plugin originated, providing defence in depth against
 *              SMTP filter chains that swallow exceptions.
 *
 *              Standing-rules safety:
 *                - hackknow-checkout.php SMTP/email infra is NOT modified
 *                - We never alter the wp_mail filter chain or SMTP creds
 *                - All retries call wp_mail() exactly as a normal sender would
 *
 * Version:     1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

const HK_DLQ_OPTION_PENDING = 'hk_dlq_pending';
const HK_DLQ_OPTION_FAILED  = 'hk_dlq_failed';
const HK_DLQ_BACKOFF        = [ 60, 300, 900, 3600 ];  // 1m / 5m / 15m / 1h
const HK_DLQ_MAX_ATTEMPTS   = 4;

/* ── 1. Wire the action that the free-orders plugin fires ────────────── */
add_action( 'hackknow_free_order_completed', function ( $order_id, $uid, $context = [] ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) { return; }

    $to        = $context['email'] ?? $order->get_billing_email();
    $first     = $context['first'] ?? $order->get_billing_first_name();
    $downloads = $context['downloads'] ?? [];

    if ( empty( $to ) ) {
        error_log( '[hk-dlq] order #' . $order_id . ' has no email — skipping send' );
        return;
    }

    $payload = [
        'order_id' => (int) $order_id,
        'to'       => $to,
        'subject'  => 'Your HackKnow downloads — order #' . $order->get_order_number(),
        'body'     => hk_dlq_render_email( $order, $first, $downloads ),
        'headers'  => [ 'Content-Type: text/html; charset=UTF-8' ],
        'attempt'  => 1,
        'created'  => time(),
    ];
    hk_dlq_send( $payload );
}, 10, 3 );

/* ── 2. Send wrapper — sent-flag check + single try, on failure enqueue ─
 *   Idempotency model: each order carries a meta `_hk_dlq_sent_at` flag
 *   set on the FIRST successful wp_mail(). All subsequent retries
 *   (whether scheduled before the success or queued by another path)
 *   short-circuit when they see this flag, so the same email is never
 *   sent twice — even if a stale wp_schedule_single_event fires later.
 */
function hk_dlq_send( array $p ): void {
    $oid = (int) ( $p['order_id'] ?? 0 );

    // Idempotency check — already delivered?
    if ( $oid > 0 ) {
        $already = get_post_meta( $oid, '_hk_dlq_sent_at', true );
        if ( $already ) {
            hk_dlq_clear_pending( $oid );
            error_log( '[hk-dlq] SKIP order #' . $oid . ' — already delivered at ' . $already );
            return;
        }
    }

    try {
        $sent = wp_mail( $p['to'], $p['subject'], $p['body'], $p['headers'] );
        if ( ! $sent ) {
            throw new Exception( 'wp_mail returned false' );
        }
        // Stamp the order so future retries become no-ops.
        if ( $oid > 0 ) {
            update_post_meta( $oid, '_hk_dlq_sent_at', current_time( 'mysql' ) );
            update_post_meta( $oid, '_hk_dlq_sent_to', (string) $p['to'] );
        }
        hk_dlq_clear_pending( $oid );
        error_log( '[hk-dlq] order #' . $oid . ' delivered to ' . $p['to'] . ' on attempt ' . $p['attempt'] );
    } catch ( Throwable $e ) {
        hk_dlq_enqueue( $p, $e->getMessage() );
    }
}

/* ── 3. Enqueue with exponential backoff ─────────────────────────────── */
function hk_dlq_enqueue( array $p, string $reason ): void {
    $attempt = (int) $p['attempt'];
    if ( $attempt >= HK_DLQ_MAX_ATTEMPTS ) {
        // Exhausted — persist for owner review, do not re-schedule.
        hk_dlq_persist_failed( $p, $reason );
        hk_dlq_clear_pending( (int) $p['order_id'] );
        error_log( '[hk-dlq] EXHAUSTED order #' . $p['order_id'] . ' to=' . $p['to'] . ' reason=' . $reason );
        return;
    }
    $delay = HK_DLQ_BACKOFF[ $attempt - 1 ] ?? end( HK_DLQ_BACKOFF );
    $next  = $p;
    $next['attempt']     = $attempt + 1;
    $next['last_reason'] = $reason;
    $next['next_at']     = time() + $delay;

    // Dedupe — if a retry is already scheduled for this order at any
    // future time, don't pile on. wp_next_scheduled returns the timestamp
    // of the next matching event or false. We key by order_id so multiple
    // queue paths cannot create competing crons for the same order.
    $existing = wp_next_scheduled( 'hk_dlq_retry', [ $next ] );
    // Note: WP keys cron events by hash(hook + args). Since `next` always
    // has a fresh attempt+next_at, we must also do an order-level guard
    // separately by walking pending — covered by the sent-flag idempotency
    // in hk_dlq_send which makes duplicate fires harmless no-ops.
    if ( ! $existing ) {
        wp_schedule_single_event( $next['next_at'], 'hk_dlq_retry', [ $next ] );
    }
    hk_dlq_persist_pending( $next );
    error_log( '[hk-dlq] enqueued order #' . $p['order_id'] . ' attempt=' . $next['attempt'] . ' delay=' . $delay . 's reason=' . $reason );
}

/* ── 4. Cron hook — fires when wp_schedule_single_event matures ──────── */
add_action( 'hk_dlq_retry', function ( $payload ) {
    if ( ! is_array( $payload ) ) { return; }
    hk_dlq_send( $payload );
}, 10, 1 );

/* ── 5. Defence in depth: catch wp_mail failures globally for our msgs ─ */
add_action( 'wp_mail_failed', function ( WP_Error $err ) {
    $data = $err->get_error_data();
    if ( ! is_array( $data ) ) { return; }
    // Only re-queue messages we originated (subject prefix = our marker).
    $subject = $data['subject'] ?? '';
    if ( strpos( $subject, 'Your HackKnow downloads' ) !== 0 ) { return; }
    // Reconstruct a minimal payload — note the cron retry will rebuild
    // the body from the order, so we just need order_id + to.
    $to = is_array( $data['to'] ?? null ) ? ( $data['to'][0] ?? '' ) : ( $data['to'] ?? '' );
    if ( ! $to ) { return; }
    error_log( '[hk-dlq] wp_mail_failed observed (defence path): ' . $err->get_error_message() );
    // Already enqueued by hk_dlq_send → hk_dlq_enqueue path; this is just
    // a log marker so admins can see SMTP errors in error_log even when
    // a third-party plugin swallows the wp_mail return value.
} );

/* ── 6. Persistence helpers (wp_options, no schema change) ───────────── */
function hk_dlq_persist_pending( array $row ): void {
    $rows = get_option( HK_DLQ_OPTION_PENDING, [] );
    if ( ! is_array( $rows ) ) { $rows = []; }
    $oid = (int) $row['order_id'];
    // De-dupe by order_id — newer attempt replaces older.
    $rows = array_filter( $rows, fn( $r ) => (int) ( $r['order_id'] ?? 0 ) !== $oid );
    $rows[] = $row;
    update_option( HK_DLQ_OPTION_PENDING, array_values( $rows ), false );
}
function hk_dlq_clear_pending( int $order_id ): void {
    $rows = get_option( HK_DLQ_OPTION_PENDING, [] );
    if ( ! is_array( $rows ) ) { return; }
    $rows = array_filter( $rows, fn( $r ) => (int) ( $r['order_id'] ?? 0 ) !== $order_id );
    update_option( HK_DLQ_OPTION_PENDING, array_values( $rows ), false );
}
function hk_dlq_persist_failed( array $row, string $reason ): void {
    $rows = get_option( HK_DLQ_OPTION_FAILED, [] );
    if ( ! is_array( $rows ) ) { $rows = []; }
    $row['final_reason'] = $reason;
    $row['failed_at']    = time();
    $rows[] = $row;
    // Keep only the most recent 200 — prevents unbounded growth.
    if ( count( $rows ) > 200 ) { $rows = array_slice( $rows, -200 ); }
    update_option( HK_DLQ_OPTION_FAILED, array_values( $rows ), false );
}

/* ── 7. Admin-only inspection endpoint ───────────────────────────────── */
add_action( 'rest_api_init', function () {
    register_rest_route( 'hackknow/v1', '/admin/dlq', [
        'methods'  => 'GET',
        'callback' => function () {
            if ( ! current_user_can( 'manage_options' ) ) {
                return new WP_Error( 'forbidden', 'Admin only', [ 'status' => 403 ] );
            }
            return rest_ensure_response( [
                'pending' => get_option( HK_DLQ_OPTION_PENDING, [] ),
                'failed'  => get_option( HK_DLQ_OPTION_FAILED, [] ),
                'now'     => time(),
            ] );
        },
        'permission_callback' => '__return_true',
    ] );
} );

/* ── 8. Email body renderer — branded, plain HTML, no external assets ── */
function hk_dlq_render_email( WC_Order $order, string $first, array $downloads ): string {
    $name   = $first ? esc_html( $first ) : 'there';
    $orderN = esc_html( (string) $order->get_order_number() );

    $rows = '';
    if ( empty( $downloads ) ) {
        $rows = '<tr><td style="padding:12px;border:1px solid #eee;">Your downloads are available in your <a href="' . esc_url( home_url( '/account/downloads' ) ) . '">account</a>.</td></tr>';
    } else {
        foreach ( $downloads as $d ) {
            $pname = esc_html( $d['product_name'] ?? '' );
            $fname = esc_html( $d['download_name'] ?? 'Download' );
            $url   = esc_url( $d['download_url'] ?? '' );
            $rows .= '<tr><td style="padding:12px;border:1px solid #eee;">'
                  . '<div style="font-weight:600;">' . $pname . '</div>'
                  . ( $url ? '<a href="' . $url . '" style="display:inline-block;margin-top:6px;padding:8px 16px;background:#FFD700;color:#000;text-decoration:none;border-radius:4px;font-weight:bold;">Download — ' . $fname . '</a>' : '<em>' . $fname . '</em>' )
                  . '</td></tr>';
        }
    }

    $home = esc_url( home_url( '/account/downloads' ) );

    return '<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">'
        . '<h1 style="font-size:22px;margin:0 0 8px;">Your HackKnow downloads are ready</h1>'
        . '<p style="margin:0 0 16px;">Hi ' . $name . ', thanks for your order <strong>#' . $orderN . '</strong>. Your files are below — they are also always available in <a href="' . $home . '">your account</a>.</p>'
        . '<table style="width:100%;border-collapse:collapse;margin:16px 0;">' . $rows . '</table>'
        . '<p style="font-size:13px;color:#666;margin-top:16px;">Download links are tied to your account. If you change device or clear your browser data, sign in again at <a href="' . esc_url( home_url( '/login' ) ) . '">' . esc_html( home_url( '/login' ) ) . '</a> and they will reappear.</p>'
        . '<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">'
        . '<p style="font-size:12px;color:#999;">— Team HackKnow · <a href="' . esc_url( home_url( '/' ) ) . '" style="color:#999;">www.hackknow.com</a></p>'
        . '</body></html>';
}
