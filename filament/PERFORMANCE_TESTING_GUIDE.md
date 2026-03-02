# Performance Testing & Verification Guide

This guide shows you how to measure and verify that the performance optimizations are working.

## 🎯 Quick Performance Tests

### 1. Test Redis Cache (Immediate Verification)

```powershell
# Test cache speed
docker exec -it sobitas-backend php artisan tinker

# Then in tinker:
$start = microtime(true);
Cache::put('test', 'data', 60);
$time = (microtime(true) - $start) * 1000;
echo "Cache write: {$time}ms\n";

$start = microtime(true);
Cache::get('test');
$time = (microtime(true) - $start) * 1000;
echo "Cache read: {$time}ms\n";
```

**Expected:** < 5ms (vs 50-100ms with file cache)

### 2. Test API Response Time

```powershell
# Test API endpoint response time
Measure-Command { Invoke-WebRequest -Uri "http://localhost:8080/api/categories" -UseBasicParsing }

# Or with curl (if available)
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8080/api/categories"
```

Create `curl-format.txt`:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

**Expected:** < 200ms for cached endpoints

### 3. Test Filament Admin Page Load

```powershell
# Open browser DevTools (F12) → Network tab
# Navigate to: http://localhost:8080/admin
# Check "Load" time in Network tab
```

**Expected:** < 1.5s (vs 2-5s before)

### 4. Test Database Query Performance

```powershell
# Enable query logging
docker exec -it sobitas-backend php artisan tinker

# Then:
DB::enableQueryLog();
Product::where('publier', 1)->with('brand')->limit(25)->get();
$queries = DB::getQueryLog();
foreach ($queries as $query) {
    echo "Time: {$query['time']}ms - SQL: {$query['query']}\n";
}
```

**Expected:** < 20ms per query (with indexes)

---

## 📊 Comprehensive Performance Monitoring

### Method 1: Laravel Debugbar (Local Development)

Debugbar is already installed. Just enable it:

1. Visit: `http://localhost:8080/admin`
2. Debugbar appears at bottom
3. Click to see:
   - **Queries:** Count and time
   - **Timeline:** Request breakdown
   - **Memory:** Peak usage

**Key Metrics to Check:**
- Query count: Should be < 10 for list pages
- Total query time: Should be < 100ms
- Memory usage: Should be < 50MB
- Total request time: Should be < 500ms

### Method 2: Browser DevTools

1. Open `http://localhost:8080/admin` in Chrome/Firefox
2. Press F12 → Network tab
3. Reload page (Ctrl+R)
4. Check:
   - **TTFB (Time To First Byte):** < 500ms
   - **DOMContentLoaded:** < 1.5s
   - **Load:** < 2s

### Method 3: API Response Headers

```powershell
# Check compression
$response = Invoke-WebRequest -Uri "http://localhost:8080/api/categories" -UseBasicParsing
$response.Headers["Content-Encoding"]  # Should be: gzip or br

# Check cache headers
$response.Headers["Cache-Control"]     # Should be: public, max-age=300
```

### Method 4: Database Query Analysis

```powershell
# Connect to MySQL
docker exec -it sobitas-mysql mysql -u${env:MYSQL_USER} -p${env:MYSQL_PASSWORD} ${env:MYSQL_DATABASE}

# Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.1;  # Log queries > 100ms

# Run some operations in Filament admin, then check:
SHOW VARIABLES LIKE 'slow_query_log_file';
# Then view the log file
```

### Method 5: Redis Monitoring

```powershell
# Check Redis stats
docker exec -it sobitas-redis redis-cli INFO stats

# Monitor Redis commands in real-time
docker exec -it sobitas-redis redis-cli MONITOR

# Check cache keys
docker exec -it sobitas-redis redis-cli KEYS "*cache*"
```

---

## 📈 Before/After Comparison

### Create a Performance Test Script

Create `filament/tests/performance_test.php`:

