#!/bin/sh
set -e

cd /var/www/html

# ── Ensure .env exists (Laravel and key:generate read it; env_file does not create a file) ──
if [ ! -f .env ]; then
  touch .env
  [ -n "$APP_KEY" ] && echo "APP_KEY=$APP_KEY" >> .env
  [ -n "$APP_ENV" ] && echo "APP_ENV=$APP_ENV" >> .env
  [ -n "$APP_DEBUG" ] && echo "APP_DEBUG=$APP_DEBUG" >> .env
  [ -n "$APP_URL" ] && echo "APP_URL=$APP_URL" >> .env
fi
if [ -z "$APP_KEY" ] || ! grep -q 'APP_KEY=base64:' .env 2>/dev/null; then
  php artisan key:generate --force 2>/dev/null || true
fi

# ── Sync vendor with image's composer.lock ─────────────────
# The vendor directory lives on a persistent Docker volume.
# On redeploy the image ships a new composer.lock but the volume
# still holds packages from the PREVIOUS deploy.  We must always
# run `composer install` here — BEFORE php-fpm starts — so that:
#   1. Vendor files match the new code
#   2. FPM's OPcache starts clean (no stale bytecode from old vendor)
echo "========================================"
echo " Syncing vendor packages (persistent volume → image lock) ..."
echo "========================================"
COMPOSER_MEMORY_LIMIT=-1 COMPOSER_ALLOW_SUPERUSER=1 \
  composer install --no-interaction --optimize-autoloader --no-dev 2>&1 || {
    echo "composer install failed, retrying without scripts..."
    COMPOSER_MEMORY_LIMIT=-1 COMPOSER_ALLOW_SUPERUSER=1 \
      composer install --no-interaction --no-scripts --optimize-autoloader --no-dev
    COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload --optimize
}

# ── Ensure storage directories exist ───────────────────────
mkdir -p storage/framework/{cache,sessions,testing,views}
mkdir -p storage/logs
mkdir -p bootstrap/cache

# ── Set permissions ────────────────────────────────────────
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

# ── Create storage symlink (CRITICAL for file serving) ─────
# This creates public/storage -> storage/app/public
# Must be done every startup because public/ might be on a separate volume
if [ ! -L public/storage ] || [ ! -e public/storage ]; then
    echo "Creating storage symlink..."
    php artisan storage:link 2>/dev/null || {
        # Fallback: create symlink manually if artisan fails
        rm -f public/storage
        ln -s ../storage/app/public public/storage
        echo "✓ Storage symlink created manually"
    }
else
    echo "✓ Storage symlink already exists"
fi

# ── Run migrations (retry if DB not ready; suppress connection errors) ─
echo "Running migrations..."
migrate_attempt=1
migrate_max=5
while [ "$migrate_attempt" -le "$migrate_max" ]; do
    if php artisan migrate --force 2>/dev/null 1>/dev/null; then
        echo "✓ Migrations completed"
        break
    fi
    if [ "$migrate_attempt" -eq "$migrate_max" ]; then
        echo "⚠ Migration skipped after ${migrate_max} attempts (DB may not be ready)"
        break
    fi
    echo "  DB not ready (attempt $migrate_attempt/$migrate_max), retrying in 3s..."
    sleep 3
    migrate_attempt=$((migrate_attempt + 1))
done

# ── Publish Filament assets ────────────────────────────────
echo "Publishing Filament assets..."
php artisan filament:assets 2>/dev/null || true

# ── Regenerate autoloader (picks up any new classes added since image build) ──
composer dump-autoload --optimize --quiet 2>/dev/null || true

# ── Build caches for FAST boot ─────────────────────────────
# ALL cache operations happen here, BEFORE php-fpm starts.
# This guarantees FPM's OPcache is populated with fresh bytecode.
# The CI/CD script should NOT duplicate these — it just waits for ready.
echo "Building performance caches..."
php artisan optimize:clear 2>&1 || true
echo "  Cleared all old caches (config, route, view, event)"
php artisan config:cache 2>&1 || true
php artisan route:cache 2>&1 || true
php artisan view:cache 2>&1 || true
php artisan event:cache 2>&1 || true
echo "  Rebuilt config / route / view / event caches"

# ── Verify storage is on named volume (not bind mount) ─────
if [ -d "/var/www/html/storage" ]; then
    echo "Storage directory: $(realpath /var/www/html/storage)"
fi

# ── Warm API cache on startup ────────────────────────────
echo "Warming API cache..."
php artisan api:warm --endpoint=all_products_fast 2>/dev/null || true
php artisan api:warm --endpoint=all_products 2>/dev/null || true

# ── OPcache note ──────────────────────────────────────────
# OPcache is EMPTY when FPM starts (fresh process).
# With validate_timestamps=0, FPM caches bytecode on first load
# and never rechecks files.  Because we run composer install
# and view:cache BEFORE starting FPM, the first-loaded bytecode
# is always from the NEW deploy.  No explicit OPcache reset needed.
echo "OPcache: clean start (FPM not yet running, all vendor+views synced)"

echo "========================================"
echo " ✅ Laravel Filament backend ready!"
echo "========================================"

# ── Write readiness marker (CI/CD polls for this) ─────────
date '+%Y-%m-%d %H:%M:%S' > /tmp/.entrypoint-ready

# ── Start PHP-FPM (run as root so FPM can open error_log; workers still www-data per www.conf) ─────────
exec "$@"
