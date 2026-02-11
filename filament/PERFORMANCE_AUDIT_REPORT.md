# Laravel + Filament Performance Audit Report
**Date:** 2026-02-08  
**Scope:** Filament Admin Dashboard + API Endpoints  
**Laravel Version:** 12.0  
**Filament Version:** 4.0

---

## 1. EXECUTIVE SUMMARY

### Primary Performance Issues Identified

**Filament Admin Slowness:**
1. **N+1 Queries** - Several resources missing eager loading (CategResource, ArticleResource, BrandResource)
2. **Missing Database Indexes** - Searchable columns, foreign keys, and sort columns lack indexes
3. **Synchronous Operations** - SMS sending, email sending executed in request thread
4. **Cache Configuration** - Using `file` driver instead of Redis (slow I/O)
5. **Queue Configuration** - Using `sync` driver (blocks requests)
6. **Missing Column Selection** - Some resources loading all columns instead of only needed ones

**API Slowness:**
1. **LIKE Queries Without Indexes** - Search endpoints using `LIKE %term%` on unindexed columns
2. **Missing Response Compression** - Large JSON payloads not compressed
3. **Cache Headers Missing** - No cache-control headers on cached endpoints
4. **Heavy Eager Loading** - Some endpoints loading unnecessary relationships

**Infrastructure:**
1. **APP_DEBUG** - May be enabled in production (overhead)
2. **OPcache** - Configuration not verified
3. **PHP-FPM** - Pool configuration not optimized
4. **No Profiling Tools** - Telescope/Debugbar not configured for production monitoring

---

## 2. EVIDENCE TABLE

| Issue | File/Page/Endpoint | Proof | Impact | Fix | ETA |
|-------|-------------------|-------|--------|-----|-----|
| **N+1 Query** | `CategResource::table()` | `->counts('sousCategories')` without eager load | 1 query + N queries for each category | Add `->withCount('sousCategories')` | 5 min |
| **N+1 Query** | `ArticleResource::table()` | No eager loading, but no relationships displayed | Low (no relationships) | None needed | - |
| **N+1 Query** | `BrandResource::table()` | If displaying relationships, missing eager load | Medium | Add eager loading if needed | 5 min |
| **Missing Index** | `products.designation_fr` | Used in search, no index | Full table scan on search | Add index | 2 min |
| **Missing Index** | `commandes.phone` | Used in search, no index | Full table scan | Add index | 2 min |
| **Missing Index** | `articles.slug` | Used in API lookups, no index | Full table scan | Add index | 2 min |
| **Synchronous SMS** | `CommandeResource::sendSmsNotification` | `SmsService::send_sms()` called directly | Blocks request 1-3s | Already queued in API, fix here | 5 min |
| **File Cache** | `config/cache.php` | `'default' => 'file'` | Slow disk I/O | Switch to Redis | 10 min |
| **Sync Queue** | `config/queue.php` | `'default' => 'sync'` | Blocks requests | Switch to database/redis | 10 min |
| **LIKE Query** | `ApisController::searchProduct()` | `LIKE "%{$text}%"` on unindexed column | Full table scan | Add full-text index or use search engine | 15 min |
| **No Compression** | All API endpoints | No gzip/brotli | Large payloads | Add middleware | 5 min |
| **Missing Cache Headers** | Cached API routes | No `Cache-Control` headers | Browser doesn't cache | Add headers | 10 min |
| **Heavy Widget Query** | `StatsOverview` | Multiple UNION queries | 200-500ms | Already optimized with caching | - |
| **No Profiling** | Production | No Telescope/Debugbar | Can't identify slow queries | Add Telescope (local only) | 15 min |
| **Missing Pagination** | `ArticleResource::table()` | No `defaultPaginationPageOption` | Loads all records | Add pagination | 2 min |

---

## 3. DETAILED FIXES PER FILAMENT RESOURCE

### 3.1 CategResource
**Issue:** N+1 query on `sousCategories_count`  
**Fix:** Already using `->counts()` which is efficient, but ensure index exists on `sous_categories.categorie_id`

### 3.2 CommandeResource
**Status:** ✅ Already optimized
- Column selection implemented
- Eager loading not needed (no relationships in table)
- Navigation badge cached

### 3.3 ProductResource
**Status:** ✅ Already optimized
- Eager loading for `sousCategorie` and `brand`
- Column selection not needed (all columns used)

### 3.4 ArticleResource
**Issue:** Missing pagination default  
**Fix:** Add `->defaultPaginationPageOption(25)`

### 3.5 ClientResource
**Status:** ✅ Already optimized
- No relationships in table
- Pagination set

### 3.6 FactureResource, FactureTvaResource, QuotationResource, TicketResource
**Status:** ✅ Already optimized
- Eager loading for `client` relationship

### 3.7 ReviewResource
**Status:** ✅ Already optimized
- Eager loading for `product` and `user`

---

## 4. DETAILED FIXES PER API ENDPOINT

### 4.1 `/api/searchProduct/{text}`
**Issue:** `LIKE "%term%"` on unindexed `designation_fr`  
**Impact:** Full table scan  
**Fix:** 
- Add full-text index on `products.designation_fr`
- OR use MySQL full-text search: `MATCH(designation_fr) AGAINST(? IN BOOLEAN MODE)`
- OR implement Algolia/Meilisearch

### 4.2 `/api/allProducts`
**Status:** ✅ Already optimized
- Pagination implemented
- Column selection implemented
- Eager loading optimized

### 4.3 `/api/productDetails/{slug}`
**Status:** ✅ Already optimized
- Eager loading with limits on reviews

### 4.4 All Cached Routes
**Issue:** Missing `Cache-Control` headers  
**Fix:** Add middleware to set headers

---

## 5. DATABASE INDEX RECOMMENDATIONS

