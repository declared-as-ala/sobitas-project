<?php

/**
 * FILAMENT PERFORMANCE OPTIMIZATION - CODE FIXES
 * 
 * This file contains the specific code modifications needed for optimal performance.
 * Copy/apply these fixes to your resource files.
 */

// ============================================================================
// PATTERN 1: RESOURCE QUERY OPTIMIZATION
// ============================================================================
// Apply this pattern to ALL resources that show related data in tables

// BEFORE (Slow - N+1 queries):
/*
public static function table(Table $table): Table
{
    return $table
        ->columns([
            Tables\Columns\TextColumn::make('client.name'),  // N+1 queries!
        ]);
}
*/

// AFTER (Fast - Single query with eager loading):
/*
public static function table(Table $table): Table
{
    return $table
        ->modifyQueryUsing(fn (Builder $query) => $query
            ->select(['table.id', 'table.numero', 'table.client_id', ...])
            ->with('client:id,name')
        )
        ->columns([
            Tables\Columns\TextColumn::make('client.name'),  // Loaded once!
        ])
        ->defaultPaginationPageOption(25)
        ->paginationPageOptions([10, 25, 50])
}
*/

// ============================================================================
// PATTERN 2: FORM SELECT OPTIMIZATION
// ============================================================================
// For searchable selects, use server-side search instead of preloading all options

// BEFORE (Slow - Loads all 10,000 clients to browser):
/*
Forms\Components\Select::make('client_id')
    ->relationship('client', 'name')
    ->searchable()
    ->preload()  // SLOW!
*/

// AFTER (Fast - Server-side search with debounce):
/*
Forms\Components\Select::make('client_id')
    ->searchable()
    ->getSearchResultsUsing(fn (string $search): array => 
        Client::where('name', 'like', "%{$search}%")
            ->orWhere('email', 'like', "%{$search}%")
            ->select('id', 'name')
            ->limit(20)
            ->pluck('name', 'id')
            ->toArray()
    )
    ->getOptionLabelUsing(fn ($value): ?string => 
        Client::find($value)?->name
    )
    ->debounce(300)  // Wait 300ms between searches
    ->cached()  // Cache results for 5 minutes
*/

// ============================================================================
// PATTERN 3: WIDGET LAZY LOADING
// ============================================================================
// All non-critical widgets on dashboard should be lazy-loaded

// BEFORE (Dashboard takes 3-4 seconds to display):
/*
class StatsWidget extends ChartWidget
{
    // No lazy loading
    
    protected function getData(): array
    {
        // Expensive queries run BEFORE page renders
    }
}
*/

// AFTER (Dashboard shows in 1 second, detailed widgets load after):
/*
class StatsWidget extends ChartWidget
{
    protected static bool $isLazy = true;  // ✅ KEY: Lazy load this widget
    
    protected function getData(): array
    {
        // Queries run in background after page loads
        $cacheKey = 'widget:stats:' . now()->format('Ymd');
        
        return Cache::remember($cacheKey, 3600, function () {
            // Expensive computation here
        });
    }
}
*/

// ============================================================================
// PATTERN 4: WIDGET CACHING
// ============================================================================
// Cache expensive computations for 1 hour

// BEFORE (Every page view recalculates):
/*
protected function getData(): array
{
    return $this->expensiveCalculation();  // Runs every time
}

private function expensiveCalculation()
{
    return DB::table('sales')
        ->whereBetween('created_at', [$start, $end])
        ->get();
}
*/

// AFTER (Cached for 1 hour):
/*
protected function getData(): array
{
    $period = session('dashboard.period', '30d');
    $cacheKey = "dashboard:stats:{$period}:" . now()->format('Ymd');
    
    // ✅ Cache for 1 hour (3600 seconds)
    return Cache::remember($cacheKey, 3600, function () {
        return $this->expensiveCalculation();
    });
}

private function expensiveCalculation()
{
    return DB::table('sales')
        ->select('id', 'amount', 'created_at')  // ✅ Only needed columns
        ->whereBetween('created_at', [$this->start, $this->end])
        ->get();
}
*/

// ============================================================================
// PATTERN 5: DASHBOARD WIDGET REGISTRATION
// ============================================================================
// Register widgets in order: fast first, then deferred

// pages/Dashboard.php

/*
public function getWidgets(): array
{
    // ✅ INSTANT (no DB queries or minimal):
    $instant = [
        QuickActionsWidget::class,
        DashboardAlertsWidget::class,
    ];
    
    // ✅ DEFERRED (lazy-load, render after page):
    $deferred = [
        StatsOverview::class,               // Has protected static bool $isLazy = true;
        MarketplaceKpis::class,
        RevenueChart::class,
        TopCategoriesChart::class,
        MonthlyRevenueComparison::class,
        GeographicChart::class,
        RevenueBySourcePieChart::class,
        LatestCommandes::class,
        TopProductsWidget::class,
        TopCustomersTable::class,
    ];
    
    return array_merge($instant, $deferred);
}
*/

// ============================================================================
// PATTERN 6: INDEX QUERIES WITH RAW SQL (For Complex Aggregations)
// ============================================================================
// Use raw SQL for complex aggregations instead of Eloquent

