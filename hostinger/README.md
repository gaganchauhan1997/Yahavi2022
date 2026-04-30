# Hostinger plugin source-of-truth

This directory holds the canonical source for the WordPress mu-plugin that
runs on `shop.hackknow.com` (Hostinger).

## Files

- `mu-plugins/hackknow-checkout.php` — checkout + auth bridge, custom REST
  routes, and the Yahavi AI chat (`POST /chat`). The top header docblock
  documents every constant the plugin reads from `wp-config.php`.

## Deployment

The plugin is uploaded to:

```
/home/u828497513/domains/shop.hackknow.com/public_html/wp-content/mu-plugins/hackknow-checkout.php
```

Edit the file here, commit, then sync to the Hostinger path above (via the
existing `.local/hackknow-push/` pull/push workflow or any SFTP client).

## Making outbound mail (password resets) reach Gmail inboxes

WordPress's default `wp_mail()` falls back to PHP `mail()`, which Gmail
silently drops or marks as spam because the messages have no DKIM signature
and the envelope sender doesn't match the `From:` header. To fix this we
switch PHPMailer onto authenticated SMTP through the real
`support@hackknow.com` Hostinger mailbox.

Add these to `wp-config.php` on Hostinger (chmod 600, OUTSIDE
`public_html/`, never commit):

```php
define('HACKKNOW_SMTP_HOST', 'smtp.hostinger.com');
define('HACKKNOW_SMTP_PORT', 465);
define('HACKKNOW_SMTP_USER', 'support@hackknow.com');
define('HACKKNOW_SMTP_PASS', '<mailbox password from Hostinger panel>');
// Optional overrides
// define('HACKKNOW_SMTP_SECURE', 'ssl');           // 'ssl' for 465, 'tls' for 587
// define('HACKKNOW_MAIL_FROM',   'support@hackknow.com');
// define('HACKKNOW_MAIL_FROM_NAME', 'HackKnow');
```

The mailbox password comes from **Hostinger panel → Emails →
support@hackknow.com → Reset password**.

### Verify

1. Trigger a "Forgot password" from the storefront against a Gmail address.
2. Tail `/home/u828497513/.logs/mail.log` — outbound entries should show the
   SMTP handoff (not a local PHP `mail()` pickup).
3. In Gmail, open the message → "Show original": confirm
   `spf=pass`, `dkim=pass`, and `From: HackKnow <support@hackknow.com>`.
4. If `HACKKNOW_SMTP_*` are missing, the plugin keeps working but falls
   back to PHP `mail()`, and Gmail will likely drop the message.

## Turning on real Gemini AI in the shop chat

Add ONE of these to `wp-config.php` on Hostinger:

```php
// Option A — free, recommended (relays to the Replit-deployed api-server)
define('HACKKNOW_AI_RELAY_URL', 'https://<your-replit-deploy>/api/chat');

// Option B — instant (needs a Google AI Studio key)
define('HACKKNOW_GEMINI_KEY', 'AIza...');
```

The plugin will pick whichever is defined; if neither is set the chat falls
back to deterministic, rule-based replies.
