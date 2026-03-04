#!/usr/bin/env bash
set -euo pipefail

SERVER="ubuntu@verarta.com"
REMOTE_DIR="/var/www/pizzadiv.amiheines.com"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Deploying pizza-math to pizzadiv.amiheines.com..."

# Upload files
scp "$LOCAL_DIR"/*.html "$LOCAL_DIR"/*.css "$LOCAL_DIR"/*.js "$LOCAL_DIR"/*.json "$SERVER:/tmp/pizza-math-deploy/"

# Copy to web root and set permissions
ssh "$SERVER" "sudo cp /tmp/pizza-math-deploy/* $REMOTE_DIR/ && sudo chown -R www-data:www-data $REMOTE_DIR/"

echo "Deployed! https://pizzadiv.amiheines.com"
