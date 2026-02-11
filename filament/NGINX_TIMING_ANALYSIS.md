# Nginx Timing Analysis & Optimization

## 🔍 Problem

`/api/all_products_fast` is still slow (1.462s total) even though:
- Storage I/O is fixed (writes: 0.009s for 1000 writes) ✅
- PHP-FPM is not saturated (queue=0) ✅
- Laravel app logic is fast (X-Perf-NextMs ~137ms) ✅

**Missing time:** ~1.3s is outside controller code, likely in Nginx<->PHP-FPM communication.

## ✅ Fixes Applied

### 1. Added Detailed Timing Log Format ✅
**File:** `nginx/laravel.conf`

**New log format includes:**
- `rt=$request_time` - Total request time (Nginx perspective)
- `urt=$upstream_response_time` - Time to receive full response from PHP-FPM
- `uht=$upstream_header_time` - Time to receive first byte from PHP-FPM (TTFB)
- `uct=$upstream_connect_time` - Time to establish connection to PHP-FPM

**Usage:**
```nginx
log_format detailed_timing '$remote_addr - $remote_user [$time_local] '
    '"$request" $status $body_bytes_sent '
    'rt=$request_time '
    'urt=$upstream_response_time '
    'uht=$upstream_header_time '
    'uct=$upstream_connect_time ';

access_log /var/log/nginx/access.log detailed_timing;
```

### 2. Optimized FastCGI Settings for Low Latency ✅
**File:** `nginx/laravel.conf`

**Changes:**
- ✅ `fastcgi_buffering off` - Stream response immediately (no buffering delay)
- ✅ `fastcgi_keep_conn on` - Reuse connections (avoid handshake overhead)
- ✅ Reduced buffer sizes (4k instead of 16k) - Faster first byte
- ✅ Added `fastcgi_send_timeout` and `fastcgi_connect_timeout` - Better timeout control

**Before:**
```nginx
fastcgi_read_timeout 300;
fastcgi_buffers 16 16k;
fastcgi_buffer_size 32k;
```

**After:**
```nginx
fastcgi_buffering off;           # Stream immediately
fastcgi_keep_conn on;            # Reuse connections
fastcgi_buffer_size 4k;           # Smaller buffers
fastcgi_buffers 8 4k;            # Smaller buffers
fastcgi_busy_buffers_size 8k;    # Smaller busy buffers
fastcgi_read_timeout 60s;
fastcgi_send_timeout 60s;
fastcgi_connect_timeout 5s;
```

## 📊 Testing & Analysis

### Step 1: Restart Nginx
```bash
docker exec sobitas-backend-nginx nginx -t  # Test config
docker exec sobitas-backend-nginx nginx -s reload  # Reload config
```

### Step 2: Run Timing Test
```bash
# Make 10 requests and capture timing
docker exec sobitas-backend php tests/nginx_timing_test.php
```

### Step 3: Analyze Nginx Logs
```bash
# View last 20 requests with timing breakdown
docker exec sobitas-backend-nginx tail -n 20 /var/log/nginx/access.log | grep all_products_fast

# Or use analysis script
docker exec sobitas-backend-nginx bash /var/www/html/tests/analyze_nginx_logs.sh
```

### Step 4: Interpret Results

**If `urt` (upstream_response_time) is high:**
- PHP-FPM is slow
- Check PHP-FPM status: `curl http://localhost:8080/status`
- Check for slow queries in Laravel logs

**If `overhead` (rt - urt) is high:**
- Nginx buffering/handshake is slow
- Verify `fastcgi_buffering off` is applied
- Check `fastcgi_keep_conn on` is working

**If `uct` (upstream_connect_time) is high:**
- Connection establishment is slow
- Check network between containers
- Verify DNS resolution (sobitas-backend:9000)

**If `uht` (upstream_header_time) is high but `urt` is low:**
- PHP-FPM is fast but first byte delay
- Verify `fastcgi_buffering off` is working
- Check if PHP-FPM is waiting for something

## 🎯 Expected Results

After fixes:
- ✅ `urt` (upstream_response_time): < 200ms (PHP-FPM processing)
- ✅ `overhead` (rt - urt): < 50ms (Nginx overhead)
- ✅ `uct` (upstream_connect_time): < 10ms (connection establishment)
- ✅ Total TTFB: < 500ms (inside Docker and from host)

## 🔍 Troubleshooting

### Issue: Config Test Fails
**Symptom:** `nginx -t` fails

**Fix:**
```bash
# Check syntax
docker exec sobitas-backend-nginx nginx -t

# View error log
docker exec sobitas-backend-nginx cat /var/log/nginx/error.log
```

### Issue: Logs Not Showing Timing Fields
**Symptom:** Logs don't have `rt=`, `urt=`, etc.

**Fix:**
1. Verify log format is defined before `server` block
2. Verify `access_log` uses `detailed_timing` format
3. Reload Nginx: `docker exec sobitas-backend-nginx nginx -s reload`

### Issue: Still Slow After Fixes
**Possible Causes:**
1. PHP-FPM is actually slow (check `urt` in logs)
2. Network latency between containers (check `uct` in logs)
3. DNS resolution issues (verify `sobitas-backend:9000` resolves)

**Next Steps:**
- Analyze logs to identify exact bottleneck
- Check PHP-FPM status during requests
- Verify container networking

## 📋 Files Modified

- ✅ `nginx/laravel.conf` - Added timing log format, optimized fastcgi settings
- ✅ `filament/tests/nginx_timing_test.php` - New timing test script
- ✅ `filament/tests/analyze_nginx_logs.sh` - New log analysis script

---

**Status:** ✅ Configuration updated  
**Next:** Restart Nginx, run tests, analyze logs  
**Date:** 2026-02-09
