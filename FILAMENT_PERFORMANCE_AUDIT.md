# Filament Dashboard Performance Audit Report

**Date**: March 16, 2026  
**Issue**: Dashboard pages take 3+ seconds to load  
**Root Cause**: Multiple performance bottlenecks identified

## Performance Issues Found

### 🔴 CRITICAL - Select Field Preloading (Forms Load Slowly)

**Problem**: Multiple resources use `.preload()` without pagination
- This loads ALL records at once on/form load
- Sends large JSON payloads to browser
- Blocks form rendering

**Affected Files**:
1. ProductResource.php - lines 50, 55, 159, 164 (4x preload)
2. CreditNoteResource.php - line 49 (1x preload)
3. ReviewResource.php - lines 31, 36 (2x preload)
4. SousCategoryResource.php - line 41 (1x preload)

**Total**: 8 Select fields using `.preload()`

---

### 🔴 CRITICAL - Non-Lazy Dashboard Widgets

**Problem**: Heavy widgets load immediately on dashboard page
- Dashboard loads 14+ widgets (many doing database queries)
- Query results collected into Livewire component state
- Page render blocked until all widgets finish

**Non-Lazy Widgets** (load immediately):
1. `DashboardAlertsWidget` ($isLazy = false) - Counts rupture, low stock, etc.
2. `QuickActionsWidget` ($isLazy = false) - Just links, OK
3. `DashboardHeaderWidget` ($isLazy = false) - Filter header, OK
4. `ClientHistoriqueSearchWidget` ($isLazy = false) - Search input, likely OK

**Widgets without $isLazy** (default to eager load):
1. `StatsOverview` - DB queries, caching (120s)
2. `TopProductsWidget` - Complex UNION query, caching (300s)
3. `LatestCommandes` - Table query, paginated (10)
4. `MonthlyRevenueComparison` - Chart data query
5. `GeographicChart` - Geographic data query
6. Others without explicit lazy loading

---

### 🟡 MEDIUM - Widget Queries Not Optimized

**Problem**: Table widgets ( LatestCommandes, TopCustomersTable) 
- Running complex GROUP BY, JOIN queries
- TopCustomersTable uses complex LEFT JOIN + GROUP BY
- These execute on every page load

---

### 🟡 MEDIUM - Model Accessors / Appends

**Problem**: Models might have expensive accessors (getFullNameAttribute, etc.)
- Accessed in widget display/formatStateUsing callbacks
- N+1 issues possible if not eager loaded

---

### 🟡 MEDIUM - Livewire Component State Size

**Problem**: Dashboard component state might be large
- All widget data collected into Livewire state
- Serialized and sent to browser on every navigation
- SPA mode means repeated for every page

---

## Impact

- **First Page Load**: 3-5s (all widgets + queries)
- **SPA Navigation**: 1-3s (repeated Livewire requests)
- **Form Open**: 1-2s (preload SELECT fields block rendering)

---

## Fixes to Implement

### Fix 1: Remove `.preload()` from Select fields
Replace with `.searchable()` only for dynamic async search

### Fix 2: Make Heavy Widgets Lazy
Add `protected static bool $isLazy = true` to widgets

### Fix 3: Optimize Widget Queries
- Use select() to fetch only needed columns
- Eager load relationships
- Cache aggressively  

### Fix 4: Optimize DashboardAlertsWidget
- Cache the alerts calculation
- Reduce query count

---

