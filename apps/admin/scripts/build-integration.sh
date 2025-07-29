#!/bin/bash

# FormX Admin - Integration Build Script
# This script builds the admin app for integration environment

set -e

echo "🚀 Starting FormX Admin Integration Build..."

# Change to admin directory
cd "$(dirname "$0")/.."

# Copy integration environment file
if [ -f ".env.integration" ]; then
    cp .env.integration .env.local
    echo "✅ Environment configuration loaded"
else
    echo "❌ .env.integration file not found"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
cd ../../
npx prisma generate
cd apps/admin

# Run linting and type checking
echo "🔍 Running linting and type checking..."
pnpm run lint
echo "✅ Linting passed"

# Build the application
echo "🏗️  Building application..."
pnpm run build

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p ./dist
cp -r ./.next/standalone ./dist/
cp -r ./.next/static ./dist/.next/
cp -r ./public ./dist/

# Copy necessary files
cp package.json ./dist/
cp next.config.mjs ./dist/
cp .env.integration ./dist/.env.local

echo "✅ Integration build completed successfully!"
echo "📁 Build artifacts are in ./dist/"
echo ""
echo "Next steps:"
echo "1. Test the build locally with: cd dist && node server.js"
echo "2. Deploy to integration environment"