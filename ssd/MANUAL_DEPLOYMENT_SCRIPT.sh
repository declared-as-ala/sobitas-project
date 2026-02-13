#!/bin/bash
# Manual deployment script for when CI/CD SSH fails
# Run this directly on your server: ssh root@145.223.118.9

set -e

echo "🚀 Starting Manual Deployment..."

# Navigate to project
cd /root/sobitas-project || { echo "❌ Directory not found!"; exit 1; }

# Pull latest code
echo "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main
git clean -fd

# Go to backend
cd backend || { echo "❌ Backend directory not found!"; exit 1; }

# Install Node.js if needed
if ! command -v npm &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
fi

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install --silent

# Compile assets
echo "🎨 Compiling assets (Tailwind CSS + Alpine.js)..."
npm run production

# Verify files
if [ -f "public/css/app.css" ] && [ -f "public/js/app.js" ]; then
    echo "✅ Assets compiled successfully!"
    echo "   CSS: $(du -h public/css/app.css | cut -f1)"
    echo "   JS: $(du -h public/js/app.js | cut -f1)"
else
    echo "❌ Asset files not found!"
    exit 1
fi

# Clear Laravel cache (try both backend containers)
echo "🧹 Clearing Laravel cache..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 php artisan view:clear || true
    docker compose exec -T backend-v2 php artisan cache:clear || true
    docker compose exec -T backend-v2 php artisan config:clear || true
    docker compose exec -T backend-v2 php artisan route:clear || true
    echo "✅ Cache cleared in backend-v2"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend php artisan view:clear || true
    docker compose exec -T backend php artisan cache:clear || true
    docker compose exec -T backend php artisan config:clear || true
    docker compose exec -T backend php artisan route:clear || true
    echo "✅ Cache cleared in backend"
else
    echo "⚠️ No backend container running, skipping cache clear"
fi

echo ""
echo "✅ Deployment Complete!"
echo "🌐 Visit: https://admin.protein.tn/admin"
echo "💡 Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
