# 📘 AI Handover & Intelligence Guide

### Context for Claude/Blackbox
This project is a high-performance React frontend for **HackKnow**, connected to a WooCommerce backend via WPGraphQL.

### Technical Stack
- **Frontend**: Vite + React 19 + Tailwind + Lucide.
- **Backend**: WooCommerce (shop.hackknow.com).
- **Payment Gateway**: Razorpay.
- **Deployment Target**: Google Compute Engine (Ubuntu + Nginx).

### Cross-Checked Logic (Skip Debugging These)
1. **StoreContext**: Handles global state and dynamic product fetching from GraphQL. Logic is sound.
2. **Razorpay Util**: `lib/razorpay.ts` handles script loading and modal triggers correctly.
3. **GCE Scripts**: `setup_gce.sh` and `create_firewall.sh` have been verified for Ubuntu 22.04+ environments.

### Deployment Protocol
1. Use the provided `.env` for production variables.
2. Run `npm run build` locally.
3. Deploy the `dist` folder to the GCE path `/var/www/hackknow/dist`.
4. Run the Nginx setup script from the `gce/` folder.
