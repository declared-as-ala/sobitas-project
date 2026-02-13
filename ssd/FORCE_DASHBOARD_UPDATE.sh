#!/bin/bash
set -e

echo "=== FORCING DASHBOARD UPDATE ==="

# Navigate to project directory
cd /root/sobitas-project || { echo "Directory not found!"; exit 1; }

# Pull latest code
echo "1. Pulling latest code..."
git fetch origin main
git reset --hard origin/main
git clean -fd

# Navigate to backend
cd backend || { echo "Backend directory not found!"; exit 1; }

# Clear ALL Laravel caches
echo "2. Clearing ALL Laravel caches..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 php artisan cache:clear
    docker compose exec -T backend-v2 php artisan config:clear
    docker compose exec -T backend-v2 php artisan route:clear
    docker compose exec -T backend-v2 php artisan view:clear
    docker compose exec -T backend-v2 php artisan optimize:clear
    echo "✓ Caches cleared in backend-v2"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend php artisan cache:clear
    docker compose exec -T backend php artisan config:clear
    docker compose exec -T backend php artisan route:clear
    docker compose exec -T backend php artisan view:clear
    docker compose exec -T backend php artisan optimize:clear
    echo "✓ Caches cleared in backend"
else
    php artisan cache:clear
    php artisan config:clear
    php artisan route:clear
    php artisan view:clear
    php artisan optimize:clear
    echo "✓ Caches cleared on host"
fi

# Rebuild route cache
echo "3. Rebuilding route cache..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 php artisan route:cache
    docker compose exec -T backend-v2 php artisan config:cache
    docker compose exec -T backend-v2 php artisan view:cache
    echo "✓ Route cache rebuilt in backend-v2"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend php artisan route:cache
    docker compose exec -T backend php artisan config:cache
    docker compose exec -T backend php artisan view:cache
    echo "✓ Route cache rebuilt in backend"
else
    php artisan route:cache
    php artisan config:cache
    php artisan view:cache
    echo "✓ Route cache rebuilt on host"
fi

# Compile assets
echo "4. Compiling assets..."
if ! command -v npm &> /dev/null; then
    echo "⚠️ npm not found. Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || { echo "❌ Failed to setup Node.js repository"; exit 1; }
    apt-get install -y nodejs || { echo "❌ Failed to install Node.js"; exit 1; }
    echo "✓ Node.js installed"
fi

npm install --silent || { echo "⚠️ npm install had issues, but continuing..."; }
npm run production || { echo "❌ Asset compilation failed!"; exit 1; }
echo "✓ Assets compiled"

# Fix storage permissions
echo "5. Fixing storage permissions..."
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

# Restart container to ensure everything is fresh
echo "6. Restarting backend container..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose restart backend-v2 || true
    echo "✓ Backend-v2 restarted"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose restart backend || true
    echo "✓ Backend restarted"
fi

echo ""
echo "=== DASHBOARD UPDATE COMPLETE ==="
echo "✅ All caches cleared"
echo "✅ Routes rebuilt"
echo "✅ Assets compiled"
echo "✅ Permissions fixed"
echo "✅ Container restarted"
echo ""
echo "Now visit: https://admin.sobitas.tn/admin"
echo "If you still see the old dashboard, do a HARD REFRESH: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
