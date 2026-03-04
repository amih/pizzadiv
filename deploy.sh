#!/bin/bash
set -eu

SERVER="ubuntu@verarta.com"
REMOTE_DIR="/var/www/pizzadiv.amiheines.com"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Deploying pizza-math to pizzadiv.amiheines.com..."

# Ensure remote dirs exist
ssh "$SERVER" "mkdir -p /tmp/pizza-math-deploy/assets"

# Upload files
scp "$LOCAL_DIR"/*.html "$LOCAL_DIR"/*.css "$LOCAL_DIR"/*.js "$LOCAL_DIR"/*.json "$SERVER:/tmp/pizza-math-deploy/"
scp "$LOCAL_DIR"/assets/*.png "$LOCAL_DIR"/assets/*.svg "$SERVER:/tmp/pizza-math-deploy/assets/" 2>/dev/null || true

# Copy to web root and set permissions
ssh "$SERVER" "sudo mkdir -p $REMOTE_DIR/assets && sudo cp /tmp/pizza-math-deploy/*.html /tmp/pizza-math-deploy/*.css /tmp/pizza-math-deploy/*.js /tmp/pizza-math-deploy/*.json $REMOTE_DIR/ && sudo cp /tmp/pizza-math-deploy/assets/* $REMOTE_DIR/assets/ 2>/dev/null; sudo chown -R www-data:www-data $REMOTE_DIR/"

echo "Deployed! https://pizzadiv.amiheines.com"
