#!/bin/bash

# FormX Admin - Package for Deployment Script
# This script creates a deployment-ready package

set -e

echo "📦 Creating FormX Admin Deployment Package..."

# Create package directory
PACKAGE_DIR="formx-admin-deployment"
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# Copy essential files
echo "📄 Copying application files..."
cp -r .next $PACKAGE_DIR/
cp -r public $PACKAGE_DIR/
cp package.json $PACKAGE_DIR/
cp pnpm-lock.yaml $PACKAGE_DIR/
cp next.config.mjs $PACKAGE_DIR/
cp -r lib $PACKAGE_DIR/
cp .env.integration.template $PACKAGE_DIR/

# Copy deployment files
echo "📋 Copying deployment configuration..."
cp Dockerfile $PACKAGE_DIR/
cp docker-compose.integration.yml $PACKAGE_DIR/
cp DEPLOYMENT_GUIDE.md $PACKAGE_DIR/
cp -r scripts $PACKAGE_DIR/

# Copy database schema
echo "🗄️  Copying database schema..."
mkdir -p $PACKAGE_DIR/prisma
cp ../../prisma/schema.prisma $PACKAGE_DIR/prisma/

# Create standalone server file
echo "🚀 Creating server configuration..."
cat > $PACKAGE_DIR/server.js << 'EOF'
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = process.env.PORT || 4000
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
EOF

# Create PM2 ecosystem file
echo "⚙️  Creating PM2 configuration..."
cat > $PACKAGE_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'formx-admin',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Create setup script
echo "🔧 Creating setup script..."
cat > $PACKAGE_DIR/setup.sh << 'EOF'
#!/bin/bash

echo "🚀 FormX Admin Setup"
echo "==================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env from template..."
    cp .env.integration.template .env
    echo "⚠️  Please edit .env with your configuration values"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your configuration"
echo "2. Run database migrations from the main workspace"
echo "3. Start the application:"
echo "   - With PM2: pm2 start ecosystem.config.js"
echo "   - With Node: node server.js"
echo "   - With Docker: docker-compose -f docker-compose.integration.yml up"
EOF
chmod +x $PACKAGE_DIR/setup.sh

# Create README
echo "📚 Creating README..."
cat > $PACKAGE_DIR/README.md << 'EOF'
# FormX Admin - Integration Deployment

This package contains the FormX Admin application ready for deployment.

## Quick Start

1. Run the setup script:
   ```bash
   ./setup.sh
   ```

2. Configure your environment:
   ```bash
   cp .env.integration.template .env
   # Edit .env with your values
   ```

3. Start the application:
   ```bash
   # Option 1: Using PM2
   pm2 start ecosystem.config.js

   # Option 2: Using Node.js
   node server.js

   # Option 3: Using Docker
   docker-compose -f docker-compose.integration.yml up -d
   ```

## Files Included

- `.next/` - Built Next.js application
- `public/` - Static assets
- `lib/` - Shared libraries
- `prisma/` - Database schema
- `scripts/` - Utility scripts
- `server.js` - Node.js server
- `ecosystem.config.js` - PM2 configuration
- `docker-compose.integration.yml` - Docker setup
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions

## Support

See DEPLOYMENT_GUIDE.md for detailed instructions and troubleshooting.
EOF

# Create archive
echo "🗜️  Creating deployment archive..."
tar -czf formx-admin-integration.tar.gz $PACKAGE_DIR

echo "✅ Deployment package created successfully!"
echo ""
echo "📦 Package location: formx-admin-integration.tar.gz"
echo "📁 Extracted directory: $PACKAGE_DIR/"
echo ""
echo "To deploy:"
echo "1. Copy formx-admin-integration.tar.gz to your server"
echo "2. Extract: tar -xzf formx-admin-integration.tar.gz"
echo "3. Follow instructions in $PACKAGE_DIR/README.md"