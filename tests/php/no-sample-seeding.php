<?php
// Offline: any attempt to access WP content APIs will fail this test.
define('ABSPATH', __DIR__);
$mode = $argv[1] ?? 'default';
if ($mode === 'production-enabled') define('HACKKNOW_ENABLE_SAMPLE_SEED', true);
function add_action(...$args) {}
function add_filter(...$args) {}
function wp_get_environment_type() {
    global $mode;
    return $mode === 'development-no-opt-in' ? 'development' : 'production';
}
$_GET = array_fill_keys(['hk_reseed', 'hk_reseed_v3', 'hk_reseed_v4b', 'seed_v6_products', 'hk_reseed_v7'], '1');
foreach (['hackknow-content-seed.php', 'hackknow-content-seed-v4.php', 'hackknow-content-seed-v5.php', 'hackknow-content-seed-v6.php', 'hackknow-content-seed-v7.php'] as $file) {
    require __DIR__ . '/../../hostinger/mu-plugins/' . $file;
}
$callbacks = ['hk_content_seed_v2', 'hk_content_seed_v3', 'hk_seed_v4_run', 'hk_seed_v5_run', 'hk_seed_v6_cats', 'hk_seed_v6_products', 'hk_seed_v7_run'];
foreach ($callbacks as $callback) $callback();
echo count($callbacks) . " sample-seeding callbacks blocked ($mode); no content APIs invoked.\n";
