# Middleware Isolation & File I/O Fixes

## ✅ Fixes Applied

### 1. Disabled File Logging for API Routes ✅
**Problem:** `LOG_CHANNEL=stack` uses `daily` driver which writes to `storage/logs/laravel.log`. On Docker/Windows, file I/O is extremely slow (2-6s spikes).

**Fix:**
- Created `DisableFileLoggingForApi` middleware
- Switches `LOG_CHANNEL` to `errorlog` for all API routes
- `errorlog` writes to PHP error_log (stderr), no filesystem I/O
- Added to API middleware group (runs first)

**Files:**
- `filament/app/Http/Middleware/DisableFileLoggingForApi.php` (new)
- `filament/app/Http/Kernel.php` (updated)

**Impact:** Eliminates file I/O overhead on every API request

### 2. Verified Session/Cache Drivers ✅
**Current Configuration (docker-compose.yml):**
- ✅ `SESSION_DRIVER=redis` (not file)
- ✅ `CACHE_DRIVER=redis` (not file)

**Status:** Already optimized - no file I/O for sessions/cache

### 3. Created Fast Route for Comparison ✅
**Route:** `/api/all_products_fast`

**Removed Middleware:**
- ❌ `throttle:api` (rate limiting)
- ❌ `DisableFileLoggingForApi` (still uses file logging for comparison)
- ❌ `DisableDebugbarForApi` (debugbar disabled)
- ❌ `RequestTimeline` (profiling)
- ❌ `PerformanceProfiler` (profiling)

**Kept Middleware:**
- ✅ `cache.api:60` (essential for performance)
- ✅ `cache.headers.api:60` (cache headers)
- ✅ `SubstituteBindings` (required for routing)

**Files:**
- `filament/routes/api.php` (updated)

### 4. Removed PHP Compression ✅
**Status:** Already removed from routes
- ✅ No `compress.response` middleware on API routes
- ✅ Nginx gzip handles compression (faster)

**Verification:**
```bash
# Check routes don't have compress.response
docker exec sobitas-backend php artisan route:list --path=all_products
```

## 📊 Comparison Benchmark

### Run Comparison:
```powershell
.\filament\tests\compare_routes.ps1
```

**This will:**
1. Test `/api/all_products` (normal route with all middleware)
2. Test `/api/all_products_fast` (minimal middleware)
3. Compare results (min, max, avg, improvement)

### Expected Results:

**Normal Route (with all middleware):**
- May show spikes (2-6s) due to file logging, throttle, profiling

**Fast Route (minimal middleware):**
- Should be stable (< 800ms max, < 300ms avg)
- If fast route is stable → middleware is the bottleneck
- If fast route still spikes → issue is in controller/cache/DB

## 🔍 Troubleshooting

### If Fast Route is Still Slow:
**Possible Causes:**
1. Controller logic (pagination URLs, collection operations)
2. Cache stampede (multiple requests recomputing)
3. Database queries (even on cache HIT, some queries may run)
4. Redis latency (unlikely, but possible)

**Next Steps:**
- Profile controller execution time
- Check Redis latency
- Review cache stampede protection

### If Fast Route is Fast but Normal Route is Slow:
**Bottleneck Identified:** Middleware

**Likely Culprits:**
1. **File Logging** - `DisableFileLoggingForApi` should fix this
2. **Throttle** - Rate limiting may have overhead
3. **RequestTimeline/PerformanceProfiler** - Profiling overhead
4. **Debugbar** - Already disabled, but verify

**Fix:**
- Apply fast route middleware to normal route
- Or remove problematic middleware one-by-one

## 📋 Verification Checklist

- [x] `DisableFileLoggingForApi` middleware created and added to API group
- [x] `SESSION_DRIVER=redis` verified in docker-compose.yml
- [x] `CACHE_DRIVER=redis` verified in docker-compose.yml
- [x] Fast route `/api/all_products_fast` created
- [x] PHP compression removed from routes
- [x] Comparison benchmark script created
- [ ] Run comparison benchmark
- [ ] Analyze results and apply fixes

## 🎯 Success Criteria

After fixes:
- **Fast route:** Max < 800ms, Avg < 300ms (30 sequential requests)
- **Normal route:** Should match fast route after applying fixes
- **No spikes:** All requests stable, no 2-6s outliers

---

**Status:** ✅ Configuration files updated  
**Next:** Run comparison benchmark to identify exact bottleneck  
**Date:** 2026-02-09
