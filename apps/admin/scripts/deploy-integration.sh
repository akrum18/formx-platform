#!/bin/bash

# FormX Admin - Integration Deployment Script
# This script deploys the admin app to integration environment

set -e

echo "🚀 Starting FormX Admin Integration Deployment..."

# Configuration
DEPLOY_HOST="integration.formx.com"
DEPLOY_USER="formx-deploy"
DEPLOY_PATH="/var/www/formx-admin"
SERVICE_NAME="formx-admin"

# Build first
echo "🏗️  Building application..."
./scripts/build-integration.sh

# Create deployment archive
echo "📦 Creating deployment archive..."
cd dist
tar -czf ../formx-admin-integration.tar.gz .
cd ..

# Deploy to server
echo "🚀 Deploying to integration server..."
if command -v scp &> /dev/null && command -v ssh &> /dev/null; then
    # Upload archive
    scp formx-admin-integration.tar.gz ${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/
    
    # Deploy on server
    ssh ${DEPLOY_USER}@${DEPLOY_HOST} << 'EOF'
        # Stop service
        sudo systemctl stop formx-admin || true
        
        # Create backup
        sudo cp -r /var/www/formx-admin /var/www/formx-admin.backup.$(date +%Y%m%d-%H%M%S) || true
        
        # Extract new version
        sudo rm -rf /var/www/formx-admin
        sudo mkdir -p /var/www/formx-admin
        sudo tar -xzf /tmp/formx-admin-integration.tar.gz -C /var/www/formx-admin
        sudo chown -R formx-deploy:formx-deploy /var/www/formx-admin
        
        # Install dependencies
        cd /var/www/formx-admin
        npm install --production
        
        # Start service
        sudo systemctl start formx-admin
        sudo systemctl enable formx-admin
        
        # Clean up
        rm /tmp/formx-admin-integration.tar.gz
EOF
    
    echo "✅ Deployment completed successfully!"
    echo "🌐 Admin interface available at: https://admin-integration.formx.com"
else
    echo "❌ SSH/SCP not available. Manual deployment required:"
    echo "1. Upload formx-admin-integration.tar.gz to your server"
    echo "2. Extract to your web server directory"
    echo "3. Install dependencies: npm install --production"
    echo "4. Start the application: node server.js"
fi

# Clean up local files
rm -f formx-admin-integration.tar.gz
rm -rf dist