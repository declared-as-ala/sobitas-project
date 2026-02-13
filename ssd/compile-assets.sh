#!/bin/bash
# Quick script to compile assets for modern dashboard

set -e

echo "🚀 Compiling Modern Dashboard Assets..."

# Navigate to backend directory
cd "$(dirname "$0")" || exit 1

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Compile assets
echo "🎨 Compiling Tailwind CSS and Alpine.js..."
npm run production

# Verify files
if [ -f "public/css/app.css" ]; then
    echo "✅ CSS compiled: public/css/app.css ($(du -h public/css/app.css | cut -f1))"
else
    echo "❌ CSS file not found!"
    exit 1
fi

if [ -f "public/js/app.js" ]; then
    echo "✅ JS compiled: public/js/app.js ($(du -h public/js/app.js | cut -f1))"
else
    echo "❌ JS file not found!"
    exit 1
fi

echo ""
echo "✅ Assets compiled successfully!"
echo "🌐 Visit https://admin.sobitas.tn/admin to see the modern dashboard"
