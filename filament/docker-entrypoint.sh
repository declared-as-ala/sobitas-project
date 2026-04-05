#!/bin/sh
set -e

cd /var/www/html

echo "========================================"
echo " Laravel Filament entrypoint starting..."
echo "========================================"

# Ensure .env exists
if [ ! -f .env ]; then
  touch .env
  [ -n "$APP_KEY" ] && echo "APP_KEY=$APP_KEY" >> .env
  [ -n "$APP_ENV" ] && echo "APP_ENV=$APP_ENV" >> .env
  [ -n "$APP_DEBUG" ] && echo "APP_DEBUG=$APP_DEBUG" >> .env
  [ -n "$APP_URL" ] && echo "APP_URL=$APP_URL" >> .env
fi

# Generate APP_KEY if missing
if [ -z "$APP_KEY" ] || ! grep -q 'APP_KEY=base64:' .env 2>/dev/null; then
  php artisan key:generate --force 2>/dev/null || true
fi

# Ensure runtime directories exist
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/testing
mkdir -p storage/framework/views
mkdir -p storage/logs
mkdir -p bootstrap/cache
mkdir -p storage/app/public

# Permissions
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

# Create storage symlink if missing
if [ ! -L public/storage ] || [ ! -e public/storage ]; then
  echo "Creating storage symlink..."
  php artisan storage:link 2>/dev/null || {
    rm -f public/storage
    ln -s ../storage/app/public public/storage
    echo "✓ Storage symlink created manually"
  }
else
  echo "✓ Storage symlink already exists"
fi

# Wait for DB and run migrations
echo "Running migrations..."
migrate_attempt=1
migrate_max=10

while [ "$migrate_attempt" -le "$migrate_max" ]; do
  if php artisan migrate --force >/dev/null 2>&1; then
    echo "✓ Migrations completed"
    break
  fi

  if [ "$migrate_attempt" -eq "$migrate_max" ]; then
    echo "⚠ Migration skipped after ${migrate_max} attempts"
    break
  fi

  echo "DB not ready yet (attempt $migrate_attempt/$migrate_max), retrying in 3s..."
  sleep 3
  migrate_attempt=$((migrate_attempt + 1))
done

# Publish Filament assets
echo "Publishing Filament assets..."
php artisan filament:assets >/dev/null 2>&1 || true

# Sync public/ to the nginx volume so static files (CSS, JS, images) are always fresh.
# This runs on EVERY container start so new deployments are reflected immediately.
# The nginx container reads from /mnt/nginx-public (backend-v2-public volume).
if [ -d /mnt/nginx-public ]; then
  echo "Syncing public assets to nginx volume..."
  cp -a /var/www/html/public/. /mnt/nginx-public/
  rm -f /mnt/nginx-public/storage
  ln -s /var/www/html/storage/app/public /mnt/nginx-public/storage 2>/dev/null || true
  echo "✓ Public assets synced to nginx volume"
fi

# Rebuild caches BEFORE php-fpm starts
echo "Rebuilding Laravel caches..."
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "✓ Laravel caches rebuilt"

# Ready marker for deploy workflow
date '+%Y-%m-%d %H:%M:%S' > /tmp/.entrypoint-ready
echo "✓ Ready marker written to /tmp/.entrypoint-ready"

echo "========================================"
echo " ✅ Laravel Filament backend ready!"
echo "========================================"

exec "$@"