# Performance Fixes Implementation Guide

This document provides step-by-step instructions to implement the performance fixes identified in the audit.

## Phase 1: Quick Wins (1-2 days)

### ✅ Completed Fixes

1. **ArticleResource Pagination** - Added `defaultPaginationPageOption(25)`
2. **CommandeResource SMS Queue** - Changed from synchronous to queued SMS sending
3. **Search Indexes Migration** - Created migration for search column indexes
4. **Response Compression Middleware** - Created `CompressResponse` middleware
5. **Cache Headers Middleware** - Created `AddCacheHeaders` middleware
6. **API Routes Updated** - Added compression and cache headers to cached routes

### 🔧 Remaining Configuration Steps

#### 1. Run Database Migrations

```bash
cd filament
php artisan migrate
```

This will add:
- Search indexes on `products.designation_fr`
- Search indexes on `commandes.nom` and `commandes.prenom`
- Search indexes on `categories.designation_fr` and `sous_categories.designation_fr`

#### 2. Update Docker Compose (✅ Already Done)

The `docker-compose.yml` has been updated with:
- Redis service added
- Backend configured to use Redis for cache and queue
- Redis health checks configured

**Optional:** Add Redis password to `.env` (recommended for production):
```env
REDIS_PASSWORD=your_secure_password_here
```

#### 3. Restart Docker Containers

```bash
# Stop all containers
docker-compose down

# Start with new Redis service
docker-compose up -d

# Verify Redis is running
docker ps | grep redis
```

#### 4. Start Queue Workers (Inside Docker Container)

**Option A: Run Queue Worker in Container (Development)**

```bash
# Run queue worker in backend container
docker exec -it sobitas-backend php artisan queue:work --tries=3 --timeout=90
```

**Option B: Add Queue Worker as Separate Service (Production)**

Add to `docker-compose.yml`:
```yaml
queue-worker:
  build:
    context: ./filament
    dockerfile: Dockerfile
  container_name: sobitas-queue-worker
  restart: unless-stopped
  env_file:
    - .env
  environment:
    DB_CONNECTION: mysql
    DB_HOST: mysql
    DB_PORT: 3306
    DB_DATABASE: ${MYSQL_DATABASE:-protein_db}
    DB_USERNAME: ${MYSQL_USER:-laravel}
    DB_PASSWORD: ${MYSQL_PASSWORD:-secret}
    REDIS_HOST: redis
    REDIS_PASSWORD: ${REDIS_PASSWORD:-}
    REDIS_PORT: 6379
    QUEUE_CONNECTION: redis
  command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
  networks:
    - sobitas-net
  depends_on:
    - mysql
    - redis
  volumes:
    - ./filament:/var/www/html:delegated
```

#### 5. Verify Redis is Running

```bash
# Check Redis container
docker ps | grep redis

# Test Redis connection
docker exec -it sobitas-redis redis-cli ping
# Should return: PONG

# Test from backend container
docker exec -it sobitas-backend php artisan tinker
# Then in tinker:
Cache::put('test', 'value', 60);
Cache::get('test'); // Should return 'value'
```

#### 6. Clear and Rebuild Cache (Inside Docker)

```bash
# Clear all caches
docker exec -it sobitas-backend php artisan config:clear
docker exec -it sobitas-backend php artisan cache:clear
docker exec -it sobitas-backend php artisan route:clear
docker exec -it sobitas-backend php artisan view:clear

# Rebuild caches
docker exec -it sobitas-backend php artisan config:cache
docker exec -it sobitas-backend php artisan route:cache
```

#### 7. Test the Fixes

1. **Test Compression:**
   ```bash
   curl -H "Accept-Encoding: gzip" -I http://localhost:8080/api/categories
   # Should see: Content-Encoding: gzip
   ```

2. **Test Cache Headers:**
   ```bash
   curl -I http://localhost:8080/api/categories
   # Should see: Cache-Control: public, max-age=300
   ```

