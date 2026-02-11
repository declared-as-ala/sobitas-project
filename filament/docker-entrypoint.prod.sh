#!/bin/sh
set -e

cd /var/www/html

# ── Install vendor if volume is empty ──────────────────────
if [ ! -f vendor/autoload.php ]; then
    echo "========================================"
    echo " Vendor directory empty — running composer install ..."
    echo "========================================"
    composer install --no-interaction --optimize-autoloader --no-scripts 2>&1 || {
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

# ── Create storage link if not exists (safe) ───────────────
php artisan storage:link 2>/dev/null || true

# ── DO NOT run key:generate automatically (APP_KEY must be in env)
# ── DO NOT run migrations automatically (run manually when ready)
# ── DO NOT build caches automatically (may break if config is wrong)
# ── DO NOT warm cache automatically (may fail with wrong args)

echo "========================================"
echo " ✅ Laravel Filament backend ready!"
echo "========================================"
echo "⚠️  Production mode: No automatic migrations or cache building"
echo "   Run manually: php artisan migrate, php artisan optimize, etc."

# ── Start PHP-FPM ─────────────────────────────────────────
exec "$@"
