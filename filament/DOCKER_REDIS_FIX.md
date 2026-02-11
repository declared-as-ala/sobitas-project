# Fix: PHP Redis Extension Missing

## Problem

When trying to use Redis cache or queue, you get:
```
Error: Class "Redis" not found
```

This means the PHP Redis extension (`phpredis`) is not installed in the Docker container.

## Solution

The Dockerfile has been updated to include the Redis extension. You need to rebuild the Docker image.

### Step 1: Rebuild Backend Container

```bash
# Rebuild the backend image with Redis extension
docker-compose build backend

# Restart the backend container
docker-compose up -d backend
```

### Step 2: Verify Redis Extension is Installed

```bash
# Check if Redis extension is loaded
docker exec -it sobitas-backend php -m | grep redis

# Should output: redis
```

### Step 3: Test Redis Connection

```bash
# Test in tinker
docker exec -it sobitas-backend php artisan tinker

# Then run:
Cache::put('test', 'ok', 60);
Cache::get('test'); // Should return 'ok'
```

## Alternative: Quick Fix (Without Rebuild)

If you can't rebuild right now, you can install Redis extension manually:

```bash
# Install Redis extension
docker exec -it sobitas-backend bash -c "pecl install redis && docker-php-ext-enable redis"

# Restart PHP-FPM
docker-compose restart backend
```

**Note:** This fix will be lost when you rebuild the container. The proper fix is to rebuild with the updated Dockerfile.

## What Was Changed

The `Dockerfile` now includes:
```dockerfile
RUN apt-get install -y libhiredis-dev \
    && pecl install redis \
    && docker-php-ext-enable redis
```

This installs:
- `libhiredis-dev` - Redis client library (required for phpredis)
- `pecl install redis` - PHP Redis extension
- `docker-php-ext-enable redis` - Enables the extension

## Verification Checklist

- [ ] Backend container rebuilt: `docker-compose build backend`
- [ ] Backend container restarted: `docker-compose up -d backend`
- [ ] Redis extension installed: `docker exec sobitas-backend php -m | grep redis`
- [ ] Cache works: `docker exec sobitas-backend php artisan tinker` → `Cache::put('test', 'ok')`
- [ ] Queue works: Check `QUEUE_CONNECTION=redis` in environment

---

**Status:** ✅ Dockerfile updated | ⚠️ Rebuild required  
**Next Step:** Run `docker-compose build backend && docker-compose up -d backend`
