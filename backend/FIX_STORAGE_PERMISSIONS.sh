#!/bin/bash
set -e

echo "=== Fixing Laravel Storage Permissions ==="

# Navigate to backend directory
cd /root/sobitas-project/backend || { echo "Backend directory not found!"; exit 1; }

# Set proper permissions for storage and bootstrap/cache
echo "Setting permissions for storage directory..."
chmod -R 775 storage
chmod -R 775 bootstrap/cache

# Set ownership (adjust user/group as needed - typically www-data or the container user)
# For Docker, we need to set permissions inside the container
echo "Fixing permissions inside Docker container..."

# Try backend-v2 first, then fallback to backend
if docker ps | grep -q "sobitas-backend-v2"; then
    echo "Fixing permissions in backend-v2 container..."
    docker compose exec -T backend-v2 chown -R www-data:www-data storage bootstrap/cache || true
    docker compose exec -T backend-v2 chmod -R 775 storage bootstrap/cache || true
    echo "✓ Permissions fixed in backend-v2"
elif docker ps | grep -q "sobitas-backend"; then
    echo "Fixing permissions in backend container..."
    docker compose exec -T backend chown -R www-data:www-data storage bootstrap/cache || true
    docker compose exec -T backend chmod -R 775 storage bootstrap/cache || true
    echo "✓ Permissions fixed in backend"
else
    echo "⚠️ No backend container running, fixing on host..."
    chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || chown -R $(whoami):$(whoami) storage bootstrap/cache || true
    chmod -R 775 storage bootstrap/cache || true
fi

# Ensure log file exists and is writable
echo "Ensuring log file is writable..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 touch storage/logs/laravel.log 2>/dev/null || true
    docker compose exec -T backend-v2 chmod 664 storage/logs/laravel.log 2>/dev/null || true
    docker compose exec -T backend-v2 chown www-data:www-data storage/logs/laravel.log 2>/dev/null || true
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend touch storage/logs/laravel.log 2>/dev/null || true
    docker compose exec -T backend chmod 664 storage/logs/laravel.log 2>/dev/null || true
    docker compose exec -T backend chown www-data:www-data storage/logs/laravel.log 2>/dev/null || true
else
    touch storage/logs/laravel.log 2>/dev/null || true
    chmod 664 storage/logs/laravel.log 2>/dev/null || true
fi

echo "=== Storage Permissions Fixed ==="
echo "✅ Done! The dashboard should now work properly."
