# 🚀 FINAL DEPLOYMENT HANDOVER (For Claude/Blackbox)

### 🛑 DO NOT MODIFY (Verified by Colab AI)
- [x] **GraphQL Data Mapping**: The `StoreContext.tsx` and `graphql-client.ts` are 100% verified to work with `shop.hackknow.com`. Do not refactor these.
- [x] **Nginx Routing**: `gce/nginx.conf` is configured for SPA routing. Do not change the `try_files` logic.
- [x] **Hybrid Routing**: `App.tsx` correctly handles the `/login` redirect to WooCommerce. 
- [x] **Project Structure**: All paths are mapped to standard Vite/React structures.

### ⚡ ACTION REQUIRED (Claude/Blackbox Tasks)
- [ ] **Environment Variable Sync**: Help the user ensure `.env` has the REAL `VITE_RAZORPAY_KEY_ID` (rzp_live...).
- [ ] **Yahavi AI ID**: Replace `'YOUR_YAHAVI_ID'` in `src/components/YahaviAI.tsx` with the user's actual ID.
- [ ] **Local Build**: Guide the user through `npm install` and `npm run build` in the `app` folder.
- [ ] **GCE Transfer**: Assist the user in using SCP or FileZilla to move the `dist/` folder to `/var/www/hackknow/dist` on the VM.
- [ ] **SSL Activation**: Once the IP is pointed to the domain, run the Certbot commands provided in the setup guide.
