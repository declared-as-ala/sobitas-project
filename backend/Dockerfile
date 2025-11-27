# ----------------------------------------
# Stage 1: Builder
# ----------------------------------------
FROM php:8.2-fpm AS builder

# All system dependencies (dev headers + runtime libs) — nothing is missing
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    unzip \
    zip \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libwebp-dev \
    libwebpmux3 \
    libwebpdemux2 \
    libzip-dev \
    && rm -rf /var/lib/apt/lists/*

# Configure and install GD with FULL support (JPEG + PNG + FreeType + WebP)
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        gd \
        zip \
        opcache \
        exif \
        bcmath

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www/html

# Composer dependencies (cached layer)
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --optimize-autoloader

# Copy application code
COPY . .

# Clear caches
RUN php artisan config:clear && php artisan cache:clear && php artisan view:clear

# ----------------------------------------
# Stage 2: Final runtime (super small & secure)
# ----------------------------------------
FROM php:8.2-fpm

# Only runtime libraries (no -dev packages = smaller image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng16-16 \
    libjpeg62-turbo \
    libfreetype6 \
    libwebp7 \
    libwebpmux3 \
    libwebpdemux2 \
    libzip4 \
    && rm -rf /var/lib/apt/lists/*

# Same GD configuration as builder → WebP works 100%
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        gd \
        zip \
        opcache \
        exif \
        bcmath

# Copy Composer + app from builder
COPY --from=builder /usr/local/bin/composer /usr/local/bin/composer
COPY --from=builder /var/www/html /var/www/html

# Permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Laravel production optimizations
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

WORKDIR /var/www/html
EXPOSE 9000
CMD ["php-fpm"]