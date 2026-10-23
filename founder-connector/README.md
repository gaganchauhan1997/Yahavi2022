# HackKnow Founder Connector (draft-product pilot)

One HTTPS MCP endpoint can be added to different Manus accounts, one at a time. This pilot exposes only product listing and draft creation/editing. It cannot publish, delete, change orders, or alter frontend code.

## Deploy once

Deploy this Node 20+ folder behind HTTPS on a service you control. Run `npm ci && npm start` (or `npm install && npm start` until the lockfile exists). Configure server-side secrets:

- `WC_ORIGIN=https://shop.hackknow.com` (verify actual backend URL)
- `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`: dedicated WooCommerce REST key with product write permission; never paste into Manus
- `HK_CONNECTOR_TOKEN`: random 32+ character token, e.g. generate with `openssl rand -hex 32`
- `PORT`: optional (defaults to 8788)

The `/health` path is public and reveals no credentials. `/mcp` requires `Authorization: Bearer <HK_CONNECTOR_TOKEN>`. Use separate hosting authentication/rate limits and HTTPS. Rotate the token if an account is no longer trusted. A single shared token cannot identify which Manus account acted; use separate scoped tokens and persistent audit logs before allowing more powerful actions.

## Connect an account

In Manus: Settings → Integrations → Custom MCP Servers → Add Server. Name: `HackKnow Founder`; URL: `https://YOUR-HOST/mcp`; authentication: Bearer token (`HK_CONNECTOR_TOKEN`). Test the connection. For another account, enter the same URL and token there; disconnect the previous account if only one should have access. Availability of custom MCP on a particular free account must be checked in its UI.

Prompt: “Use HackKnow Founder to create a DRAFT product named X for ₹499. Show me the ID and edit link. Do not publish.” Images must first exist in WordPress Media Library; pass the numeric media ID.

## Boundaries

This connector is not deployed by committing it. Hosting, WooCommerce REST credentials, TLS, and a successful end-to-end draft test are required before it can be used. Do not share the bearer token publicly or put it in GitHub. Avoid using multiple free accounts to evade provider limits; check Manus terms for your intended use.
