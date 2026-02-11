# Fix: Entrypoint Script Not Found

## Problem

Container shows error:
```
exec /usr/local/bin/docker-entrypoint.sh: no such file or directory
```

This means the entrypoint script wasn't copied into the container during build.

## Solution

The Dockerfile has been updated. Rebuild the container:

```powershell
# Rebuild backend
docker-compose build --no-cache backend

# Start container
docker-compose up -d backend

# Check logs (should show entrypoint running)
docker logs sobitas-backend
```

## Alternative: Copy File Manually (Quick Fix)

If rebuild doesn't work, copy the file manually:

```powershell
# Copy entrypoint script into running container
docker cp filament/docker-entrypoint.sh sobitas-backend:/usr/local/bin/docker-entrypoint.sh

# Make it executable
docker exec -it sobitas-backend chmod +x /usr/local/bin/docker-entrypoint.sh

# Restart container
docker-compose restart backend
```

**Note:** This is temporary. The proper fix is to rebuild.

## Verify It's Fixed

```powershell
# Check if file exists in container
docker exec -it sobitas-backend ls -la /usr/local/bin/docker-entrypoint.sh

# Check container logs (should show "Laravel Filament backend ready!")
docker logs sobitas-backend --tail 20

# Test tinker
docker exec -it sobitas-backend php artisan tinker
```

---

**Status:** ✅ Dockerfile updated  
**Next Step:** Run `docker-compose build --no-cache backend && docker-compose up -d backend`
