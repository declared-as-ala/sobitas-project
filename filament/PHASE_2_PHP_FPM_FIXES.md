# Phase 2: PHP-FPM Queueing & Middleware Fixes

## ✅ Completed Fixes

### 1. Disabled Debugbar for API Routes ✅
**Problem:** Debugbar adds 50-200ms overhead per request, even on cache HITs

**Fixes Applied:**
- ✅ Added `'api/*'` to `config/debugbar.php` `except` array
- ✅ Created `DisableDebugbarForApi` middleware to force disable
- ✅ Added middleware to API group (runs first, before other middleware)

**Files Changed:**
- `filament/config/debugbar.php`
- `filament/app/Http/Middleware/DisableDebugbarForApi.php` (new)
- `filament/app/Http/Kernel.php`

**Verification:**
```bash
# Check that debugbar-id header is NOT present
curl -I http://localhost:8080/api/all_products | grep -i debugbar
# Should return nothing
```

### 2. PHP-FPM Status & Slowlog ✅
**Problem:** No visibility into PHP-FPM queueing/starvation

**Fixes Applied:**
- ✅ Created `docker/php-fpm/www.conf` with status and slowlog
- ✅ Created `docker/php-fpm/php-fpm.conf` main config
- ✅ Updated `Dockerfile` to copy PHP-FPM configs
- ✅ Updated `nginx/laravel.conf` to expose `/status` endpoint (internal only)

**Configuration:**
```ini
pm.status_path = /status
request_slowlog_timeout = 1s
slowlog = /var/log/php-fpm/slow.log
```

**Files Created:**
- `filament/docker/php-fpm/www.conf`
- `filament/docker/php-fpm/php-fpm.conf`
- Updated: `filament/Dockerfile`
- Updated: `nginx/laravel.conf`

**Access:**
```bash
# PHP-FPM status
curl http://localhost:8080/status

# Slowlog
docker exec sobitas-backend tail -f /var/log/php-fpm/slow.log
```

### 3. PHP-FPM Pool Tuning ✅
**Problem:** Default pool settings may cause queueing under load

**Fixes Applied:**
```ini
pm = dynamic
pm.max_children = 50        # Increased from default
pm.start_servers = 10       # Start with 10 workers
pm.min_spare_servers = 5    # Keep 5 idle
pm.max_spare_servers = 20   # Max 20 idle
pm.max_requests = 500       # Recycle workers (prevent leaks)
```

**Rationale:**
- `max_children = 50`: Based on 512MB PHP memory limit (50 * 10MB = 500MB)
- `max_requests = 500`: Prevents memory leaks from accumulating
- Dynamic pool: Scales based on load

**File:** `filament/docker/php-fpm/www.conf`

### 4. Middleware Audit Tools ✅
**Problem:** Need to identify blocking middleware

**Tools Created:**
- ✅ `filament/tests/audit_middleware.php` - Lists all middleware
- ✅ `filament/tests/benchmark_parallel.ps1` - Parallel + sequential benchmark

**Run:**
```bash
# Audit middleware
docker exec sobitas-backend php tests/audit_middleware.php

# Benchmark
.\filament\tests\benchmark_parallel.ps1
```

## 📋 Next Steps (Must Do)

### Step 1: Rebuild Docker Container
```bash
docker-compose build backend
docker-compose up -d backend
```

### Step 2: Verify PHP-FPM Status
```bash
# Check status endpoint works
curl http://localhost:8080/status

# Expected output should show:
# - pool: www
# - process manager: dynamic
# - listen queue: 0
# - max children reached: 0
```

### Step 3: Verify Debugbar Disabled
```bash
# Check headers (should NOT have X-Debugbar-*)
curl -I http://localhost:8080/api/all_products | grep -i debugbar
# Should return nothing
```

### Step 4: Run Middleware Audit
```bash
docker exec sobitas-backend php tests/audit_middleware.php
```

**Look for:**
- Any middleware that might block (StartSession, Debugbar, etc.)
- Middleware order (should be optimized)

### Step 5: Run Parallel Benchmark
```powershell
.\filament\tests\benchmark_parallel.ps1
```

**Expected Results:**
- **10 parallel requests:** Max TTFB < 1s
- **30 sequential requests:** All < 400ms
- **Cache HIT requests:** < 300ms

### Step 6: Monitor PHP-FPM During Benchmark
```bash
# In separate terminal, monitor status
watch -n 1 'curl -s http://localhost:8080/status | grep -E "listen queue|max children reached|active processes"'

# Monitor slowlog
docker exec sobitas-backend tail -f /var/log/php-fpm/slow.log
```

**Look for:**
- `listen queue > 0` (requests waiting)
- `max children reached > 0` (need more workers)
- Entries in slowlog (requests > 1s)

## 🔍 Troubleshooting

### If "listen queue > 0"
**Cause:** Not enough PHP-FPM workers
**Fix:** Increase `pm.max_children` or `pm.start_servers` in `www.conf`

### If "max children reached > 0"
**Cause:** All workers busy, requests queued
**Fix:** 
1. Check container memory: `docker stats sobitas-backend`
2. If memory OK, increase `pm.max_children`
3. If memory low, optimize PHP memory_limit or reduce max_children

### If slowlog shows many entries
**Cause:** Blocking operations (middleware, DB, file I/O)
**Fix:**
1. Review slowlog entries
2. Check middleware audit results
3. Disable/optimize blocking middleware

### If cache HIT still slow (> 400ms)
**Cause:** Blocking middleware or PHP-FPM queueing
**Fix:**
1. Check PHP-FPM status during request
2. Review middleware audit
3. Temporarily disable middleware one-by-one to find blocker

## 📊 Success Criteria

After all fixes:
- ✅ Debugbar disabled for API (no X-Debugbar-* headers)
- ✅ PHP-FPM status accessible at `/status`
- ✅ Slowlog working (`/var/log/php-fpm/slow.log`)
- ✅ 20 consecutive cache HIT calls < 400ms
- ✅ 10 parallel requests max < 1s
- ✅ PHP-FPM status shows `listen queue = 0`
- ✅ PHP-FPM status shows `max children reached = 0`

---

**Status:** ✅ All configuration files created  
**Next:** Rebuild container and run benchmarks  
**Date:** 2026-02-09
