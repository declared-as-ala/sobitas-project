#!/bin/bash
set -e

# Fix storage permissions (critical for Laravel to write logs and files)
# Ensure storage directories exist and have correct permissions
mkdir -p /var/www/html/storage/logs
mkdir -p /var/www/html/storage/framework/cache
mkdir -p /var/www/html/storage/framework/sessions
mkdir -p /var/www/html/storage/framework/views
mkdir -p /var/www/html/bootstrap/cache

# Set ownership and permissions
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Ensure log file exists and is writable
touch /var/www/html/storage/logs/laravel.log
chown www-data:www-data /var/www/html/storage/logs/laravel.log
chmod 664 /var/www/html/storage/logs/laravel.log

# Clear Laravel caches
php artisan config:clear || true
php artisan cache:clear || true
php artisan view:clear || true

# Optimize Laravel caches (these don't require database connection)
php artisan config:cache || true
php artisan route:cache || true

# View cache might need database, so make it optional
php artisan view:cache || echo "View cache skipped (database may not be ready yet)"

# Execute the main command
exec "$@"
