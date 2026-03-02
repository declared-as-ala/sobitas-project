# PHP-FPM Optimization Guide

## ✅ Implemented Fixes

### 1. Disabled Debugbar for API Routes
**Files:**
- `filament/config/debugbar.php` - Added `'api/*'` to `except` array
- `filament/app/Http/Middleware/DisableDebugbarForApi.php` - New middleware to force disable
- `filament/app/Http/Kernel.php` - Added middleware to API group

**Impact:** Removes 50-200ms overhead per API request

### 2. PHP-FPM Status & Slowlog
**Files:**
- `filament/docker/php-fpm/www.conf` - Configured status path and slowlog
- `filament/docker/php-fpm/php-fpm.conf` - Main PHP-FPM config
- `nginx/laravel.conf` - Added `/status` endpoint (internal only)

**Configuration:**
```ini
pm.status_path = /status
request_slowlog_timeout = 1s
slowlog = /var/log/php-fpm/slow.log
```

**Access Status:**
```bash
# From host (via nginx)
curl http://localhost:8080/status

# From inside container
curl http://localhost:9000/status
```

### 3. PHP-FPM Pool Tuning
**File:** `filament/docker/php-fpm/www.conf`

**Settings:**
```ini
pm = dynamic
pm.max_children = 50        # Max worker processes
pm.start_servers = 10        # Initial workers
pm.min_spare_servers = 5     # Minimum idle workers
pm.max_spare_servers = 20    # Maximum idle workers
pm.max_requests = 500        # Recycle workers after 500 requests
```

**Rationale:**
- `max_children = 50`: Based on container memory (512MB PHP memory limit)
- `max_requests = 500`: Prevents memory leaks from accumulating
- Dynamic pool: Scales based on load

### 4. Middleware Audit
**File:** `filament/tests/audit_middleware.php`

**Run:**
```bash
docker exec sobitas-backend php tests/audit_middleware.php
```

**Lists:**
- Global middleware (runs on all requests)
- API middleware group
- Route-specific middleware
- Known performance blockers

## 📊 Monitoring PHP-FPM

### Check Status
```bash
# Get PHP-FPM status
curl http://localhost:8080/status

# Expected output:
# pool:                 www
# process manager:      dynamic
# start time:           09/Feb/2026:22:30:00
# accepted conn:        1234
# listen queue:         0
# max listen queue:     5
# listen queue len:     128
# idle processes:       8
# active processes:     2
# total processes:      10
# max active processes: 15
# max children reached: 0
```

### Check Slowlog
```bash
# View slow requests
docker exec sobitas-backend tail -f /var/log/php-fpm/slow.log

# Look for:
# - Requests taking > 1 second
# - "max children reached" messages
# - High "listen queue" values
```

### Key Metrics to Monitor

1. **listen queue**: Should be 0. If > 0, requests are waiting
2. **max children reached**: Should be 0. If > 0, increase `pm.max_children`
3. **active processes**: Should be < `pm.max_children`
4. **idle processes**: Should be between `min_spare_servers` and `max_spare_servers`

## 🔧 Troubleshooting

### Issue: High "listen queue"
**Symptom:** `listen queue > 0` in status
**Fix:** Increase `pm.max_children` or `pm.start_servers`

### Issue: "max children reached"
**Symptom:** `max children reached > 0` in status
**Fix:** Increase `pm.max_children` (check container memory first)

### Issue: Slow requests in slowlog
**Symptom:** Many entries in `/var/log/php-fpm/slow.log`
**Fix:** 
- Check slowlog for patterns
- May indicate blocking middleware or DB queries
- Review middleware audit results

## 📋 Next Steps

1. **Rebuild Docker container:**
   ```bash
   docker-compose build backend
   docker-compose up -d backend
   ```

2. **Verify PHP-FPM status:**
   ```bash
   curl http://localhost:8080/status
   ```

3. **Run middleware audit:**
   ```bash
   docker exec sobitas-backend php tests/audit_middleware.php
   ```

4. **Run parallel benchmark:**
   ```powershell
   .\filament\tests\benchmark_parallel.ps1
   ```

5. **Monitor slowlog:**
   ```bash
   docker exec sobitas-backend tail -f /var/log/php-fpm/slow.log
   ```

## 🎯 Expected Results

After fixes:
- **Cache HIT requests:** < 400ms (target: < 300ms)
- **10 parallel requests:** Max < 1s
- **30 sequential requests:** All < 400ms
- **PHP-FPM status:** `listen queue = 0`, `max children reached = 0`

---

**Status:** ✅ Configuration files created  
**Next:** Rebuild container and run benchmarks
