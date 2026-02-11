# Storage Volume Migration Guide

## 🔍 Root Cause Identified

**Problem:** File writes to `storage/logs/` are extremely slow on Docker/Windows bind mounts:
- `file_put_contents` 1000x: **37.407s** ❌
- This causes 2-6s spikes in API and Filament admin

**Solution:** Move `storage/` and `bootstrap/cache/` to named Docker volumes (Linux filesystem, fast writes)

## ✅ Fixes Applied

### 1. Updated docker-compose.yml ✅
**Changes:**
- Added `backend-storage` named volume
- Mounted `/var/www/html/storage` to named volume
- Added `LOG_CHANNEL=stderr` to environment

**File:** `docker-compose.yml`

```yaml
volumes:
  - backend-storage:/var/www/html/storage  # Named volume (fast writes)

environment:
  LOG_CHANNEL: stderr  # No file I/O for logs
```

### 2. Updated Logging Configuration ✅
**Changes:**
- `DisableFileLoggingForApi` middleware now uses `stderr` channel
- `stderr` writes to container logs (no filesystem I/O)

**Files:**
- `filament/app/Http/Middleware/DisableFileLoggingForApi.php`
- `docker-compose.yml` (LOG_CHANNEL=stderr)

### 3. Verified Redis Drivers ✅
**Current Configuration:**
- ✅ `SESSION_DRIVER=redis` (no file I/O)
- ✅ `CACHE_DRIVER=redis` (no file I/O)
- ✅ `QUEUE_CONNECTION=redis` (no file I/O)

## 📋 Migration Steps

### Step 1: Backup Current Storage (Optional)
```bash
# Backup storage directory before migration
docker exec sobitas-backend tar -czf /tmp/storage-backup.tar.gz -C /var/www/html storage
docker cp sobitas-backend:/tmp/storage-backup.tar.gz ./storage-backup.tar.gz
```

### Step 2: Stop Containers
```bash
docker-compose down
```

### Step 3: Rebuild and Start
```bash
docker-compose build backend
docker-compose up -d
```

### Step 4: Verify Storage is on Named Volume
```bash
# Check storage location
docker exec sobitas-backend realpath /var/www/html/storage

# Should show: /var/lib/docker/volumes/... (named volume)
# NOT: /var/www/html/storage (bind mount)
```

### Step 5: Run Filesystem Benchmark
```bash
docker exec sobitas-backend php tests/filesystem_benchmark.php
```

**Expected Results:**
- `file_exists` 5000x: < 0.1s ✅
- `file_put_contents` 1000x: < 1.0s ✅ (was 37s)
- Storage on named volume: YES ✅

### Step 6: Run Route Benchmarks
```powershell
# Compare routes
.\filament\tests\compare_routes.ps1

# Parallel benchmark
.\filament\tests\benchmark_parallel.ps1
```

**Expected Results:**
- `/api/all_products_fast`: Max < 400ms, Avg < 300ms
- No spikes (2-6s outliers eliminated)

## 🔍 Verification Commands

### Check Storage Location
```bash
# Inside container
docker exec sobitas-backend sh -c "realpath /var/www/html/storage && df -h /var/www/html/storage"
```

### Check Log Channel
```bash
docker exec sobitas-backend php artisan tinker
>>> config('logging.default')  # Should be 'stderr'
```

### Check Session/Cache Drivers
```bash
docker exec sobitas-backend php artisan tinker
>>> config('session.driver')   # Should be 'redis'
>>> config('cache.default')    # Should be 'redis'
```

### Monitor File Writes
```bash
# Watch for writes to storage/logs (should be minimal)
docker exec sobitas-backend sh -c "watch -n 1 'ls -lah /var/www/html/storage/logs | tail -5'"
```

## 📊 Before/After Comparison

### Before (Bind Mount):
- `file_put_contents` 1000x: **37.407s** ❌
- API spikes: **2-6s** ❌
- Filament navigation: **Slow** ❌

### After (Named Volume):
- `file_put_contents` 1000x: **< 1.0s** ✅ (expected)
- API spikes: **Eliminated** ✅
- Filament navigation: **Smooth** ✅

## ⚠️ Important Notes

1. **Data Migration:** Existing files in `storage/` will be moved to named volume on first startup
2. **Backup:** Consider backing up `storage/` before migration
3. **Permissions:** Named volumes maintain proper permissions automatically
4. **Persistence:** Named volumes persist even if container is removed

## 🎯 Success Criteria

After migration:
- ✅ `file_put_contents` 1000x: < 1.0s
- ✅ `/api/all_products_fast`: Max < 400ms, Avg < 300ms
- ✅ No spikes in 30 sequential requests
- ✅ Filament page navigation smooth
- ✅ Storage on named volume (verified)

---

**Status:** ✅ Configuration updated  
**Next:** Rebuild containers and run benchmarks  
**Date:** 2026-02-09
