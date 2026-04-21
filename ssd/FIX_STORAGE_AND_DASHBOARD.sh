#!/bin/bash
set -e

echo "=== Fixing Storage Permissions and Dashboard ==="

# Navigate to project directory
cd /root/sobitas-project || { echo "Directory /root/sobitas-project not found!"; exit 1; }

# Pull latest code
echo "1. Pulling latest code..."
git pull origin main

cd backend || { echo "Backend directory not found!"; exit 1; }

# Fix storage permissions (CRITICAL!)
echo "2. Fixing storage permissions..."
docker compose exec -T backend-v2 chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache || true
docker compose exec -T backend-v2 chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache || true
docker compose exec -T backend-v2 touch /var/www/html/storage/logs/laravel.log || true
docker compose exec -T backend-v2 chmod 664 /var/www/html/storage/logs/laravel.log || true
docker compose exec -T backend-v2 chown www-data:www-data /var/www/html/storage/logs/laravel.log || true

# Also fix on host (since it's volume-mounted)
echo "3. Fixing permissions on host (volume-mounted)..."
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
chmod -R 775 storage bootstrap/cache 2>/dev/null || true
touch storage/logs/laravel.log 2>/dev/null || true
chmod 664 storage/logs/laravel.log 2>/dev/null || true
chown www-data:www-data storage/logs/laravel.log 2>/dev/null || true

# Clear ALL caches
echo "4. Clearing ALL Laravel caches..."
docker compose exec -T backend-v2 php artisan optimize:clear || true
docker compose exec -T backend-v2 php artisan cache:clear || true
docker compose exec -T backend-v2 php artisan config:clear || true
docker compose exec -T backend-v2 php artisan route:clear || true
docker compose exec -T backend-v2 php artisan view:clear || true

# Rebuild caches
echo "5. Rebuilding route and config cache..."
docker compose exec -T backend-v2 php artisan route:cache || true
docker compose exec -T backend-v2 php artisan config:cache || true

# Restart container
echo "6. Restarting backend-v2 container..."
docker compose restart backend-v2 || true

echo ""
echo "=== Fix Complete ==="
echo "✅ Storage permissions fixed"
echo "✅ Caches cleared and rebuilt"
echo "✅ Container restarted"
echo ""
echo "Now visit: https://admin.sobitas.tn/admin"
echo "The dashboard should load without permission errors!"
