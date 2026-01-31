#!/bin/sh
set -e
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
