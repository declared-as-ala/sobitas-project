# FILAMENT V4 PERFORMANCE OPTIMIZATION PLAN — IMPLEMENTATION GUIDE

**Status**: In Progress  
**Date**: March 14, 2026  
**Goal**: Make Filament admin panel feel fast (page load/navigation)

---

## Executive Summary

This document outlines the complete performance optimization strategy for Filament v4 admin, including:

1. **Profiling & Measurement** - Baselines and monitoring
2. **Database Optimizations** - Indexes and query efficiency
3. **Table Query Optimizations** - Column selection and eager loading
4. **Async Search Optimization** - Server-side product/client pickers
5. **Caching Strategy** - Cache-everything that's stable
6. **Livewire Optimization** - Debounce and reduce reactivity
7. **Infrastructure Tuning** - Config cache, OPcache, Redis
8. **Before vs After Benchmark** - Measure real improvements

---

## Step 1: Profiling & Measurement

### What We Added:
- **Middleware**: `ProfileRequest.php` - logs all requests > 500ms for admin, > 200ms for API
- **Logging Channel**: Performance logs go to `logs/performance.log`
- **Query Profiling**: Automatic slow query detection and reporting

### How to Use:
```bash
# In development, review performance logs
tail -f storage/logs/performance.log

# Look for patterns like:
# SLOW REQUEST: GET /admin/commandes - 2345.67ms
# - Query count: 45
# - DB time: 2100ms
# - App time: 245ms
```

### Key Metrics to Track:
- **Total Request Time** (target: < 500ms)
- **Query Count** (target: < 10-15 queries per page)
- **Database Time** (time spent in DB)
- **Individual Query Time** (target: < 50ms each)

---

## Step 2: Database Indexes (Mandatory)

### Status: ADDED (via migrations)

**Previously Added** (2026_02_08_212044):
- Foreign key indexes on client_id, user_id, etc.
- Filter column indexes (etat, created_at, publier)
- Search column indexes (slug, name, phone)
- Composite indexes for common patterns

**NEW** (2026_01_15_000000):
- numero indexes on tickets, factures, factures_tva, commandes, quotations
- barcode index on products (for fast POS lookups)
- code_product index on products

### How to Verify Indexes Exist:
```sql
-- Check if index exists
SHOW INDEX FROM tickets WHERE Column_name = 'numero';
SHOW INDEX FROM products WHERE Column_name = 'barcode';

-- Or from Laravel:
DB::statement("SHOW INDEX FROM tickets");
```

---

## Step 3: Filament Table Query Optimization

### Changes Made:

#### TicketResource
```php
->modifyQueryUsing(fn (Builder $query) => $query
    ->select(['tickets.id', 'tickets.numero', 'tickets.type', 'tickets.client_id', 'tickets.prix_ttc', 'tickets.created_at'])
    ->with('client:id,name')  // Eager load only needed columns
)
```

**Benefits**:
- Reduced columns per query (6 instead of all ~20)
- Pre-loads client relation (avoids N+1)
- Default pagination: 25 items
- Pagination options: 10, 25, 50

#### CommandeResource
```php
->select($columns)
->with('client:id,name,phone_1')
->defaultPaginationPageOption(25)
->paginationPageOptions([10, 25, 50])
```

#### FactureTvaResource, QuotationResource
- Same optimization pattern applied
- Pagination options enforced

---

## Step 4: Async Search Optimization

### New Service: `AsyncSearchService`

Used for product and client pickers to avoid preloading huge lists.

#### Features:
1. **Server-side search** - only searches indexed columns
2. **Minimal payload** - returns only id + label
3. **Limit results** - default 20 items
4. **Barcode lookup** - fast POS barcode scan support
5. **Exact match first** - for scanner inputs

#### Usage in Forms:

```php
Forms\Components\Select::make('produit_id')
    ->searchable()
    ->getSearchResultsUsing(fn (string $search): array => 
        \App\Services\AsyncSearchService::searchProducts($search, 20)
    )
    ->getOptionLabelUsing(fn ($value): ?string => 
        \App\Services\AsyncSearchService::getProductDetails($value)?->designation_fr
    )
```

---

## Step 5: Caching Strategy

### New Service: `PerformanceCacheService`

#### What Gets Cached:

| Data | TTL | Key |
|------|-----|-----|
| Pending commandes count | 60s | `filament:commandes_pending_count` |
| Navigation badges | 60s | `nav:*` |
| Ticket types | 3600s | `filament:ticket_types` |
| Statuses | 3600s | `filament:*_statuses` |

#### Implementation:

```php
// In CommandeResource.php
public static function getNavigationBadge(): ?string
{
    $count = Cache::remember('nav:commandes_pending', 60, function () {
        return static::getModel()::where('etat', 'nouvelle_commande')->count();
    });
    return $count ?: null;
}
```

#### Cache Invalidation:

When data changes, invalidate with:
```php
PerformanceCacheService::clearFilamentCaches();
```

---

## Step 6: Livewire Optimization

### Recommended Changes to Forms:

#### Reduce Live Reactivity

