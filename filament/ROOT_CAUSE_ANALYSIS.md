# Root Cause Analysis: /api/all_products Slow TTFB

## 📊 Evidence from Performance Profiler

**Date:** 2026-02-09 22:08:02

### Metrics:
- **TTFB (curl):** 2,297ms (2.3 seconds) ❌
- **PHP Execution Time:** 269ms ✅
- **Database Query Time:** 11ms ✅ (7 queries)
- **Time Outside Queries:** 258ms ⚠️
- **Response Size:** 17,372 bytes (17 KB)

### Query Breakdown:
1. `SELECT COUNT(*) FROM products WHERE publier = 1` - 2.95ms
2. `SELECT aromas...` (eager load) - 2.37ms
3. `SELECT products... ORDER BY created_at DESC LIMIT 20` - 1.92ms
4. `SELECT tags...` (eager load) - 1.21ms
5. `SELECT brands...` - 1.16ms
6. `SELECT DISTINCT categorie_id...` - 0.72ms
7. `SELECT categs...` - 0.67ms

**Total Query Time: 11ms** ✅ (Very fast!)

## 🔍 Root Cause Identified

### Problem: **Double Serialization in Middleware Stack**

The middleware stack is:
1. `PerformanceProfiler` (logs metrics)
2. `CompressResponse` (calls `getContent()` → serializes response)
3. `CacheApiResponse` (calls `getContent()` → serializes again)

**The Issue:**
- `CacheApiResponse` calls `getContent()` to serialize the response for caching (line 50)
- `CompressResponse` calls `getContent()` again to compress (line 30, 46)
- Each `getContent()` call triggers full JSON serialization of the 17KB response
- **Result:** Response is serialized 2-3 times, causing 2+ second delay

### Additional Issues:
1. **No composite index** for `(publier, created_at)` - the main query could be faster
2. **Pagination URL generation** - `url()` calls might be slow
3. **Middleware order** - Compression should happen AFTER caching, not before

## 💡 Solution

1. **Optimize middleware order** - Cache first, compress cached responses
2. **Cache serialized JSON string** - Avoid re-serialization on cache hits
3. **Skip compression for cached responses** - They're already processed
4. **Add composite index** - `(publier, created_at)` for faster sorting
5. **Optimize pagination URLs** - Cache or pre-generate

---

**Status:** Root cause identified. Implementing fixes now.
