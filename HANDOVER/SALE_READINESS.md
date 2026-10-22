# HackKnow: production and template sale readiness

The live HackKnow application and a reusable storefront template need separate release tracks. Do not ship a ZIP of this production repository as a customer template.

## Production blockers observed 26 September 2026

- The scheduled auto-blog workflow runs, but fails because none of `GROQ_API_KEY_1` through `GROQ_API_KEY_10` is configured. Add at least one valid key in repository Actions secrets, then dispatch `Auto Blog Writer (Yahavi)` manually with `max_per_run=1` and inspect the generated post and commit. Never put a key in the repository or theme ZIP.
- The RSS frontend expects `/wp-json/hk/v1/rss` from `zz-hk-rss-proxy.php`, but this plugin is not present in the checked-in WordPress deployment sources. Check the deployed endpoint and deployed MU plugins before selecting a backend repair; do not assume the live WordPress files equal the repository.
- `npm run lint` currently reports 20 errors and 3 warnings. Resolve these before making lint a required merge gate. The new CI build gate checks the current reproducible production build.
- Configure branch protection to require the `build` status check after its first run. The workflow alone does not enforce a merge gate.

## Template release checklist

1. Create a separate, generic package/repository, retaining the production repo for HackKnow operations.
2. Remove HackKnow branding, domain names, catalog, customer or founder content, deployment markers, analytics IDs, production credentials, and company policies. Replace them with placeholders and sample data that you own.
3. Make the backend origin, payment provider, currency, contact details, and legal pages configurable. Document the exact WooCommerce and Cloudflare setup, including minimum versions and install steps.
4. Include only code, images, fonts, and content with redistribution rights. Keep all third-party license notices. The root project has an MIT license; verify ownership and rights for each bundled asset and contribution before commercial redistribution.
5. Test a clean install on a new domain and empty WooCommerce store; cover signup, cart, coupons, checkout, payment success/failure, refunds, downloads, and account deletion. Use payment sandbox credentials for the demo.
6. Produce screenshots, a live demo, changelog, customer support policy, and license terms tailored to the chosen marketplace. Review each marketplace's current submission rules immediately before uploading.

The production website can continue running while a separate template is sold. A template buyer must supply their own domain, backend, keys, payment account, and content.