```php
<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Performance Test ===\n\n";

// Test 1: Cache Performance
echo "1. Cache Performance:\n";
$start = microtime(true);
for ($i = 0; $i < 100; $i++) {
    \Illuminate\Support\Facades\Cache::put("test_{$i}", "value_{$i}", 60);
    \Illuminate\Support\Facades\Cache::get("test_{$i}");
}
$time = (microtime(true) - $start) * 1000;
echo "   100 cache operations: {$time}ms ({$time/100}ms per operation)\n\n";

// Test 2: Database Query Performance
echo "2. Database Query Performance:\n";
\Illuminate\Support\Facades\DB::enableQueryLog();
$start = microtime(true);
\App\Models\Product::where('publier', 1)
    ->with(['brand', 'sousCategorie'])
    ->limit(25)
    ->get();
$time = (microtime(true) - $start) * 1000;
$queries = \Illuminate\Support\Facades\DB::getQueryLog();
echo "   Products query: {$time}ms\n";
echo "   Query count: " . count($queries) . "\n";
echo "   Total query time: " . array_sum(array_column($queries, 'time')) . "ms\n\n";

// Test 3: API Endpoint Simulation
echo "3. API Endpoint Performance:\n";
$start = microtime(true);
$controller = new \App\Http\Controllers\Api\ApisController();
$response = $controller->categories(new \Illuminate\Http\Request());
$time = (microtime(true) - $start) * 1000;
echo "   Categories endpoint: {$time}ms\n\n";

echo "=== Test Complete ===\n";
```

Run it:
```powershell
docker exec -it sobitas-backend php tests/performance_test.php
```

---

## 🔍 Key Metrics to Track

### Filament Admin Pages

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Page Load Time | 2-5s | < 1.5s | Browser DevTools Network tab |
| Query Count | 20-50+ | < 10 | Laravel Debugbar |
| Query Time | 500ms+ | < 100ms | Laravel Debugbar |
| Memory Usage | 100MB+ | < 50MB | Laravel Debugbar |
| TTFB | 1-3s | < 500ms | Browser DevTools |

### API Endpoints

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Response Time | 500ms-2s | < 200ms | `Measure-Command` or curl |
| Response Size | 500KB+ | < 200KB | Browser DevTools |
| Cache Hit Rate | 0% | > 80% | Redis monitoring |
| Compression | None | gzip/br | Response headers |

### Database

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Query Time | 500ms+ | < 20ms | EXPLAIN + query log |
| Full Table Scans | Many | 0 | EXPLAIN |
| Index Usage | Low | High | EXPLAIN |

---

## 🧪 Automated Performance Tests

### Test Script: `filament/tests/performance_benchmark.php`

```php
<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

function benchmark($name, $callback) {
    $start = microtime(true);
    $memoryStart = memory_get_usage();
    $result = $callback();
    $time = (microtime(true) - $start) * 1000;
    $memory = (memory_get_usage() - $memoryStart) / 1024 / 1024;
    
    echo sprintf("%-40s %8.2f ms  %6.2f MB\n", $name, $time, $memory);
    return $result;
}

echo "Performance Benchmark\n";
echo str_repeat("=", 60) . "\n";
echo sprintf("%-40s %10s  %10s\n", "Test", "Time", "Memory");
echo str_repeat("-", 60) . "\n";

// Test 1: Cache operations
benchmark("Cache: 100 write/read operations", function() {
    for ($i = 0; $i < 100; $i++) {
        \Cache::put("test_{$i}", "value", 60);
        \Cache::get("test_{$i}");
    }
});

// Test 2: Database queries
benchmark("DB: Products with relations (25)", function() {
    \App\Models\Product::where('publier', 1)
        ->with(['brand', 'sousCategorie'])
        ->limit(25)
        ->get();
});

// Test 3: Commandes list
benchmark("DB: Commandes list (25)", function() {
    \App\Models\Commande::limit(25)->get();
});

// Test 4: API controller method
benchmark("API: Categories endpoint", function() {
    $controller = new \App\Http\Controllers\Api\ApisController();
    return $controller->categories(new \Illuminate\Http\Request());
});

echo str_repeat("=", 60) . "\n";
```

Run:
```powershell
docker exec -it sobitas-backend php tests/performance_benchmark.php
```

---

## 📊 Real-World Testing Scenarios

### Scenario 1: Filament Admin Dashboard

1. **Open Dashboard:**
   - URL: `http://localhost:8080/admin`
   - Open Browser DevTools (F12) → Network tab
   - Reload page
   - **Check:** Total load time should be < 1.5s

2. **Navigate to Products:**
   - Click "Products" in sidebar
   - **Check:** Page loads in < 1s
   - **Check:** Debugbar shows < 10 queries

