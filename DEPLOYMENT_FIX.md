# Deployment Fix - Filament Backend V2

## Root Cause Analysis

### Problem 1: Stale Code After Deployment (OPcache)
**Root Cause**: `opcache.validate_timestamps=0` prevents PHP from checking file modification times. When a new Docker image is deployed, OPcache still serves the old cached bytecode, so code changes don't appear until the container is fully restarted or OPcache is manually reset.

**Solution**: Reset OPcache explicitly after each deployment using `opcache_reset()` and reload PHP-FPM.

### Problem 2: Missing Storage Symlink
**Root Cause**: The `public/storage` symlink is created in the `backend-v2` container, but the `backend-v2-public` volume (mounted by nginx) doesn't have this symlink. The `backend-v2-public-init` service copies files but doesn't create the symlink.

**Solution**: Modify `backend-v2-public-init` to explicitly create the symlink pointing to the storage volume.

### Problem 3: Unnecessary Git Pull on VPS
**Root Cause**: The workflow does `git pull origin main` which can introduce mismatches between the deployed image and the repo state, and is unnecessary since we deploy Docker images.

**Solution**: Only pull `docker-compose.yml` if needed, not the entire repo.

### Problem 4: Deployment Order Issues
**Root Cause**: Caches are cleared before OPcache reset, and the order of operations doesn't ensure a clean state.

**Solution**: Implement a deterministic deployment order with proper health checks.

## Files Changed

1. **`filament/docker-entrypoint.sh`**
   - Added explicit symlink creation check
   - Added OPcache reset capability via `RESET_OPCACHE` env var
   - Improved error handling

2. **`docker-compose.yml`**
   - Fixed `backend-v2-public-init` to create storage symlink
   - Added `FILESYSTEM_DISK=public` environment variables
   - Mounted storage volume in `backend-v2-public-init` for symlink creation

3. **`.github/workflows/deploy-filament.yml`**
   - Removed full `git pull`, only pull `docker-compose.yml`
   - Added deterministic deployment steps with proper order
   - Added OPcache reset step (critical)
   - Added health checks and error handling
   - Improved logging and verification

## Deployment Order (Why It Matters)

1. **Pull docker-compose.yml only** - Avoids repo mismatches
2. **Pull Docker image** - Get latest code
3. **Ensure MySQL/Redis healthy** - Dependencies must be ready
4. **Recreate backend-v2** - New container with new image
5. **Wait for startup** - Container needs time to initialize
6. **Copy public assets + create symlink** - Nginx needs updated files
7. **Restart nginx** - Pick up new assets
8. **Clear Laravel caches** - Remove stale config/route/view caches
9. **Reset OPcache** - **CRITICAL** - Clear cached PHP bytecode
10. **Rebuild Laravel caches** - Fresh caches with new code
11. **Health check** - Verify deployment succeeded

## OPcache Reset Method

**Chosen Approach**: Direct `opcache_reset()` via PHP + PHP-FPM reload

**Why**: 
- Safest and most reliable
- Works even with `validate_timestamps=0`
- No need to restart entire container
- Immediate effect

**Implementation**:
```bash
# Reset OPcache
php -r "opcache_reset();"
# Reload PHP-FPM to ensure clean state
killall -USR2 php-fpm
```

## Commands Executed on VPS

```bash
# 1. Pull only docker-compose.yml (not full repo)
git fetch origin main
git checkout origin/main -- docker-compose.yml

# 2. Login to GHCR
echo "$GHCR_PAT" | docker login ghcr.io -u $USER --password-stdin

# 3. Pull latest image
docker pull ghcr.io/declared-as-ala/sobitas-backend-v2:latest

# 4. Ensure dependencies
docker compose up -d mysql redis
# Wait for MySQL health check

# 5. Recreate backend-v2
docker compose up -d --force-recreate --no-deps backend-v2

# 6. Wait for startup
sleep 10

# 7. Copy public assets + create symlink
docker compose run --rm backend-v2-public-init

# 8. Restart nginx
docker compose up -d --no-deps backend-nginx-v2

# 9. Clear Laravel caches
docker compose exec -T backend-v2 php artisan config:clear
docker compose exec -T backend-v2 php artisan cache:clear
docker compose exec -T backend-v2 php artisan view:clear
docker compose exec -T backend-v2 php artisan route:clear

# 10. CRITICAL: Reset OPcache
docker compose exec -T backend-v2 php -r "opcache_reset();"
docker compose exec -T backend-v2 killall -USR2 php-fpm

# 11. Rebuild Laravel caches
docker compose exec -T backend-v2 php artisan config:cache
docker compose exec -T backend-v2 php artisan route:cache
docker compose exec -T backend-v2 php artisan view:cache

# 12. Health check
curl -f http://127.0.0.1:8083/admin/login
```

## Verification

After deployment, verify:
1. ✅ Backend responds: `curl http://127.0.0.1:8083/admin/login`
2. ✅ Storage symlink exists: `docker compose exec backend-nginx-v2 ls -la /var/www/html/public/storage`
3. ✅ Images load: Check `https://admin.sobitas.tn/storage/categories/...`
4. ✅ Code changes visible: Check that new features/changes appear immediately
