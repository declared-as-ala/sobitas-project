# Quick Fix: Install Redis Extension Now

## Option 1: Quick Manual Install (Works Immediately)

Run these commands to install Redis extension in the running container:

```powershell
# Install Redis extension
docker exec -it sobitas-backend bash -c "pecl install redis && docker-php-ext-enable redis"

# Restart PHP-FPM to load the extension
docker-compose restart backend
```

Then test:
```powershell
docker exec -it sobitas-backend php artisan tinker
# Then:
Cache::put('test', 'ok', 60);
Cache::get('test'); // Should return 'ok'
```

**Note:** This fix is temporary and will be lost if you rebuild the container. Use Option 2 for a permanent fix.

---

## Option 2: Rebuild Container (Permanent Fix)

The Dockerfile has been updated. Rebuild the container:

```powershell
# Rebuild backend image
docker-compose build backend

# Restart backend
docker-compose up -d backend

# Verify Redis extension
docker exec -it sobitas-backend php -m | Select-String redis
# Should show: redis

# Test
docker exec -it sobitas-backend php artisan tinker
Cache::put('test', 'ok', 60);
Cache::get('test');
```

---

## If pecl install fails

If you get errors during `pecl install redis`, try:

```powershell
# Install dependencies first
docker exec -it sobitas-backend bash -c "apt-get update && apt-get install -y libhiredis-dev"

# Then install Redis
docker exec -it sobitas-backend bash -c "pecl install redis && docker-php-ext-enable redis"

# Restart
docker-compose restart backend
```

---

## Verify It's Working

```powershell
# Check extension is loaded
docker exec -it sobitas-backend php -m | Select-String redis

# Test cache
docker exec -it sobitas-backend php artisan tinker
Cache::put('test', 'ok', 60);
Cache::get('test'); // Should return 'ok'

# Check Redis connection
docker exec -it sobitas-backend php artisan tinker
Redis::connection()->ping(); // Should return: "+PONG"
```
