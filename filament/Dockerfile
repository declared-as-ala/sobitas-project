# ----------------------------------------
# PHP 8.3-fpm with all required extensions
# ----------------------------------------
FROM php:8.3-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libwebp-dev \
    libzip-dev \
    libicu-dev \
    libhiredis-dev \
    zip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-configure intl \
    && docker-php-ext-install pdo_mysql gd zip opcache exif bcmath intl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# PHP OPcache settings (Production optimized)
# CRITICAL: validate_timestamps=0 for production (no file stat overhead)
# This eliminates filesystem checks on every request, significantly reducing bootstrap time
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache-custom.ini \
    && echo "opcache.memory_consumption=256" >> /usr/local/etc/php/conf.d/opcache-custom.ini \
    && echo "opcache.interned_strings_buffer=16" >> /usr/local/etc/php/conf.d/opcache-custom.ini \
    && echo "opcache.max_accelerated_files=20000" >> /usr/local/etc/php/conf.d/opcache-custom.ini \
    && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache-custom.ini \
    && echo "opcache.revalidate_freq=0" >> /usr/local/etc/php/conf.d/opcache-custom.ini \
    && echo "opcache.save_comments=1" >> /usr/local/etc/php/conf.d/opcache-custom.ini \
    && echo "opcache.fast_shutdown=1" >> /usr/local/etc/php/conf.d/opcache-custom.ini

# PHP memory and upload limits
RUN echo "upload_max_filesize=64M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size=64M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit=512M" >> /usr/local/etc/php/conf.d/uploads.ini

# Create PHP-FPM log directory
RUN mkdir -p /var/log/php-fpm && chown -R www-data:www-data /var/log/php-fpm

# Copy PHP-FPM configuration files
COPY docker/php-fpm/www.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/php-fpm/php-fpm.conf /usr/local/etc/php-fpm/php-fpm.conf

# Install Composer globally
RUN curl -sS https://getcomposer.org/installer | php \
    -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www/html

# Copy entrypoint script FIRST (before COPY . . to ensure it's included)
# Fix line endings (Windows CRLF -> Unix LF) and make executable
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy composer files for Docker layer caching
COPY composer.json composer.lock ./

# Install PHP dependencies (no scripts — artisan needs the full app + DB)
RUN composer install --no-scripts --no-interaction --prefer-dist --optimize-autoloader

# Copy application code (excludes files in .dockerignore, including public/storage symlink)
# The public/storage symlink will be created at runtime by docker-entrypoint.sh
COPY . .

# Generate optimized autoloader without running artisan scripts
# (artisan scripts run at container startup via entrypoint instead)
RUN COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload --optimize --no-scripts 2>/dev/null || true

# Set permissions
RUN mkdir -p storage/framework/{cache,sessions,testing,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 9000

# Use full path for entrypoint to avoid PATH issues
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["php-fpm"]
