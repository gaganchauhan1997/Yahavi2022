# HackKnow Project - AI Handover Document

## Project Overview
**Name:** HackKnow  
**Type:** Digital Product Marketplace (Gumroad Clone)  
**Stack:** React 19 + Vite + Tailwind CSS + TypeScript  
**Backend:** WordPress + WooCommerce + WPGraphQL  
**Payment:** Razorpay  
**Deployment:** Google Compute Engine (GCE) e2-micro  

---

## Current Status (Last Updated: April 27, 2026)

### ✅ Completed Features

#### Pages Implemented
1. **HomePage** (`app/src/pages/HomePage.tsx`)
   - Hero section with CTA
   - Categories grid
   - Trending products section
   - Features section
   - Newsletter signup

2. **ShopPage** (`app/src/pages/ShopPage.tsx`)
   - Product grid with filters
   - Category filtering
   - Price sorting
   - Search functionality
   - Pagination

3. **ProductPage** (`app/src/pages/ProductPage.tsx`)
   - Product details display
   - Image gallery
   - Add to cart
   - Reviews section
   - Related products

4. **CartPage** (`app/src/pages/CartPage.tsx`)
   - Cart items list
   - Quantity update
   - Remove items
   - Price calculations

5. **CheckoutPage** (`app/src/pages/CheckoutPage.tsx`)
   - Razorpay integration
   - Order summary
   - Customer details form

6. **AboutPage** (`app/src/pages/AboutPage.tsx`)
   - Company story
   - Team section
   - Mission/vision

7. **CommunityPage** (`app/src/pages/CommunityPage.tsx`)
   - Social media links
   - Free download terms
   - Review guidelines
   - Benefits section

8. **SupportPage** (`app/src/pages/SupportPage.tsx`)
   - FAQ accordion
   - Contact form
   - Help categories

9. **SignupPage** (`app/src/pages/SignupPage.tsx`)
   - User registration form
   - Validation

10. **Additional Pages**
    - LoginPage.tsx (redirects to WordPress)
    - AccountPage.tsx
    - AffiliatePage.tsx
    - BlogPage.tsx
    - CareersPage.tsx (replaced by Community)
    - ContactPage.tsx
    - FAQPage.tsx
    - PrivacyPolicyPage.tsx
    - RefundPolicyPage.tsx

#### Components
- **Header** - Navigation with search, cart icon, user menu
- **Footer** - Newsletter, links, social icons (Careers → Community updated)
- **CartDrawer** - Slide-out cart
- **CategorySidebar** - Mobile category navigation
- **YahaviAI** - AI assistant component

#### Features
- ✅ WordPress GraphQL integration for products
- ✅ Razorpay payment integration
- ✅ Cart functionality with context
- ✅ Responsive design
- ✅ Category filtering
- ✅ Search functionality
- ✅ Dark/Light mode (hack-black/hack-white theme)

---

### 🔄 Recent Changes (April 26, 2026)

#### Commit: e26d8bd
- **Footer Fix:** Changed "Careers" link to "Community"
- **Route Added:** `/community` route in App.tsx
- **Import Added:** CommunityPage import

#### Commit: c0be380
- Added deployment scripts (GCE)
- Added RefundPolicyPage
- UI improvements across multiple pages
- Added auto-deploy webhook

---

### 📁 Project Structure

```
Yahavi2022/
├── app/                          # React frontend
│   ├── src/
│   │   ├── components/           # Reusable components
│   │   ├── context/              # React contexts
│   │   ├── data/                 # Static data
│   │   ├── lib/                  # Utility functions
│   │   ├── pages/                # Page components
│   │   ├── sections/             # Page sections
│   │   ├── App.tsx               # Main app component
│   │   └── main.tsx              # Entry point
│   ├── public/                   # Static assets
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── gce/                          # GCE deployment files
│   ├── setup_gce.sh              # Server setup script
│   ├── nginx.conf                # Nginx configuration
│   ├── auto-deploy.sh            # Auto-deployment script
│   ├── deploy-webhook.js         # GitHub webhook handler
│   └── deploy-webhook.service    # Systemd service
├── HANDOVER/                     # AI handover docs (this folder)
├── DEPLOYMENT_GUIDE.md           # Deployment instructions
└── README.md
```

---

### 🔧 Technical Configuration

#### Environment Variables Required
```
VITE_WORDPRESS_URL=https://shop.hackknow.com/graphql
VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_RAZORPAY_KEY
```

