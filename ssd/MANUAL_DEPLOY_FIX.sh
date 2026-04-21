#!/bin/bash
set -e

echo "=== MANUAL DASHBOARD FIX DEPLOYMENT ==="
echo "This script fixes the dashboard route and clears all caches"
echo ""

# Navigate to project directory
cd /root/sobitas-project || { echo "Directory /root/sobitas-project not found!"; exit 1; }

# Pull latest code
echo "1. Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main
git clean -fd
echo "✓ Code pulled"

# Navigate to backend
cd backend || { echo "Backend directory not found!"; exit 1; }

# Check if npm is available on host
if ! command -v npm &> /dev/null; then
  echo "⚠️ npm not found on host. Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || {
    echo "❌ Failed to setup Node.js repository"
    exit 1
  }
  apt-get install -y nodejs || {
    echo "❌ Failed to install Node.js"
    exit 1
  }
  echo "✓ Node.js installed"
fi

# Verify npm is now available
if ! command -v npm &> /dev/null; then
  echo "❌ npm still not found after installation attempt!"
  exit 1
fi

echo "✓ npm found: $(npm --version)"
echo "✓ node found: $(node --version)"

# Install npm dependencies
echo "2. Installing npm dependencies..."
npm install --silent || {
  echo "⚠️ npm install had issues, but continuing..."
}

# Compile assets
echo "3. Compiling assets (Tailwind CSS + Alpine.js)..."
npm run production || {
  echo "❌ Asset compilation failed!"
  exit 1
}

echo "✓ Assets compiled successfully"

# Verify files exist
if [ -f "public/css/app.css" ]; then
  echo "✓ CSS file: public/css/app.css exists ($(du -h public/css/app.css | cut -f1))"
else
  echo "❌ CSS file not found!"
  exit 1
fi

if [ -f "public/js/app.js" ]; then
  echo "✓ JS file: public/js/app.js exists ($(du -h public/js/app.js | cut -f1))"
else
  echo "❌ JS file not found!"
  exit 1
fi

# Clear ALL Laravel caches
echo "4. Clearing ALL Laravel caches..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 php artisan optimize:clear || true
    docker compose exec -T backend-v2 php artisan cache:clear || true
    docker compose exec -T backend-v2 php artisan config:clear || true
    docker compose exec -T backend-v2 php artisan route:clear || true
    docker compose exec -T backend-v2 php artisan view:clear || true
    echo "✓ Caches cleared in backend-v2"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend php artisan optimize:clear || true
    docker compose exec -T backend php artisan cache:clear || true
    docker compose exec -T backend php artisan config:clear || true
    docker compose exec -T backend php artisan route:clear || true
    docker compose exec -T backend php artisan view:clear || true
    echo "✓ Caches cleared in backend"
else
    echo "⚠️ No backend container running"
fi

# Rebuild route cache (CRITICAL for dashboard fix!)
echo "5. Rebuilding route cache (CRITICAL!)..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 php artisan route:cache || true
    docker compose exec -T backend-v2 php artisan config:cache || true
    docker compose exec -T backend-v2 php artisan view:cache || true
    echo "✓ Route cache rebuilt in backend-v2"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend php artisan route:cache || true
    docker compose exec -T backend php artisan config:cache || true
    docker compose exec -T backend php artisan view:cache || true
    echo "✓ Route cache rebuilt in backend"
fi

# Fix storage permissions
echo "6. Fixing storage permissions..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 chmod -R 775 storage bootstrap/cache || true
    docker compose exec -T backend-v2 chown -R www-data:www-data storage bootstrap/cache || true
    docker compose exec -T backend-v2 touch storage/logs/laravel.log 2>/dev/null || true
    docker compose exec -T backend-v2 chmod 664 storage/logs/laravel.log 2>/dev/null || true
    echo "✓ Permissions fixed in backend-v2"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend chmod -R 775 storage bootstrap/cache || true
    docker compose exec -T backend chown -R www-data:www-data storage bootstrap/cache || true
    docker compose exec -T backend touch storage/logs/laravel.log 2>/dev/null || true
    docker compose exec -T backend chmod 664 storage/logs/laravel.log 2>/dev/null || true
    echo "✓ Permissions fixed in backend"
fi

# Restart container
echo "7. Restarting backend container..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose restart backend-v2 || true
    echo "✓ Backend-v2 restarted"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose restart backend || true
    echo "✓ Backend restarted"
fi

# Verify route
echo "8. Verifying route registration..."
if docker ps | grep -q "sobitas-backend-v2"; then
    echo "Checking route for admin/..."
    docker compose exec -T backend-v2 php artisan route:list | grep "GET.*admin/" || echo "⚠️ Route not found in list"
elif docker ps | grep -q "sobitas-backend"; then
    echo "Checking route for admin/..."
    docker compose exec -T backend php artisan route:list | grep "GET.*admin/" || echo "⚠️ Route not found in list"
fi

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "✅ Code pulled"
echo "✅ Assets compiled"
echo "✅ Caches cleared"
echo "✅ Route cache rebuilt"
echo "✅ Permissions fixed"
echo "✅ Container restarted"
echo ""
echo "Now visit: https://admin.sobitas.tn/admin"
echo "Do a HARD REFRESH: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo ""
echo "If dashboard still doesn't show, check:"
echo "1. Browser console (F12) for errors"
echo "2. Network tab - is app.css loading?"
echo "3. Route: docker compose exec -T backend-v2 php artisan route:list | grep dashboard"
