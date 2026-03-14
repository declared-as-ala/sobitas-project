return [
    /*
    |--------------------------------------------------------------------------
    | Performance Optimization Settings
    |--------------------------------------------------------------------------
    |
    | These settings control various performance optimizations for Filament
    | admin panel, including caching, query optimization, and Livewire tuning.
    |
    */

    'filament' => [
        // ── Caching Strategy ─────────────────────────────────────────────────
        'cache' => [
            // Enable caching for table lists (Filament tables)
            'enabled' => env('FILAMENT_TABLE_CACHE_ENABLED', true),

            // TTL in seconds for table list queries
            'ttl' => env('FILAMENT_TABLE_CACHE_TTL', 60),

            // Tags to use for easy cache invalidation
            'tags' => ['filament', 'lists'],

            // Clear cache after these operations
            'invalidate_on' => ['create', 'update', 'delete'],
        ],

        // ── Query Optimization ──────────────────────────────────────────────
        'queries' => [
            // Max items per page on list pages (prevent memory issues)
            'max_per_page' => env('FILAMENT_MAX_PER_PAGE', 100),

            // Default pagination option
            'default_per_page' => 25,

            // Pagination options available to users
            'per_page_options' => [10, 25, 50],

            // Enable query timing logs in dev
            'log_slow_queries' => env('FILAMENT_LOG_SLOW_QUERIES', true),

            // Slow query threshold in milliseconds
            'slow_query_threshold' => 50,
        ],

        // ── Async Selects (Product/Client Pickers) ──────────────────────────
        'async_selects' => [
            // Server-side search results limit
            'search_limit' => 20,

            // Debounce wait in ms (avoid requests on every keystroke)
            'debounce_ms' => 300,

            // Min characters before search (avoid small queries)
            'min_search_length' => 2,

            // Cache search results for this many seconds
            'cache_ttl' => 300,
        ],

        // ── Livewire Optimization ───────────────────────────────────────────
        'livewire' => [
            // Debounce default for live() inputs (ms)
            'debounce_ms' => 300,

            // Throttle debounce (ms) - waits before re-compute
            'throttle_ms' => 1000,

            // Enable component lazy loading
            'lazy_loading' => true,

            // Disable reactive totals refresh on every keystroke
            'disable_reactive_totals' => true,
        ],

        // ── Database ─────────────────────────────────────────────────────────
        'database' => [
            // Enable query logging for analysis
            'log_queries' => env('APP_DEBUG', false),

            // Read-only replicas (if available)
            'use_read_replica_for_lists' => false,

            // Connection name for read-heavy operations
            'read_connection' => 'mysql',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Middleware Settings
    |--------------------------------------------------------------------------
    |
    | Performance middleware settings for profiling and monitoring
    |
    */
    'middleware' => [
        // Profile request middleware enabled
        'profile_requests' => env('PROFILE_REQUESTS', env('APP_DEBUG', false)),

        // Log slow admin requests above this threshold (ms)
        'slow_admin_request_threshold' => 500,

        // Log slow API requests above this threshold (ms)
        'slow_api_request_threshold' => 200,
    ],

    /*
    |--------------------------------------------------------------------------
    | Redis Cache Configuration (Production)
    |--------------------------------------------------------------------------
    |
    | Ensure Redis is used in production for better cache performance
    |
    */
    'redis' => [
        // Default cache key prefix
        'prefix' => env('CACHE_PREFIX', 'filament:'),

        // TTL for navigation badges (short)
        'ttl_short' => 60,

        // TTL for list queries (medium)
        'ttl_medium' => 600,

        // TTL for stable data (long)
        'ttl_long' => 3600,
    ],

    /*
    |--------------------------------------------------------------------------
    | Feature Flags
    |--------------------------------------------------------------------------
    |
    | Enable/disable specific performance features
    |
    */
    'features' => [
        // Cache navigation badges count
        'cache_nav_badges' => true,

        // Lazy-load table details/relations
        'lazy_load_relations' => true,

        // Paginate all lists (no unlimited results)
        'force_pagination' => true,

        // Enable compression for large responses
        'gzip_responses' => true,

        // Preload critical resources
        'preload_critical' => true,
    ],
];
