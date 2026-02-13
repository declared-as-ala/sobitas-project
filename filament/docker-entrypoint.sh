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

# ── Run migrations (non-destructive) ──────────────────────
echo "Running migrations..."
php artisan migrate --force 2>/dev/null || echo "⚠ Migration skipped (DB may not be ready yet)"

# ── Publish Filament assets ────────────────────────────────
echo "Publishing Filament assets..."
php artisan filament:assets 2>/dev/null || true

# ── Build caches for FAST boot ─────────────────────────────
# These caches prevent PHP from scanning filesystem on every request
# CRITICAL: These write to bootstrap/cache (on named volume, fast)
echo "Building performance caches..."
php artisan config:cache 2>/dev/null || true
php artisan route:cache 2>/dev/null || true
php artisan view:cache 2>/dev/null || true
php artisan event:cache 2>/dev/null || true

# ── Verify storage is on named volume (not bind mount) ─────
if [ -d "/var/www/html/storage" ]; then
    echo "Storage directory: $(realpath /var/www/html/storage)"
fi

# ── Warm API cache on startup ────────────────────────────
echo "Warming API cache..."
php artisan api:warm /api/all_products_fast --count=1 2>/dev/null || true
php artisan api:warm /api/all_products --count=1 2>/dev/null || true

# ── Warm OPcache by loading critical classes ─────────────
echo "Warming OPcache..."
php -r "require 'vendor/autoload.php'; new Illuminate\Foundation\Application(__DIR__);" 2>/dev/null || true

# ── Reset OPcache if RESET_OPCACHE env var is set ─────────
# This is used during deployments to clear cached code when validate_timestamps=0
if [ "$RESET_OPCACHE" = "1" ] || [ "$RESET_OPCACHE" = "true" ]; then
    echo "========================================"
    echo " 🔄 Resetting OPcache (deployment mode)..."
    echo "========================================"
    php -r "if (function_exists('opcache_reset')) { opcache_reset(); echo 'OPcache reset successful\n'; } else { echo 'OPcache not available\n'; }" || true
    # Also reload PHP-FPM to ensure clean state
    killall -USR2 php-fpm 2>/dev/null || true
fi

echo "========================================"
echo " ✅ Laravel Filament backend ready!"
echo "========================================"

# ── Start PHP-FPM ─────────────────────────────────────────
exec "$@"
