<?php
// Offline contract tests: no WordPress install, remote APIs, payments or mail.
define('ABSPATH', __DIR__);
class WP_Error { public function __construct(public $code, public $message, public $data = []) {} }
function is_wp_error($value) { return $value instanceof WP_Error; }
function get_post_meta($id, $key, $single) { return ''; }
require __DIR__ . '/../../hostinger/mu-plugins/inc/hk-payment-safety.php';
class FakeOrder {
    public $meta = ['_razorpay_order_id' => 'order_1'];
    public $status = 'pending';
    public function get_id() { return 1; }
    public function get_meta($key, $single) { return $this->meta[$key] ?? ''; }
    public function get_total() { return '123.45'; }
    public function get_currency() { return 'INR'; }
    public function get_status() { return $this->status; }
}
$order = new FakeOrder();
$valid = ['id'=>'pay_1', 'order_id'=>'order_1', 'amount'=>12345, 'currency'=>'INR', 'status'=>'captured'];
$checks = 0;
function check($ok, $label) { global $checks; if (!$ok) throw new Exception($label); $checks++; }
check(hk_payment_validate($order, $valid) === true, 'captured payment accepted');
foreach (['order_id'=>'order_other','amount'=>1,'currency'=>'USD','status'=>'authorized','id'=>''] as $key=>$value) {
    check(is_wp_error(hk_payment_validate($order, array_merge($valid, [$key=>$value]))), 'reject '.$key);
}
$order->meta['_razorpay_order_id'] = '';
check(is_wp_error(hk_payment_validate($order, $valid)), 'binding is mandatory');
$order->meta['_razorpay_order_id'] = 'order_1';
foreach (['refunded','cancelled'] as $status) { $order->status=$status; check(is_wp_error(hk_payment_validate($order, $valid)), 'closed order rejected'); }
$order->status='pending'; $order->meta['_razorpay_payment_id']='pay_other';
check(is_wp_error(hk_payment_validate($order,$valid)), 'conflicting payment rejected');
echo "Payment invariants: $checks assertions passed\n";

// Exercise the shared mutation path, including retries and lock contention.
class FakeDB {
    public $busy = false;
    public $releases = 0;
    function prepare($query, $value) { return $query; }
    function get_var($query) {
        if (str_contains($query, 'RELEASE_LOCK')) { $this->releases++; return 1; }
        return $this->busy ? 0 : 1;
    }
}
class MutableOrder extends FakeOrder {
    public $id = 1;
    public $completionCalls = 0;
    public $throwOnce = false;
    function get_id() { return $this->id; }
    function is_paid() { return in_array($this->status, ['processing', 'completed'], true); }
    function update_meta_data($key, $value) { $this->meta[$key] = $value; }
    function save() {}
    function payment_complete($id) {
        if ($this->throwOnce) { $this->throwOnce = false; throw new Exception('simulated crash before completion'); }
        $this->completionCalls++; $this->status = 'processing';
    }
    function update_status($status, $note) { $this->status = $status; }
}
$orders = []; $options = [];
function wc_get_order($id) { global $orders; return $orders[$id] ?? false; }
function add_option($key, $value, $deprecated, $autoload) {
    global $options;
    if (isset($options[$key])) return false;
    $options[$key] = $value; return true;
}
function get_option($key, $default = '') { global $options; return $options[$key] ?? $default; }
$wpdb = new FakeDB();
$orders[1] = new MutableOrder();
check(hk_payment_complete_once($orders[1], $valid)['changed'], 'first captured payment completes');
check(!hk_payment_complete_once($orders[1], $valid)['changed'], 'callback/webhook retry is idempotent');
check($orders[1]->completionCalls === 1, 'completion hooks called exactly once');
$orders[2] = new MutableOrder(); $orders[2]->id = 2;
check(is_wp_error(hk_payment_complete_once($orders[2], $valid)), 'same payment cannot complete a second WC order');
check($orders[2]->completionCalls === 0, 'reused payment causes no mutation');
$wpdb->busy = true;
check(is_wp_error(hk_payment_complete_once($orders[2], array_merge($valid, ['id'=>'pay_2']))), 'concurrent order lock is fail closed');
$wpdb->busy = false;
$orders[2]->throwOnce = true;
$releaseBefore = $wpdb->releases;
try { hk_payment_complete_once($orders[2], array_merge($valid, ['id'=>'pay_2'])); }
catch (Exception $e) { check($wpdb->releases === $releaseBefore + 1, 'lock released on an exception'); }
check(hk_payment_complete_once($orders[2], array_merge($valid, ['id'=>'pay_2']))['changed'], 'same-order retry recovers persistent payment binding');
check($orders[2]->completionCalls === 1, 'crash recovery completes once');
echo "Payment validation + completion: $checks assertions passed (stubbed WP/WC database)\n";

// Load the actual canonical plugin without executing WordPress hooks.
function add_action(...$args) {}
function add_filter(...$args) {}
function remove_filter(...$args) {}
define('DAY_IN_SECONDS', 86400);
function sanitize_text_field($s) { return $s; }
function absint($v) { return abs((int)$v); }
function wp_json_encode($v) { return json_encode($v); }
function wp_salt($v) { return 'offline-test-salt'; }
$user = (object)['user_pass'=>'old-password-hash'];
function get_user_by($field, $value) { global $user; return $value === 7 ? $user : false; }
class WP_REST_Request {
    function __construct(public $params) {}
    function get_param($k) { return $this->params[$k] ?? null; }
}
$remoteCalls = 0;
function wp_remote_get($url, $options) { global $remoteCalls, $valid; $remoteCalls++; return ['body'=>json_encode($valid), 'status'=>200]; }
function wp_remote_retrieve_response_code($response) { return $response['status']; }
function wp_remote_retrieve_body($response) { return $response['body']; }
require __DIR__ . '/../../hostinger/mu-plugins/hackknow-checkout.php';
$options['woocommerce_razorpay_settings'] = ['key_id'=>'offline-key','key_secret'=>'offline-secret'];
$before = $orders[1]->get_status();
$bad = new WP_REST_Request(['razorpay_order_id'=>'order_1','razorpay_payment_id'=>'pay_1','razorpay_signature'=>'forged','wc_order_id'=>1]);
check(hackknow_verify_payment($bad)->code === 'bad_signature', 'canonical verify rejects bad signature');
check($orders[1]->get_status() === $before && $remoteCalls === 0, 'forged callback neither downgrades paid order nor calls Razorpay');
$bad->params['razorpay_order_id'] = 'order_other';
check(hackknow_verify_payment($bad)->code === 'order_mismatch', 'canonical verify binds submitted order to stored order');
$token = hackknow_make_token(7);
check(hackknow_verify_token($token) === 7, 'fresh token authenticates');
$user->user_pass = 'new-password-hash';
check(hackknow_verify_token($token) === null, 'password reset revokes old token');
check(hackknow_verify_token(hackknow_make_token(7)) === 7, 'new login works after password reset');
check(hackknow_verify_token($token.'tampered') === null, 'tampered token rejected');
echo "Canonical verify + token revocation included: $checks assertions passed\n";