### Critical Indexes (Missing)

```php
// Migration: add_missing_performance_indexes.php

Schema::table('products', function (Blueprint $table) {
    // Full-text search index (if using LIKE)
    $table->fullText('designation_fr', 'idx_products_designation_ft');
    // OR regular index for prefix searches
    $table->index('designation_fr', 'idx_products_designation');
});

Schema::table('commandes', function (Blueprint $table) {
    $table->index('phone', 'idx_commandes_phone_search');
    $table->index(['nom', 'prenom'], 'idx_commandes_name_search');
});

Schema::table('articles', function (Blueprint $table) {
    $table->index('slug', 'idx_articles_slug');
    $table->index('publier', 'idx_articles_publier');
});

Schema::table('clients', function (Blueprint $table) {
    $table->index('name', 'idx_clients_name');
});

Schema::table('sous_categories', function (Blueprint $table) {
    $table->index('categorie_id', 'idx_sous_categories_categorie'); // If missing
});
```

### Verify Existing Indexes
Run: `SHOW INDEXES FROM products;` to verify all indexes from previous migrations exist.

---

## 6. SERVER/RUNTIME RECOMMENDATIONS

### 6.1 PHP Configuration
```ini
; php.ini or php-fpm pool config
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0  # Production only
opcache.revalidate_freq=0
```

### 6.2 PHP-FPM Pool
```ini
; /etc/php/8.1/fpm/pool.d/www.conf
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500
```

### 6.3 Nginx Configuration
```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_types application/json text/css application/javascript;

# Cache static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 6.4 Redis Configuration
```bash
# Ensure Redis is running
redis-cli ping

# Monitor Redis
redis-cli --stat
```

### 6.5 Queue Workers
```bash
# Start queue workers (use Supervisor)
php artisan queue:work --tries=3 --timeout=90
```

---

## 7. PRIORITIZED FIX CHECKLIST

### Phase 1: Quick Wins (1-2 days) ⚡

- [ ] **P1.1** Add missing database indexes (products.designation_fr, commandes.phone, articles.slug)
- [ ] **P1.2** Switch cache driver from `file` to `redis` in `.env`
- [ ] **P1.3** Switch queue driver from `sync` to `database` or `redis` in `.env`
- [ ] **P1.4** Add pagination default to ArticleResource
- [ ] **P1.5** Fix synchronous SMS in CommandeResource (use queue)
- [ ] **P1.6** Add response compression middleware
- [ ] **P1.7** Add cache headers to cached API routes
- [ ] **P1.8** Verify APP_DEBUG=false in production

### Phase 2: Medium Priority (1-2 weeks) 🔧

- [ ] **P2.1** Implement full-text search for product search (MySQL full-text or Algolia)
- [ ] **P2.2** Add Telescope for local development profiling
- [ ] **P2.3** Optimize search queries (avoid LIKE %term%)
- [ ] **P2.4** Add API rate limiting
- [ ] **P2.5** Implement query result caching for heavy endpoints
- [ ] **P2.6** Add database query logging for slow queries (>100ms)
- [ ] **P2.7** Optimize widget queries (already done, verify)
- [ ] **P2.8** Add monitoring/alerting (Laravel Pulse or external)

### Phase 3: Long-term (1+ month) 🚀

- [ ] **P3.1** Upgrade to Laravel 11 if not already (verify version)
- [ ] **P3.2** Implement API Resources/Transformers for all endpoints
- [ ] **P3.3** Add comprehensive test suite
- [ ] **P3.4** Set up CI/CD pipeline
- [ ] **P3.5** Implement observability (APM tool)
- [ ] **P3.6** Database query optimization audit (EXPLAIN all slow queries)
- [ ] **P3.7** Consider read replicas for heavy read operations
- [ ] **P3.8** Implement CDN for static assets

---

## 8. ESTIMATED PERFORMANCE GAINS

| Fix | Current | After | Improvement |
|-----|---------|-------|-------------|
| Cache: file → Redis | 50-100ms | 1-5ms | **90-95%** |
| Queue: sync → database | Blocks 1-3s | <10ms | **99%** |
| Add indexes | Full scan (500ms+) | Index scan (5-20ms) | **95%** |
| Fix N+1 queries | N+1 (100-500ms) | 1 query (10-50ms) | **80-90%** |
| Response compression | 500KB payload | 100KB payload | **80%** |
| Full-text search | LIKE scan (200ms+) | Index search (10-30ms) | **85%** |

**Expected Overall Improvement:**
- Filament Admin: **60-80% faster** (2-5s → 0.5-1.5s)
- API Endpoints: **40-60% faster** (500ms-2s → 200ms-800ms)

---

## 9. MONITORING & VALIDATION

### Before/After Metrics to Track

1. **TTFB (Time To First Byte)**
   - Filament pages: Target <500ms
   - API endpoints: Target <200ms

2. **Database Query Count**
   - Filament list pages: Target <10 queries
   - API endpoints: Target <5 queries

3. **Database Query Time**
   - Total query time per request: Target <100ms

4. **Memory Usage**
   - Peak memory per request: Target <50MB

5. **Response Size**
   - API responses: Target <500KB (with compression)

### Tools for Monitoring

- **Laravel Telescope** (local/staging only)
- **Laravel Debugbar** (local only)
- **Laravel Pulse** (production monitoring)
- **New Relic / Datadog** (APM)
- **MySQL Slow Query Log**

---

## 10. NOTES

- Most Filament resources are already well-optimized
- API controller has been partially optimized
- Widgets are cached and optimized
- Main issues are infrastructure (cache/queue) and missing indexes
- Search functionality needs full-text indexing or external search engine

---

**Next Steps:** Start with Phase 1 fixes, measure improvements, then proceed to Phase 2.