3. **Test Queue:**
   - Send an SMS from CommandeResource (via http://localhost:8080/admin)
   - Check Redis queue: `docker exec -it sobitas-redis redis-cli LLEN queues:default`
   - Verify queue worker processes it

4. **Test Indexes:**
   ```bash
   docker exec -it sobitas-mysql mysql -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} -e "EXPLAIN SELECT * FROM products WHERE designation_fr LIKE '%test%';"
   # Should show: key: idx_products_designation_search
   ```

---

## Phase 2: Medium Priority (1-2 weeks)

### 2.1 Add Laravel Telescope (Local Development Only)

```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

Update `.env`:
```env
TELESCOPE_ENABLED=true  # Only in local
```

**⚠️ Important:** Never enable Telescope in production! It has significant overhead.

### 2.2 Optimize Search Queries

The current `LIKE "%term%"` queries are still slow even with indexes. Consider:

**Option A: MySQL Full-Text Search**

1. Add full-text index:
```sql
ALTER TABLE products ADD FULLTEXT INDEX ft_designation (designation_fr);
```

2. Update `ApisController::searchProduct()`:
```php
$products = Product::whereRaw("MATCH(designation_fr) AGAINST(? IN BOOLEAN MODE)", [$text])
    ->where('publier', 1)
    ->select(self::PRODUCT_FULL_LIST_COLUMNS)
    ->limit(50)
    ->get();
```

**Option B: External Search Engine (Recommended for Large Datasets)**

- **Algolia** - Easy integration, free tier available
- **Meilisearch** - Open source, self-hosted
- **Elasticsearch** - Most powerful, complex setup

### 2.3 Add API Rate Limiting

Already configured via `throttle:api` middleware. Adjust in `RouteServiceProvider`:

```php
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});
```

### 2.4 Add Query Logging for Slow Queries

Add to `AppServiceProvider::boot()`:

```php
if (app()->environment('local')) {
    DB::listen(function ($query) {
        if ($query->time > 100) { // Log queries > 100ms
            Log::warning('Slow query detected', [
                'sql' => $query->sql,
                'bindings' => $query->bindings,
                'time' => $query->time . 'ms',
            ]);
        }
    });
}
```

---

## Phase 3: Long-term (1+ month)

### 3.1 Implement API Resources/Transformers

Create API Resources for consistent response formatting:

```bash
php artisan make:resource ProductResource
php artisan make:resource ProductCollection
```

### 3.2 Set Up Monitoring

- **Laravel Pulse** (Laravel 11+): Built-in monitoring
- **New Relic / Datadog**: APM tools
- **Sentry**: Error tracking

### 3.3 Database Optimization

1. Analyze slow query log:
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1; -- Log queries > 1 second
```

2. Run `EXPLAIN` on all slow queries
3. Add missing indexes based on query patterns
4. Consider read replicas for heavy read operations

### 3.4 CDN Setup

- Use CloudFlare or similar for static assets
- Configure CDN to cache API responses (with proper headers)

---

## Performance Monitoring

### Key Metrics to Track

1. **TTFB (Time To First Byte)**
   - Target: <500ms for Filament pages
   - Target: <200ms for API endpoints

2. **Database Query Count**
   - Target: <10 queries per Filament page
   - Target: <5 queries per API endpoint

3. **Database Query Time**
   - Target: <100ms total per request

4. **Memory Usage**
   - Target: <50MB peak per request

5. **Response Size**
   - Target: <500KB (with compression)

### Tools

- **Laravel Telescope** (local only)
- **Laravel Debugbar** (local only)
- **Laravel Pulse** (production)
- **MySQL Slow Query Log**
- **New Relic / Datadog** (APM)

---

## Troubleshooting

### Issue: Queue Jobs Not Processing

1. Check queue worker is running: `docker ps | grep queue-worker` (if using separate service)
2. Check failed jobs: `docker exec -it sobitas-backend php artisan queue:failed`
3. Check queue connection: `docker exec -it sobitas-backend php artisan queue:listen --verbose`
4. Check Redis queue: `docker exec -it sobitas-redis redis-cli LLEN queues:default`
5. View queue jobs: `docker exec -it sobitas-redis redis-cli LRANGE queues:default 0 -1`

### Issue: Redis Connection Failed

1. Verify Redis container is running: `docker ps | grep redis`
2. Check Redis logs: `docker logs sobitas-redis`
3. Verify network connectivity: `docker exec -it sobitas-backend ping redis`
4. Test connection: `docker exec -it sobitas-backend php artisan tinker` → `Cache::put('test', 'value')`
5. Check environment variables: `docker exec -it sobitas-backend env | grep REDIS`

### Issue: Compression Not Working

1. Check PHP extensions: `php -m | grep -i gzip`
2. Check middleware is registered in `Kernel.php`
3. Verify Accept-Encoding header in request

### Issue: Cache Headers Not Set

1. Verify middleware is applied to routes
2. Check response is 200 status
3. Verify middleware is registered correctly

---

## Expected Performance Improvements

After implementing Phase 1 fixes:

- **Filament Admin**: 60-80% faster (2-5s → 0.5-1.5s)
- **API Endpoints**: 40-60% faster (500ms-2s → 200ms-800ms)
- **Database Queries**: 90-95% faster with indexes
- **Response Size**: 60-80% smaller with compression
- **Queue Operations**: 99% faster (non-blocking)

---

## Next Steps

1. ✅ Complete Phase 1 configuration steps above
2. Measure baseline performance
3. Implement Phase 1 fixes
4. Measure improvements
5. Proceed to Phase 2 based on remaining bottlenecks