#### Theme Colors (Tailwind)
- `hack-black` - Primary dark (#0a0a0a)
- `hack-white` - Primary light (#fafafa)
- `hack-yellow` - Accent (#FFD700)
- `hack-orange` - Secondary accent (#FF6B35)
- `hack-magenta` - Tertiary accent (#FF006E)

#### Fonts
- Display: `Mundare Beta` (custom font)
- Body: System font stack

---

### 🚀 Deployment Status

#### Local Build
- ✅ Builds successfully
- ✅ No TypeScript errors
- ✅ All routes working

#### GCE Deployment
- ⏳ Pending VM setup
- Scripts ready in `gce/` folder
- Auto-deploy configured

---

### 📝 Pending Tasks

#### High Priority
1. **GCE VM Setup**
   - Create e2-micro instance
   - Run setup_gce.sh
   - Configure SSL certificate

2. **DNS Configuration**
   - Point hackknow.com to GCE IP
   - Configure www subdomain

3. **WordPress Backend**
   - Ensure WPGraphQL plugin active
   - Verify CORS settings
   - Test product endpoint

#### Medium Priority
4. **Content Population**
   - Add real products to WordPress
   - Upload product images
   - Configure categories

5. **Razorpay Configuration**
   - Add live key to deployment
   - Configure webhooks
   - Test payment flow

6. **SEO & Analytics**
   - Add meta tags
   - Google Analytics
   - Search Console verification

#### Low Priority
7. **Performance Optimization**
   - Image optimization
   - Lazy loading
   - Service worker

8. **Additional Features**
   - User authentication (via WordPress)
   - Order history
   - Wishlist functionality

---

### 🐛 Known Issues

1. **None currently** - All pages building successfully

---

### 📚 Important Files Reference

| File | Purpose |
|------|---------|
| `app/src/App.tsx` | Route definitions |
| `app/src/context/StoreContext.tsx` | Cart state management |
| `app/src/lib/razorpay.ts` | Payment integration |
| `app/src/data/categories.ts` | Category definitions |
| `gce/setup_gce.sh` | Server deployment script |
| `gce/nginx.conf` | Web server config |

---

### 🎯 Next Steps for Continuing AI

1. **If setting up GCE:**
   - Get VM IP from user
   - Follow DEPLOYMENT_GUIDE.md
   - Run setup_gce.sh on server

2. **If adding features:**
   - Check this status first
   - Maintain existing code style
   - Update this document after changes

3. **If fixing bugs:**
   - Check related files in context/
   - Test on both mobile and desktop
   - Verify WordPress connection

---

### 🔐 Secrets & Environment

**DO NOT commit these to GitHub:**
- Razorpay live keys
- WordPress admin credentials
- GCE SSH keys
- Any .env files

**Store in:**
- GitHub Secrets (for Actions)
- Server environment variables
- Local .env (gitignored)

---

### 📞 Repository Info

- **GitHub:** https://github.com/Yahavi1212/Yahavi2022
- **Note:** Repository moved to https://github.com/gaganchauhan1997/Yahavi2022
- **Branch:** main
- **Build output:** `app/dist/`

---

### 🧪 Testing Checklist

Before deploying:
- [ ] `npm run build` succeeds
- [ ] All pages load without errors
- [ ] Cart functionality works
- [ ] Payment integration loads
- [ ] Mobile responsive check
- [ ] WordPress GraphQL endpoint responds

---

**Document Created By:** Cascade AI  
**Date:** April 26, 2026  
**Session Context:** Project conversion from React Gumroad clone to HackKnow branded marketplace with WordPress backend

---

## Quick Commands Reference

```bash
# Local development
cd app
npm install
npm run dev

# Production build
cd app
npm run build

# GCE SSH
gcloud compute ssh hackknow-vm --zone=us-central1-a
# OR
ssh username@VM_IP

# Deploy to GCE (on server)
cd /var/www/hackknow/repo
git pull origin main
cd app
npm ci
npm run build
cp -r dist/* /var/www/hackknow/dist/
sudo systemctl restart nginx
```


---

## April 27, 2026 Changelog Entry
- Synced against the current GitHub main repo and fixed the live working copy instead of the stale overview folder.
- Replaced the old login redirect with the React LoginPage route and added reusable auth helpers in app/src/lib/auth.ts.
- Protected account routes with AuthGuard and added working /account/:section navigation so wishlist and related account sections resolve correctly.
- Added missing routes for /contact, /affiliate, /blog, /faq, /privacy, /terms, and /refund-policy.
- Fixed shop search so header search now filters product results on ShopPage.
- Restored clean npm run lint and npm run build after removing lint-breaking effect/state patterns and typing the GraphQL product mapping.
- Cleaned visible currency and encoding drift in the touched checkout/cart utility text.

