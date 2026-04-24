#!/bin/bash
# HackKnow — Full GCE Deployment Script
# Run this on your Google Cloud Engine VM (Ubuntu 22.04+)
set -e

echo "======================================"
echo " HackKnow GCE Setup Script"
echo "======================================"

# ── 1. System update + install dependencies ──────────────────────────────────
echo "[1/6] Updating system and installing dependencies..."
sudo apt update -y
sudo apt install -y nginx nodejs npm git curl

# Install latest Node via nvm if node < 18
NODE_VER=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
if [ "$NODE_VER" -lt 18 ]; then
  echo "      Installing Node 20 via nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  nvm install 20 && nvm use 20
fi

# ── 2. Create web directory ───────────────────────────────────────────────────
echo "[2/6] Setting up web directory..."
sudo mkdir -p /var/www/hackknow/dist
sudo chown -R $USER:$USER /var/www/hackknow

# ── 3. Clone repo & build ─────────────────────────────────────────────────────
echo "[3/6] Cloning Yahavi2022 repo..."
cd /var/www/hackknow
git clone https://github.com/Yahavi1212/Yahavi2022.git repo
cd repo/app

echo "      Writing .env (keys stay on this VM only — not in git)..."
cat > .env << ENVEOF
VITE_WORDPRESS_URL=https://shop.hackknow.com/graphql
VITE_RAZORPAY_KEY_ID=${RAZORPAY_KEY}
ENVEOF

echo "      Installing npm packages..."
npm install

echo "      Building production bundle..."
npm run build

echo "      Copying dist to web root..."
cp -r dist/* /var/www/hackknow/dist/

# Remove .env immediately after build (key is now baked into bundle)
rm -f .env
echo "      .env removed from VM after build ✓"

# ── 4. Configure Nginx ────────────────────────────────────────────────────────
echo "[4/6] Configuring Nginx..."
sudo cp /var/www/hackknow/repo/gce/nginx.conf /etc/nginx/sites-available/hackknow
sudo ln -sf /etc/nginx/sites-available/hackknow /etc/nginx/sites-enabled/hackknow
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# ── 5. Firewall ────────────────────────────────────────────────────────────────
echo "[5/6] Opening firewall ports..."
sudo ufw allow 'Nginx Full' 2>/dev/null || true
sudo ufw allow 22 2>/dev/null || true

# ── 6. SSL (Certbot) ──────────────────────────────────────────────────────────
echo "[6/6] Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

echo ""
echo "======================================"
echo " SETUP COMPLETE"
echo "======================================"
echo ""
echo " Nginx is running. Now run SSL:"
echo "   sudo certbot --nginx -d hackknow.com -d www.hackknow.com"
echo ""
echo " Site will be live at: https://hackknow.com"
echo "======================================"