3. **Search Products:**
   - Type in search box
   - **Check:** Results appear in < 500ms

### Scenario 2: API Endpoints

```powershell
# Test cached endpoint
$times = @()
1..10 | ForEach-Object {
    $time = (Measure-Command { 
        Invoke-WebRequest -Uri "http://localhost:8080/api/categories" -UseBasicParsing 
    }).TotalMilliseconds
    $times += $time
    Write-Host "Request $_: $time ms"
}
$avg = ($times | Measure-Object -Average).Average
Write-Host "Average: $avg ms"
```

**Expected:** First request ~200ms, subsequent requests < 50ms (cached)

### Scenario 3: Queue Performance

```powershell
# Dispatch a job and measure time
docker exec -it sobitas-backend php artisan tinker

# Then:
$start = microtime(true);
\App\Jobs\SendSmsJob::dispatch('123456789', 'Test message');
$time = (microtime(true) - $start) * 1000;
echo "Job dispatched in: {$time}ms\n";
```

**Expected:** < 10ms (vs 1-3s with sync queue)

---

## 🎯 Performance Checklist

### ✅ Quick Verification (5 minutes)

- [ ] Redis cache working: `Cache::put('test', 'ok')` succeeds
- [ ] API response compressed: Check `Content-Encoding` header
- [ ] Cache headers present: Check `Cache-Control` header
- [ ] Database indexes exist: Run `SHOW INDEXES FROM products;`
- [ ] Queue using Redis: Check `QUEUE_CONNECTION=redis` in env

### ✅ Detailed Testing (30 minutes)

- [ ] Filament pages load < 1.5s
- [ ] API endpoints respond < 200ms
- [ ] Query count < 10 per page
- [ ] Query time < 100ms total
- [ ] Memory usage < 50MB
- [ ] Response compression working
- [ ] Cache hit rate > 80%

### ✅ Monitoring Setup (1 hour)

- [ ] Laravel Debugbar enabled (local)
- [ ] Slow query log enabled
- [ ] Redis monitoring active
- [ ] Performance baseline recorded
- [ ] Performance test script created

---

## 📈 Expected Improvements Summary

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| **Cache Operations** | 50-100ms | 1-5ms | **95% faster** |
| **Queue Jobs** | Blocks 1-3s | < 10ms | **99% faster** |
| **Database Queries** | 500ms+ (full scan) | 5-20ms (index) | **95% faster** |
| **API Response** | 500ms-2s | 200ms-800ms | **40-60% faster** |
| **Filament Pages** | 2-5s | 0.5-1.5s | **60-80% faster** |
| **Response Size** | 500KB+ | 100-200KB | **60-80% smaller** |

---

## 🔧 Tools for Continuous Monitoring

### 1. Browser DevTools (Built-in)
- Network tab: Response times, sizes
- Performance tab: Page load breakdown
- Memory tab: Memory usage

### 2. Laravel Debugbar (Local)
- Query count and time
- Memory usage
- Timeline

### 3. Redis CLI
```powershell
# Monitor commands
docker exec -it sobitas-redis redis-cli MONITOR

# Check stats
docker exec -it sobitas-redis redis-cli INFO stats
```

### 4. MySQL Slow Query Log
```sql
-- Enable in MySQL
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.1;
```

### 5. Laravel Telescope (Optional - Install Later)
```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

---

## 📝 Performance Report Template

After testing, document your results:

```
Performance Test Results - [Date]

Environment: Docker (Local)
Laravel: 12.0
Filament: 4.0

=== Cache Performance ===
Redis: ✅ Working
Cache write: X ms
Cache read: X ms

=== Database Performance ===
Indexes: ✅ Installed
Query count (Products page): X queries
Total query time: X ms
Average query time: X ms

=== API Performance ===
Categories endpoint: X ms (first) / X ms (cached)
Response compression: ✅ Working
Cache headers: ✅ Present

=== Filament Admin ===
Dashboard load: X s
Products page: X s
Query count: X queries
Memory usage: X MB

=== Overall ===
Status: ✅ All optimizations working
Improvement: X% faster than baseline
```

---

**Next Steps:**
1. Run the quick tests above
2. Compare with baseline (if you have one)
3. Document improvements
4. Set up continuous monitoring
