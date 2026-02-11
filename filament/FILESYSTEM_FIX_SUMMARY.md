# Filesystem I/O Bottleneck Fix - Summary

## 🔍 Root Cause Identified

**Problem:** File writes to `storage/logs/` are extremely slow on Docker/Windows bind mounts:
- `file_exists` 5000x: **24.508s** ❌
- `file_put_contents` 1000x: **37.893s** ❌
- This causes 2-6s spikes in API and Filament admin navigation

**Root Cause:** Windows bind mounts (`./filament/storage`) are 100x slower than Linux filesystem for file I/O operations.

## ✅ Fixes Applied

### 1. Moved Storage to Named Docker Volume ✅
**File:** `docker-compose.yml`

**Changes:**
- Added `backend-storage` named volume
- Mounted `/var/www/html/storage` to named volume in both `backend` and `backend-nginx` services
- Named volumes use Linux filesystem (fast writes)

**Before:**
```yaml
volumes:
  - ./filament/storage:/var/www/html/storage  # Bind mount (slow)
```

**After:**
```yaml
volumes:
  - backend-storage:/var/www/html/storage  # Named volume (fast)
```

### 2. Switched Logging to stderr ✅
**File:** `docker-compose.yml`

**Changes:**
- Added `LOG_CHANNEL=stderr` to backend environment
- `stderr` writes to container logs (no filesystem I/O)

**File:** `filament/app/Http/Middleware/DisableFileLoggingForApi.php`

**Changes:**
- Updated to use `stderr` channel instead of `errorlog`
- Ensures no file writes during API requests

### 3. Verified Redis Drivers ✅
**Current Configuration:**
- ✅ `SESSION_DRIVER=redis` (no file I/O)
- ✅ `CACHE_DRIVER=redis` (no file I/O)
- ✅ `QUEUE_CONNECTION=redis` (no file I/O)

### 4. Created Filesystem Benchmark ✅
**File:** `filament/tests/filesystem_benchmark.php`

**Purpose:** Verify storage is on named volume and measure write performance

## 📊 Expected Results

### Before (Bind Mount):
- `file_exists` 5000x: **24.508s** ❌
- `file_put_contents` 1000x: **37.893s** ❌
- API spikes: **2-6s** ❌
- Filament navigation: **Slow** ❌

### After (Named Volume):
- `file_exists` 5000x: **< 0.1s** ✅ (expected)
- `file_put_contents` 1000x: **< 1.0s** ✅ (expected)
- API spikes: **Eliminated** ✅
- Filament navigation: **Smooth** ✅

## 🚀 Migration Steps

See `MIGRATION_STEPS.md` for detailed step-by-step instructions.

**Quick Summary:**
1. Stop containers: `docker-compose down`
2. Rebuild: `docker-compose build backend`
3. Start: `docker-compose up -d`
4. Verify: `docker exec sobitas-backend php tests/filesystem_benchmark.php`
5. Benchmark: `.\filament\tests\compare_routes.ps1`

## 🔍 Verification Commands

### Check Storage Location
```bash
docker exec sobitas-backend sh -c "realpath /var/www/html/storage && df -h /var/www/html/storage"
# Should show: /var/lib/docker/volumes/... (named volume)
```

### Run Filesystem Benchmark
```bash
docker exec sobitas-backend php tests/filesystem_benchmark.php
# Expected: file_put_contents < 1.0s
```

### Check Log Channel
```bash
docker exec sobitas-backend php artisan tinker
>>> config('logging.default')  # Should be 'stderr'
```

### Run Route Benchmarks
```powershell
.\filament\tests\compare_routes.ps1
.\filament\tests\benchmark_parallel.ps1
```

## 📋 Files Modified

- ✅ `docker-compose.yml` (storage volume, LOG_CHANNEL)
- ✅ `filament/app/Http/Middleware/DisableFileLoggingForApi.php` (stderr)
- ✅ `filament/tests/filesystem_benchmark.php` (new)
- ✅ `filament/MIGRATION_STEPS.md` (new)
- ✅ `filament/STORAGE_VOLUME_MIGRATION.md` (new)

## 🎯 Success Criteria

After migration:
- ✅ `file_put_contents` 1000x: < 1.0s
- ✅ Storage on named volume: YES
- ✅ `/api/all_products_fast`: Max < 400ms, Avg < 300ms
- ✅ No spikes in 30 sequential requests
- ✅ Filament page navigation smooth
- ✅ `LOG_CHANNEL=stderr` verified

---

**Status:** ✅ Configuration complete  
**Next:** Rebuild containers and run benchmarks  
**Date:** 2026-02-09
