# `_archive/`

Files kept for historical reference only. **Nothing in this folder is loaded
by the live site.** WordPress only auto-loads `*.php` from
`wp-content/mu-plugins/` on the server (deployed from `hostinger/mu-plugins/`
in this repo), so any PHP file moved here is simply ignored by the runtime.

If you ever need to revive any of these, move it back to its original
location and redeploy.

---

## What was archived and why

### `legacy-mu-plugins/`

Earlier iterations of the content seeder, written while bootstrapping the
HackKnow CMS. Only `hackknow-content-seed.php` (the original auto-creator
for the WC category + MIS90/STUDENT6FREE coupons) and
`hackknow-content-seed-v7.php` (the current sample-course seeder) are still
loaded.

| File | Original location | Replaced by |
|---|---|---|
| `hackknow-content-seed-v4.php` | `hostinger/mu-plugins/` | `hostinger/mu-plugins/hackknow-content-seed-v7.php` |
| `hackknow-content-seed-v5.php` | `hostinger/mu-plugins/` | `hostinger/mu-plugins/hackknow-content-seed-v7.php` |
| `hackknow-content-seed-v6.php` | `hostinger/mu-plugins/` | `hostinger/mu-plugins/hackknow-content-seed-v7.php` |

### `legacy-nginx/`

Early flat-file nginx configs from the initial GCE setup. The current
production configs live under `gce/nginx/`.

| File | Original location | Replaced by |
|---|---|---|
| `nginx.conf` | `gce/` | `gce/nginx/hackknow.conf` |
| `nginx-hackknow.conf` | `gce/` | `gce/nginx/hackknow.conf` |

### `legacy-wp-content/`

Older snapshot of the checkout plugin committed before the source-of-truth
was moved to `hostinger/mu-plugins/`. The deployed version on Hostinger is
the larger, newer file at `hostinger/mu-plugins/hackknow-checkout.php`.

| File | Original location | Replaced by |
|---|---|---|
| `mu-plugins/hackknow-checkout.php` (113 KB) | `wp-content/` | `hostinger/mu-plugins/hackknow-checkout.php` (144 KB) |

### `legacy-replit-api-server/`

A standalone Express router that briefly hosted the Yahavi AI chatbot on
Replit. The chatbot now lives entirely inside WordPress as a REST endpoint.

| File | Original location | Replaced by |
|---|---|---|
| `chat.ts` | `replit-api-server/` | `hostinger/mu-plugins/hackknow-extras.php` (`POST /wp-json/hackknow/v1/chat`) |
