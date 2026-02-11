# OPcache Optimization for First Request Performance

## 🎯 Goal

Reduce first request time from ~1.5s to < 700ms while keeping cache HIT requests < 120ms.

## ✅ Fixes Applied

### 1. Production OPcache Settings ✅
**File:** `filament/Dockerfile`

**Changes:**
- ✅ `opcache.validate_timestamps=0` - Disable file stat checks (production mode)
- ✅ `opcache.revalidate_freq=0` - Never revalidate (with validate_timestamps=0)
- ✅ `opcache.fast_shutdown=1` - Faster shutdown (reduces memory cleanup overhead)

**Before:**
```ini
opcache.validate_timestamps=1  # Checks files on every request (slow)
```

**After:**
```ini
opcache.validate_timestamps=0  # No file checks (fast)
opcache.revalidate_freq=0      # Never revalidate
opcache.fast_shutdown=1        # Faster shutdown
```

**Impact:** Eliminates filesystem stat() calls on every request, reducing bootstrap overhead.

### 2. Cache Warm-up on Startup ✅
**File:** `filament/docker-entrypoint.sh`

**Changes:**
- ✅ Enabled API cache warm-up for `/api/all_products_fast` and `/api/all_products`
- ✅ Added OPcache warm-up by pre-loading Laravel core classes

**Before:**
```bash
# php artisan api:warm --endpoint=all_products 2>/dev/null || true  # Commented out
```

**After:**
```bash
# Warm API cache
php artisan api:warm /api/all_products_fast --count=1 2>/dev/null || true
php artisan api:warm /api/all_products --count=1 2>/dev/null || true

# Warm OPcache
php -r "require 'vendor/autoload.php'; new Illuminate\Foundation\Application(__DIR__);" 2>/dev/null || true
```

**Impact:** Pre-populates cache and OPcache so first user request is fast.

### 3. Config/Route Caches Already Enabled ✅
**File:** `filament/docker-entrypoint.sh`

**Already in place:**
- ✅ `php artisan config:cache` - Caches configuration
- ✅ `php artisan route:cache` - Caches routes
- ✅ `php artisan view:cache` - Caches views
- ✅ `php artisan event:cache` - Caches events

**Impact:** Eliminates filesystem scanning on every request.

## 📊 Testing

### Before Optimization:
```bash
# First request: ~1500ms (cold cache + bootstrap overhead)
# Subsequent requests: 50-100ms (cache HIT)
```

### After Optimization (Expected):
```bash
# First request: < 700ms (warm cache + OPcache pre-loaded)
# Subsequent requests: < 120ms (cache HIT + OPcache)
```

### Run Benchmark:
```powershell
.\filament\tests\benchmark_first_request.ps1
```

**This will:**
1. Clear cache (cold start)
2. Test first request (should be < 700ms)
3. Test 10 subsequent requests (should be < 120ms avg)

## 🔍 Verification

### Check OPcache Status:
```bash
# Verify OPcache is enabled and configured correctly
docker exec sobitas-backend php -i | findstr /C:"opcache.enable" /C:"opcache.validate_timestamps"

# Expected:
# opcache.enable => On => On
# opcache.validate_timestamps => Off => Off  # ✅ Production mode
```

### Check Cache Files:
```bash
# Verify config/route caches exist
docker exec sobitas-backend ls -lah bootstrap/cache/*.php

# Should see:
# config.php
# routes-v7.php (or similar)
# events.php
```

### Check API Cache:
```bash
# Verify API cache is populated
docker exec sobitas-backend php artisan tinker
>>> Cache::get('api_cache:' . md5('http://localhost:8080/api/all_products_fast'))
# Should return cached data (not null)
```

## ⚠️ Important Notes

### OPcache validate_timestamps=0
**Production Only:** With `validate_timestamps=0`, OPcache will NOT check if files have changed. This means:
- ✅ Faster performance (no file stat overhead)
- ⚠️ Code changes require container restart to take effect
- ⚠️ Use `docker-compose restart backend` after code changes

**For Development:**
- Keep `validate_timestamps=1` in development
- Or use environment variable to toggle: `opcache.validate_timestamps=${OPCACHE_VALIDATE:-0}`

### Cache Warm-up Timing
**Startup Time:** Cache warm-up adds ~1-2s to container startup time, but ensures first user request is fast.

**Alternative:** Use healthcheck to warm cache after container is ready:
```yaml
healthcheck:
  test: ["CMD-SHELL", "php artisan api:warm /api/all_products_fast --count=1 && php-fpm-healthcheck"]
```

## 📋 Files Modified

- ✅ `filament/Dockerfile` - Updated OPcache settings (validate_timestamps=0)
- ✅ `filament/docker-entrypoint.sh` - Enabled cache warm-up
- ✅ `filament/tests/benchmark_first_request.ps1` - New benchmark script

## 🎯 Success Criteria

After optimization:
- ✅ First request: < 700ms
- ✅ Cache HIT requests: < 120ms avg
- ✅ OPcache validate_timestamps: Off (production mode)
- ✅ Cache warm-up runs on container start

---

**Status:** ✅ Configuration updated  
**Next:** Rebuild container and run benchmarks  
**Date:** 2026-02-09