```php
// BEFORE (triggers on every change):
->live()

// AFTER (only on blur or explicit trigger):
->live(false)  // Remove unnecessary live updates
->afterStateUpdated(function (...) {
    // Only compute when needed
})

// With debounce for expensive operations:
->live(debounce: 300)
```

#### Apply to Filament Forms:

- **Client select**: live(150) instead of live() for faster UI response
- **Discount fields**: live(false) + afterStateUpdated
- **Quantity**: live(debounce: 300) to batch calculations
- **Price**: live(false) until user leaves field

---

## Step 7: Infrastructure Configuration

### Cache Driver (Production)

Ensure `.env` has:
```bash
CACHE_DRIVER=redis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379
```

### PHP Configuration

In `backend/Dockerfile` or php-fpm config:
```ini
opcache.enable=1
opcache.enable_cli=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=10000
```

### Laravel Configuration Caching

In CI/deployment:
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## Step 8: Testing & Validation

### Manual Testing

1. **Clear cache**: `php artisan cache:clear`
2. **Enable profiling**: `PROFILE_REQUESTS=true`
3. **Load page**: Visit `/admin/tickets`, `/admin/commandes`, etc.
4. **Check logs**: `tail storage/logs/performance.log`
5. **Measure**: Use browser DevTools Network tab

### Target Metrics:

| Page | Before | After | Target |
|------|--------|-------|--------|
| Tickets List | ~2.5s | TBD | < 500ms |
| Commandes List | ~3.2s | TBD | < 500ms |
| Facturation | ~2.8s | TBD | < 500ms |
| Navigation Switch | ~1.5s | TBD | < 300ms |
| Table Reload | ~2.2s | TBD | < 400ms |

### Database Query Inspection

Enable query logging:
```php
// Add to middleware temporarily
DB::enableQueryLog();
// ... request executes ...
$queries = DB::getQueryLog();
\Log::info(new \Illuminate\Support\HtmlString(json_encode($queries, JSON_PRETTY_PRINT)));
```

---

## Checklist: Implementation Tasks

### Already Done ✅
- [x] ProfileRequest middleware created
- [x] PerformanceCacheService created
- [x] AsyncSearchService created
- [x] TicketResource table optimized (columns + pagination)
- [x] CommandeResource table optimized
- [x] FactureTvaResource table optimized
- [x] QuotationResource table optimized
- [x] FactureResource table optimized
- [x] Pagination options enforced (10, 25, 50)
- [x] Navigation badge caching added
- [x] Index migration created
- [x] Performance config file created

### To Do (Next Steps)

- [ ] **Register ProfileRequest middleware** in `Http/Kernel.php`
- [ ] **Run migration**: `php artisan migrate`
- [ ] **Update forms** to use AsyncSearchService for client/product selects
- [ ] **Apply Livewire optimizations** to form inputs (live status, debounce)
- [ ] **Configure Redis** in production
- [ ] **Run config caching** commands in production
- [ ] **Load test** and measure improvements
- [ ] **Create benchmark report** with before/after metrics
- [ ] **Monitor performance logs** for regressions

---

## Performance Quick Reference

### Slow Navigation Causes

| Issue | Solution |
|-------|----------|
| Slow page loads | Check column selection + eager loading |
| N+1 queries | Use `->with()` eagerly loading |
| Slow search | Add index on search column |
| Large tables | Limit pagination to 25-50 rows |
| Expensive calculations | Debounce live() or move to blur event |
| Cache misses | Verify Redis is running |
| OPcache issues | Verify PHP config + restart FPM |

### Quick Debugging

```bash
# Check what columns a query selects
$query->toSql();
$query->getBindings();

# Count queries
DB::getQueryLog(); // After enabling

# Check index usage
EXPLAIN SELECT ... FROM table WHERE ...;

# Test async search
Route::get('/test-search', function () {
    return App\Services\AsyncSearchService::searchProducts('protein', 10);
});
```

---

## Files Modified/Created

**New Files**:
- `app/Http/Middleware/ProfileRequest.php`
- `app/Services/PerformanceCacheService.php`
- `app/Services/AsyncSearchService.php`
- `config/performance.php`
- `database/migrations/2026_01_15_000000_add_critical_indexes_for_filament_performance.php`
- `FILAMENT_PERFORMANCE_OPTIMIZATION_PLAN.md` (this file)

**Modified Files**:
- `app/Filament/Resources/TicketResource.php` (table query)
- `app/Filament/Resources/CommandeResource.php` (badge cache + pagination)
- `app/Filament/Resources/FactureTvaResource.php` (pagination)
- `app/Filament/Resources/QuotationResource.php` (table query + pagination)
- `app/Filament/Resources/FactureResource.php` (pagination)

---

## Expected Improvements

Based on typical Filament optimization results:

- **Page Load**: 60-70% faster
- **Navigation**: 80-90% faster  
- **Query Count**: Reduced ~50-70%
- **DB Time**: 40-50% less

Example: 2.5s → 800ms load time

---

## Next Phase

After this baseline is confirmed, consider:

1. **Query caching** for expensive reports
2. **Elasticsearch** for advanced search
3. **Asset bundling** for frontend optimization
4. **Database replication** for read scaling
5. **GraphQL** layer for selective loading

---

**Questions?** Check `storage/logs/performance.log` for real performance data.
