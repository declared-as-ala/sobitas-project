# Troubleshooting Backend Container Issues

## Quick Diagnostics

Run these commands to diagnose the issue:

```powershell
# 1. Check if container is running
docker ps | Select-String backend

# 2. Check container logs for errors
docker logs sobitas-backend --tail 50

# 3. Check if container is healthy
docker inspect sobitas-backend | Select-String -Pattern "Health|Status" -Context 2

# 4. Try to access the container
docker exec -it sobitas-backend php -v

# 5. Check Redis extension
docker exec -it sobitas-backend php -m | Select-String redis

# 6. Check environment variables
docker exec -it sobitas-backend env | Select-String -Pattern "REDIS|CACHE|QUEUE"
```

## Common Issues and Fixes

### Issue 1: Container Not Starting

**Symptoms:** Container exits immediately or shows as "Exited"

**Fix:**
```powershell
# Check logs
docker logs sobitas-backend

# Restart container
docker-compose restart backend

# Or rebuild and restart
docker-compose up -d --force-recreate backend
```

### Issue 2: Redis Extension Not Found

**Symptoms:** `Class "Redis" not found` error

**Fix:**
```powershell
# Check if extension is installed
docker exec -it sobitas-backend php -m | Select-String redis

# If not found, install manually (temporary fix)
docker exec -it sobitas-backend bash -c "pecl install redis && docker-php-ext-enable redis"
docker-compose restart backend

# Or rebuild (permanent fix)
docker-compose build backend
docker-compose up -d backend
```

### Issue 3: Cannot Connect to Redis

**Symptoms:** `Connection refused` or `Connection to Redis failed`

**Fix:**
```powershell
# Check if Redis container is running
docker ps | Select-String redis

# Check Redis logs
docker logs sobitas-redis

# Test network connectivity
docker exec -it sobitas-backend ping redis

# Check Redis environment variables
docker exec -it sobitas-backend env | Select-String REDIS
```

### Issue 4: Permission Errors

**Symptoms:** `Permission denied` errors in storage or bootstrap/cache

**Fix:**
```powershell
# Fix permissions inside container
docker exec -it sobitas-backend bash -c "chown -R www-data:www-data storage bootstrap/cache && chmod -R 775 storage bootstrap/cache"
```

### Issue 5: Database Connection Failed

**Symptoms:** `SQLSTATE[HY000] [2002]` or connection errors

**Fix:**
```powershell
# Check MySQL container
docker ps | Select-String mysql

# Check MySQL logs
docker logs sobitas-mysql --tail 20

# Test database connection
docker exec -it sobitas-backend php artisan tinker
# Then: DB::connection()->getPdo();
```

### Issue 6: Tinker Not Working

**Symptoms:** `php artisan tinker` fails or hangs

**Fix:**
```powershell
# Check PHP version
docker exec -it sobitas-backend php -v

# Check if artisan exists
docker exec -it sobitas-backend ls -la artisan

# Try running a simple command
docker exec -it sobitas-backend php artisan --version

# Check for syntax errors
docker exec -it sobitas-backend php artisan config:clear
```

## Get Detailed Error Information

```powershell
# Full container logs
docker logs sobitas-backend

# Last 100 lines
docker logs sobitas-backend --tail 100

# Follow logs in real-time
docker logs -f sobitas-backend

# Check container status
docker inspect sobitas-backend | ConvertFrom-Json | Select-Object State, Config, NetworkSettings
```

## Restart Everything

If nothing else works:

```powershell
# Stop all containers
docker-compose down

# Rebuild backend
docker-compose build backend

# Start all containers
docker-compose up -d

# Check status
docker-compose ps
```

---

**Please share the actual error message** from `docker logs sobitas-backend` or the output when running `php artisan tinker` so I can provide a more specific fix.
