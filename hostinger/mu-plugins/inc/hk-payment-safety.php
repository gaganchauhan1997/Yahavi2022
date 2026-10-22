<?php
/** Shared payment invariants. Deploy alongside the two checkout plugins. */
if (!defined('ABSPATH')) exit;

function hk_payment_order_meta($order, $key) {
    $value = method_exists($order, 'get_meta') ? $order->get_meta($key, true) : '';
    return $value !== '' ? $value : get_post_meta($order->get_id(), $key, true);
}

function hk_payment_validate($order, $payment) {
    if (!is_array($payment) || empty($payment['id']) || empty($payment['order_id'])) {
        return new WP_Error('invalid_payment', 'Payment details unavailable.', ['status' => 422]);
    }
    $stored = (string) hk_payment_order_meta($order, '_razorpay_order_id');
    if ($stored === '' || !hash_equals($stored, (string)$payment['order_id'])) {
        return new WP_Error('order_mismatch', 'Payment order does not match.', ['status' => 422]);
    }
    $expected = (int) round((float)$order->get_total() * 100);
    if ($expected <= 0 || !isset($payment['amount']) || (int)$payment['amount'] !== $expected) {
        return new WP_Error('amount_mismatch', 'Payment amount does not match.', ['status' => 422]);
    }
    if (($payment['status'] ?? '') !== 'captured' || strtoupper((string)($payment['currency'] ?? '')) !== 'INR'
        || strtoupper((string)$order->get_currency()) !== 'INR') {
        return new WP_Error('payment_not_captured', 'A captured INR payment is required.', ['status' => 422]);
    }
    if (in_array($order->get_status(), ['refunded', 'cancelled'], true)) {
        return new WP_Error('order_closed', 'This order is closed.', ['status' => 409]);
    }
    $existing = (string) hk_payment_order_meta($order, '_razorpay_payment_id');
    if ($existing !== '' && !hash_equals($existing, (string)$payment['id'])) {
        return new WP_Error('payment_conflict', 'Order already has a different payment.', ['status' => 409]);
    }
    return true;
}

/**
 * Serialize all completion paths on the same DB connection. A WP options
 * UNIQUE(option_name) binding additionally prevents one payment paying two orders.
 * A process crash releases GET_LOCK; the persistent binding permits a same-order retry.
 */
function hk_payment_complete_once($order, $payment) {
    global $wpdb;
    $lock = 'hk_pay_' . substr(hash('sha256', (string)$order->get_id()), 0, 40);
    if ((string)$wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', $lock)) !== '1') {
        return new WP_Error('payment_busy', 'Payment processing is in progress. Check order status shortly.', ['status' => 409]);
    }
    try {
        // Discard a WC object loaded before another completion acquired the lock.
        $fresh = wc_get_order($order->get_id());
        if (!$fresh) return new WP_Error('no_order', 'Order not found.', ['status' => 404]);
        $valid = hk_payment_validate($fresh, $payment);
        if (is_wp_error($valid)) return $valid;
        $binding = 'hk_payment_binding_' . hash('sha256', (string)$payment['id']);
        if (!add_option($binding, (string)$fresh->get_id(), '', false)
            && (string)get_option($binding, '') !== (string)$fresh->get_id()) {
            return new WP_Error('payment_reused', 'Payment already belongs to another order.', ['status' => 409]);
        }
        if ($fresh->is_paid()) return ['changed' => false];
        $fresh->update_meta_data('_razorpay_payment_id', (string)$payment['id']);
        $fresh->save();
        $fresh->payment_complete((string)$payment['id']);
        if (in_array($fresh->get_status(), ['processing', 'pending'], true)) {
            $fresh->update_status('completed', 'HackKnow: captured payment verified server-side.');
        }
        return ['changed' => true];
    } finally {
        $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock));
    }
}
