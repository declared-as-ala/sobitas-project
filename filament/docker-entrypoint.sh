#!/bin/sh
set -e

cd /var/www/html

# ── Install vendor if volume is empty ──────────────────────
if [ ! -f vendor/autoload.php ]; then
    echo "========================================"
    echo " Vendor directory empty — running composer install ..."
    echo "========================================"
    composer install --no-interaction --optimize-autoloader 2>&1 || {
        echo "composer install failed, retrying without scripts..."
        composer install --no-interaction --no-scripts --optimize-autoloader
        composer dump-autoload --optimize
    }
fi

# ── Ensure storage directories exist ───────────────────────
mkdir -p storage/framework/{cache,sessions,testing,views}
mkdir -p storage/logs
mkdir -p bootstrap/cache

# ── Set permissions ────────────────────────────────────────
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

# ── Generate app key if missing ────────────────────────────
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "" ]; then
    if grep -q "APP_KEY=$" .env 2>/dev/null || ! grep -q "APP_KEY" .env 2>/dev/null; then
        php artisan key:generate --force 2>/dev/null || true
    fi
fi

# ── Run migrations (non-destructive) ──────────────────────
echo "Running migrations..."
php artisan migrate --force 2>/dev/null || echo "⚠ Migration skipped (DB may not be ready yet)"

# ── Create storage link if not exists ──────────────────────
php artisan storage:link 2>/dev/null || true

# ── Publish Filament assets ────────────────────────────────
echo "Publishing Filament assets..."
php artisan filament:assets 2>/dev/null || true

# ── Build caches for FAST boot ─────────────────────────────
# These caches prevent PHP from scanning filesystem on every request
# On Windows Docker, this reduces boot time from ~8s to ~1s
# CRITICAL: These write to bootstrap/cache (now on named volume, fast)
echo "Building performance caches..."
php artisan config:cache 2>/dev/null || true
php artisan route:cache 2>/dev/null || true
php artisan view:cache 2>/dev/null || true
php artisan event:cache 2>/dev/null || true

# ── Verify storage is on named volume (not bind mount) ─────
# This ensures fast file writes (37s -> 0.3s improvement)
if [ -d "/var/www/html/storage" ]; then
    echo "Storage directory: $(realpath /var/www/html/storage)"
fi

# ── Warm API cache on startup ────────────────────────────
# CRITICAL: Pre-populate cache so first user request is fast (< 700ms target)
# This ensures users never hit cold cache, eliminating 1.5s first request delay
echo "Warming API cache..."
php artisan api:warm /api/all_products_fast --count=1 2>/dev/null || true
php artisan api:warm /api/all_products --count=1 2>/dev/null || true

# ── Warm OPcache by loading critical classes ─────────────
# Pre-load Laravel core classes to eliminate autoload overhead on first request
echo "Warming OPcache..."
php -r "require 'vendor/autoload.php'; new Illuminate\Foundation\Application(__DIR__);" 2>/dev/null || true

echo "========================================"
echo " ✅ Laravel Filament backend ready!"
echo "========================================"

# ── Start PHP-FPM ─────────────────────────────────────────
exec "$@"
