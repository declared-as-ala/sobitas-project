#!/bin/bash
set -e

echo "=== FIXING DASHBOARD AND PERMISSIONS ==="

# Navigate to project
cd /root/sobitas-project || { echo "Directory not found!"; exit 1; }

# Pull latest code
echo "1. Pulling latest code..."
git pull origin main

# Navigate to backend
cd backend || { echo "Backend directory not found!"; exit 1; }

# Fix storage permissions (CRITICAL!)
echo "2. Fixing storage permissions..."
if docker ps | grep -q "sobitas-backend-v2"; then
    echo "Fixing permissions in backend-v2 container..."
    docker compose exec -T backend-v2 chown -R www-data:www-data storage bootstrap/cache || true
    docker compose exec -T backend-v2 chmod -R 775 storage bootstrap/cache || true
    docker compose exec -T backend-v2 touch storage/logs/laravel.log 2>/dev/null || true
    docker compose exec -T backend-v2 chmod 664 storage/logs/laravel.log 2>/dev/null || true
    docker compose exec -T backend-v2 chown www-data:www-data storage/logs/laravel.log 2>/dev/null || true
    echo "✓ Permissions fixed"
elif docker ps | grep -q "sobitas-backend"; then
    echo "Fixing permissions in backend container..."
    docker compose exec -T backend chown -R www-data:www-data storage bootstrap/cache || true
    docker compose exec -T backend chmod -R 775 storage bootstrap/cache || true
    docker compose exec -T backend touch storage/logs/laravel.log 2>/dev/null || true
    docker compose exec -T backend chmod 664 storage/logs/laravel.log 2>/dev/null || true
    docker compose exec -T backend chown www-data:www-data storage/logs/laravel.log 2>/dev/null || true
    echo "✓ Permissions fixed"
else
    echo "⚠️ No backend container running, fixing on host..."
    chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || chown -R $(whoami):$(whoami) storage bootstrap/cache || true
    chmod -R 775 storage bootstrap/cache || true
    touch storage/logs/laravel.log 2>/dev/null || true
    chmod 664 storage/logs/laravel.log 2>/dev/null || true
fi

# Clear ALL caches
echo "3. Clearing ALL caches..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 php artisan optimize:clear || true
    docker compose exec -T backend-v2 php artisan route:clear || true
    docker compose exec -T backend-v2 php artisan config:clear || true
    docker compose exec -T backend-v2 php artisan view:clear || true
    docker compose exec -T backend-v2 php artisan cache:clear || true
    echo "✓ Caches cleared"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend php artisan optimize:clear || true
    docker compose exec -T backend php artisan route:clear || true
    docker compose exec -T backend php artisan config:clear || true
    docker compose exec -T backend php artisan view:clear || true
    docker compose exec -T backend php artisan cache:clear || true
    echo "✓ Caches cleared"
fi

# Rebuild route cache (CRITICAL for route fix!)
echo "4. Rebuilding route cache..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 php artisan route:cache || true
    docker compose exec -T backend-v2 php artisan config:cache || true
    echo "✓ Route cache rebuilt"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend php artisan route:cache || true
    docker compose exec -T backend php artisan config:cache || true
    echo "✓ Route cache rebuilt"
fi

# Verify route exists
echo "5. Verifying route registration..."
if docker ps | grep -q "sobitas-backend-v2"; then
    echo "Checking for dashboard route..."
    docker compose exec -T backend-v2 php artisan route:list | grep -E "(dashboard|admin/)" | head -5
elif docker ps | grep -q "sobitas-backend"; then
    echo "Checking for dashboard route..."
    docker compose exec -T backend php artisan route:list | grep -E "(dashboard|admin/)" | head -5
fi

# Restart container
echo "6. Restarting container..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose restart backend-v2 || true
    echo "✓ Container restarted"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose restart backend || true
    echo "✓ Container restarted"
fi

echo ""
echo "=== FIX COMPLETE ==="
echo "✅ Permissions fixed"
echo "✅ Caches cleared"
echo "✅ Route cache rebuilt"
echo "✅ Container restarted"
echo ""
echo "Now visit: https://admin.sobitas.tn/admin"
echo "Hard refresh: Ctrl+Shift+R"
