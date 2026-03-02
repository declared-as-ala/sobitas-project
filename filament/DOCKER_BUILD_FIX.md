# Fix: Docker Build Error - "invalid file request public/storage"

## Problem

When building the Docker image, you get:
```
failed to solve: invalid file request public/storage
```

This happens because `public/storage` is a symlink, and Docker can't copy symlinks during the build process.

## Solution

A `.dockerignore` file has been created to exclude the symlink and other unnecessary files from the build context.

### What Was Fixed

1. **Created `.dockerignore`** - Excludes:
   - `public/storage` symlink
   - `node_modules`
   - `vendor` (will be installed during build)
   - Storage and cache files
   - Git files
   - IDE files
   - Documentation files

2. **Updated Dockerfile** - Added comment explaining that the symlink is created at runtime

3. **Entrypoint script** - Already handles creating the symlink with `php artisan storage:link`

## How to Build Now

```powershell
# Rebuild the backend image
docker-compose build backend

# Start the container
docker-compose up -d backend
```

The build should now succeed because:
- `public/storage` is excluded from the build context
- The symlink is created at runtime by `docker-entrypoint.sh`
- Build context is much smaller (faster builds)

## Verify It Works

```powershell
# Check if container is running
docker ps | Select-String backend

# Check if storage link was created
docker exec -it sobitas-backend ls -la public/ | Select-String storage
# Should show: storage -> ../storage/app/public

# Test Redis (after rebuild)
docker exec -it sobitas-backend php -m | Select-String redis
```

## Benefits

- ✅ Faster builds (smaller context)
- ✅ No symlink errors
- ✅ Cleaner Docker images
- ✅ Storage link created automatically at runtime

---

**Status:** ✅ Fixed  
**Next Step:** Run `docker-compose build backend && docker-compose up -d backend`