// BEFORE (Slow - Loads all data to PHP):
/*
$stats = DB::table('commandes')
    ->where('created_at', '>=', $start)
    ->where('created_at', '<=', $end)
    ->get()
    ->groupBy('etat')
    ->map(fn ($group) => count($group));
*/

// AFTER (Fast - Aggregates in database):
/*
$stats = DB::table('commandes')
    ->select('etat', DB::raw('COUNT(*) as count'))
    ->whereBetween('created_at', [$start, $end])
    ->groupBy('etat')
    ->pluck('count', 'etat');
*/

// ============================================================================
// PATTERN 7: PAGINATION
// ============================================================================
// Set sensible defaults to reduce load

// In every resource table:
/*
->defaultPaginationPageOption(25)    // Default to 25 per page
->paginationPageOptions([10, 25, 50]) // Allow 10, 25, or 50 per page
*/

// DO NOT show 100+ records per page = SLOW.

// ============================================================================
// PATTERN 8: LIVEWIRE OPTIMIZATION
// ============================================================================
// Reduce component re-renders

// BEFORE (Re-renders on every keystroke):
/*
Forms\Components\TextInput::make('search')
    ->reactive()
    ->afterStateUpdated(fn ($state, $set) => $set('results', expensiveSearch($state)))
*/

// AFTER (Debounce search):
/*
Forms\Components\TextInput::make('search')
    ->reactive()
    ->debounce(500)  // ✅ Wait 500ms after user stops typing
    ->afterStateUpdated(fn ($state, $set) => $set('results', expensiveSearch($state)))
*/

// ============================================================================
// PATTERN 9: COLUMN SELECTION
// ============================================================================
// Always select only needed columns

// BEFORE (Fetches all columns including large text fields):
/*
$tickets = Ticket::all();  // Fetches: id, numero, description, notes, history, ...
*/

// AFTER (Fetch only what's needed):
/*
$tickets = Ticket::select('id', 'numero', 'type', 'client_id', 'created_at')
    ->with('client:id,name')
    ->get();
*/

// ============================================================================
// CONFIGURATION CHECKLIST
// ============================================================================
/*

1. .env / docker-compose (CRITICAL):
   ✅ APP_DEBUG=false
   ✅ CACHE_DRIVER=redis
   ✅ SESSION_DRIVER=redis
   ✅ QUEUE_CONNECTION=redis

2. Cache Configuration:
   ✅ php artisan config:cache
   ✅ php artisan route:cache
   ✅ php artisan view:cache

3. Database Indexes:
   ✅ Run: php artisan migrate
   ✅ Verify in MySQL: SHOW INDEX FROM table_name;

4. Asset Compilation:
   ✅ npm run build (in production)

5. Middleware Stack:
   ✅ AddCacheHeaders::class (in app/Http/Kernel.php)
   ✅ CompressResponse::class (in app/Http/Kernel.php)

6. Widget Optimization:
   ✅ All dashboard widgets have protected static bool $isLazy = true;
   ✅ All expensive queries are cached

7. Resource Optimization:
   ✅ All resources with relationships have ->with() or ->select()
   ✅ All resources use ->modifyQueryUsing()
   ✅ Foreign key lookups use server-side search

8. Monitoring:
   ✅ Performance logs enabled: storage/logs/performance.log
   ✅ Slow query threshold: 500ms for admin, 200ms for API

*/

// ============================================================================
// PERFORMANCE METRICS TO TRACK
// ============================================================================

/*

With full optimization, you should see:

BEFORE:  Dashboard: 3.2 seconds (80+ queries)
AFTER:   Dashboard: 0.8-1.2 seconds (20-25 queries)

BEFORE:  Tickets list: 2.1 seconds (50+ queries)
AFTER:   Tickets list: 0.4-0.6 seconds (8-12 queries)

BEFORE:  Product edit: 1.8 seconds (300KB response)
AFTER:   Product edit: 0.3-0.5 seconds (80KB response)

Query reduction:        60-80% fewer queries
Response size:          60-75% smaller (gzip)
Page interaction:       Instant (< 100ms)
Asset load:             50-150ms (from 300-500ms)

Check performance logs:
tail -f storage/logs/performance.log
*/

// ============================================================================
// EMERGENCY PERFORMANCE DEBUG
// ============================================================================

/*

If still slow after optimizations:

1. Check debug mode:
   php artisan tinker
   >>> config('app.debug')
   => false  (should be false)

2. Check cache driver:
   >>> config('cache.default')
   => "redis"  (should be redis)

3. Check query count:
   In storage/logs/performance.log, look for:
   "query_count": 80+  (BAD - indicates N+1 queries)
   "query_count": 15-25  (GOOD)

4. Profile slow queries:
   "slow_queries": [
       {
           "time_ms": 250,
           "query": "SELECT * FROM clients"  (SLOW - no select)
       }
   ]

5. Check for missing indexes:
   Look for WHERE clauses in slow queries
   Add indexes: ALTER TABLE table ADD INDEX idx_col (column);

*/
?>
