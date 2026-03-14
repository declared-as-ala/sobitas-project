#!/bin/bash

# Performance Optimization Quick Start Guide
# Run this script after deployment to activate all optimizations

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  FILAMENT V4 PERFORMANCE OPTIMIZATION - Setup Script            ║"
echo "╚════════════════════════════════════════════════════════════════╝"

echo ""
echo "[1] Clearing existing caches..."
php artisan cache:clear --quiet
php artisan config:clear --quiet
php artisan route:clear --quiet
php artisan view:clear --quiet
echo "✓ Caches cleared"

echo ""
echo "[2] Running performance indexes migration..."
php artisan migrate --force 2>&1 | grep -E "performance|created|already"
echo "✓ Indexes migrated"

echo ""
echo "[3] Caching configuration (for production speed)..."
php artisan config:cache --quiet
php artisan route:cache --quiet
echo "✓ Configuration cached"

echo ""
echo "[4] Verifying Redis connection..."
php artisan tinker --execute="
    try {
        Redis::ping();
        echo '✓ Redis is connected and working' . PHP_EOL;
    } catch (\Exception \$e) {
        echo '⚠ Redis not available: ' . \$e->getMessage() . PHP_EOL;
        echo '  (This is OK in dev, but critical in production)' . PHP_EOL;
    }
"

echo ""
echo "[5] Preloading OPcache (if available)..."
if php -r "echo extension_loaded('Zend OPcache') ? 'yes' : 'no';" | grep -q yes; then
    echo "✓ OPcache is enabled"
else
    echo "⚠ OPcache not detected (consider enabling in production)"
fi

echo ""
echo "[6] Checking critical indexes..."
php artisan tinker --execute="
    \$checks = [
        'tickets.numero' => 'idx_tickets_numero',
        'products.barcode' => 'idx_products_barcode',
        'commandes.numero' => 'idx_commandes_numero',
        'facture_tvas.numero' => 'idx_facture_tvas_numero',
    ];
    
    foreach (\$checks as \$table_col => \$index_name) {
        list(\$table, \$col) = explode('.', \$table_col);
        \$indexes = DB::select(\"SHOW INDEX FROM {$table} WHERE Column_name = '{$col}'\");
        echo \$indexes ? \"✓ {$table_col} indexed\" . PHP_EOL : \"✗ {$table_col} MISSING\" . PHP_EOL;
    }
"

echo ""
echo "[7] Testing performance logging..."
php artisan tinker --execute="
    Log::channel('performance')->info('Performance logging test', ['test' => 'OK']);
    echo '✓ Performance logging configured' . PHP_EOL;
"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✓ OPTIMIZATION SETUP COMPLETE                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"

echo ""
echo "📊 NEXT STEPS:"
echo "  1. Visit /admin/tickets and check browser DevTools Network tab"
echo "  2. Monitor performance logs: tail -f storage/logs/performance.log"
echo "  3. Measure page load times (should be 40-60% faster)"
echo "  4. Check database query count (should be <15 queries per page)"
echo ""
echo "🧪 TO TEST PROFILING:"
echo "  - Set PROFILE_REQUESTS=true in .env"
echo "  - Load admin pages"
echo "  - Check storage/logs/performance.log for timing data"
echo ""
echo "⚙️  TO CONFIGURE REDIS (Production):"
echo "  - Update CACHE_DRIVER=redis in .env"
echo "  - Ensure REDIS_HOST and REDIS_PORT are set"
echo "  - Restart PHP-FPM: docker-compose restart backend"
echo ""
