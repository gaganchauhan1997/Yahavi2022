#!/bin/bash
# GCE Ubuntu Deployment Script for HackKnow

# 1. Update system and install Nginx
sudo apt update
sudo apt install -y nginx

# 2. Create directory for the app
sudo mkdir -p /var/www/hackknow
sudo chown -R $USER:$USER /var/www/hackknow

# 3. Copy Nginx config
sudo cp nginx.conf /etc/nginx/sites-available/hackknow
sudo ln -s /etc/nginx/sites-available/hackknow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# 4. Test and restart Nginx
sudo nginx -t && sudo systemctl restart nginx

echo "Deployment environment ready. Upload the contents of your local 'dist' folder to /var/www/hackknow/dist using SCP or SFTP."
