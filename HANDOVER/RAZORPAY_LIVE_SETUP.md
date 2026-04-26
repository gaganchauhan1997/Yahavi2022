# Razorpay LIVE Keys Setup Guide

## ⚠️ SECURITY WARNING
These are **LIVE** production keys. Never commit to GitHub!

## 🔑 Keys Provided:
- **Key ID:** `rzp_live_SiBAFRRkdav8jY` (Public - Frontend use)
- **Key Secret:** `fnMOjpLSEQf4dtr076s0XrLS` (Private - Backend/VM only)

---

## Step 1: Frontend Configuration (Already Done)

File: `app/.env`
```env
VITE_RAZORPAY_KEY_ID=rzp_live_SiBAFRRkdav8jY
```

✅ **Key ID** is safe for frontend (it's public)

---

## Step 2: VM Environment Variables (CRITICAL)

### SSH into VM:
```bash
gcloud compute ssh hackknow-vm --zone=us-central1-a
```

### Add Secret Key to VM:
```bash
# Edit environment file
sudo nano /etc/environment

# Add these lines:
RAZORPAY_KEY_ID=rzp_live_SiBAFRRkdav8jY
RAZORPAY_KEY_SECRET=fnMOjpLSEQf4dtr076s0XrLS

# Save and exit (Ctrl+O, Enter, Ctrl+X)
```

### For PM2 (Node.js process manager):
```bash
# Set environment variables for PM2
pm2 set env RAZORPAY_KEY_ID rzp_live_SiBAFRRkdav8jY
pm2 set env RAZORPAY_KEY_SECRET fnMOjpLSEQf4dtr076s0XrLS

# Restart app
pm2 restart all
```

---

## Step 3: Razorpay Dashboard Configuration

1. Login to Razorpay Dashboard: https://dashboard.razorpay.com
2. Go to Settings → API Keys
3. Verify **Key ID**: `rzp_live_SiBAFRRkdav8jY` is active
4. Check "Hackknow" business name is showing

---

## Step 4: Test Payment

1. Visit: https://hackknow.com/shop
2. Add product to cart
3. Click checkout
4. Razorpay modal should open showing:
   - **Business Name:** "Hackknow"
   - **Description:** "Digital Products Marketplace"
   - **Logo:** (Add logo URL in razorpay.ts if needed)

---

## 🔒 Security Checklist

- [ ] Key Secret NEVER in frontend code
- [ ] Key Secret ONLY in VM environment variables
- [ ] Key Secret NOT in Git/GitHub
- [ ] Key Secret NOT in browser console/network tab

---

## 🚨 Emergency: If Keys Leaked

1. Immediately regenerate keys from Razorpay Dashboard
2. Update VM environment variables
3. Restart services
4. Contact Razorpay support

---

## 📞 Support

Razorpay Team will see:
- **Business:** Hackknow
- **Domain:** hackknow.com
- **Key ID:** rzp_live_SiBAFRRkdav8jY
