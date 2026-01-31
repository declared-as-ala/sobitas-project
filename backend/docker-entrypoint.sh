#!/bin/sh
set -e

# Ensure Laravel cache directories exist (bind mount may not have them)
# Use absolute paths - bootstrap/cache is a volume, storage is from bind mount
mkdir -p /var/www/html/storage/framework/cache/data
mkdir -p /var/www/html/storage/framework/sessions
mkdir -p /var/www/html/storage/framework/views
mkdir -p /var/www/html/storage/logs
mkdir -p /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Remove stale cached config that may have wrong paths (e.g. compiled => false)
rm -f /var/www/html/bootstrap/cache/config.php \
      /var/www/html/bootstrap/cache/services.php \
      /var/www/html/bootstrap/cache/packages.php

# When using a separate volume for vendor, ensure it's populated on first run
if [ ! -f /var/www/html/vendor/autoload.php ]; then
    echo "Vendor not found, running composer install..."
    composer install --no-dev --no-scripts --no-interaction --prefer-dist --optimize-autoloader
fi

# Create storage link if missing (not copied into image because of .dockerignore)
php artisan storage:link 2>/dev/null || true

# Always refresh package discovery so bootstrap/cache only lists installed packages (no dev-only Collision)
php artisan package:discover --ansi

# Clear caches so Laravel uses container env and Voyager routes/views load correctly
php artisan config:clear
php artisan route:clear
php artisan view:clear

exec "$@"
