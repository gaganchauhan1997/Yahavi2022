#!/bin/bash
# Auto-deploy script for HackKnow
# Pulls latest code, rebuilds, and deploys
# Usage: ./auto-deploy.sh [branch-name]

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[DEPLOY]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

REPO_DIR="/var/www/hackknow/repo"
DEPLOY_DIR="/var/www/hackknow/dist"
BRANCH="${1:-main}"
LOCK_FILE="/tmp/hackknow-deploy.lock"

cleanup() {
    rm -f "$LOCK_FILE"
}
trap cleanup EXIT

# Check if another deployment is running
if [ -f "$LOCK_FILE" ]; then
    warn "Another deployment is already in progress"
    exit 1
fi

touch "$LOCK_FILE"

log "Starting deployment at $(date)"
log "Branch: $BRANCH"

# Check if repo exists
if [ ! -d "$REPO_DIR/.git" ]; then
    error "Repository not found at $REPO_DIR"
    exit 1
fi

cd "$REPO_DIR"

# Reject dirty working tree — avoid silent stash
if [ -n "$(git status --porcelain)" ]; then
    error "Dirty working tree — aborting. Clean manually."
    exit 1
fi

# Fetch latest with prune
log "Fetching origin..."
git fetch --prune origin

# Hard-reset to target branch
git checkout "$BRANCH" || { error "Failed to checkout $BRANCH"; exit 1; }
git reset --hard "origin/$BRANCH"

# Get latest commit info
COMMIT=$(git log -1 --pretty=format:"%h - %s (%ci)")
success "Latest commit: $COMMIT"

# Install dependencies
log "Installing dependencies..."
cd "$REPO_DIR/app"
npm ci || npm install || warn "npm install had issues, continuing..."

# Build
log "Building application..."
npm run build || error "Build failed"

# Check if dist exists
if [ ! -d "$REPO_DIR/app/dist" ]; then
    error "Build output not found at $REPO_DIR/app/dist"
    exit 1
fi

# Backup current deployment
if [ -d "$DEPLOY_DIR" ]; then
    BACKUP_DIR="/var/www/hackknow/dist-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
    log "Backup created: $BACKUP_DIR"
fi

# Deploy new build
log "Deploying new build..."
rm -rf "$DEPLOY_DIR"/*
cp -r "$REPO_DIR/app/dist"/* "$DEPLOY_DIR/"

# Set permissions
chown -R www-data:www-data "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR"

# Reload nginx
log "Reloading Nginx..."
systemctl reload nginx || warn "Nginx reload had issues"

success "Deployment completed successfully!"
success "Deployed at: $(date)"
success "Commit: $COMMIT"

# Cleanup old backups (keep last 5)
ls -t /var/www/hackknow/dist-backup-* 2>/dev/null | tail -n +6 | xargs -r rm -rf

log "Deployment finished at $(date)"
