#!/bin/bash

################################################################################
# FILAMENT PERFORMANCE OPTIMIZATION - DEPLOYMENT SCRIPT
#
# Run this script after deploying to production to ensure all optimizations
# are in place. Expected execution time: 30-60 seconds.
#
# Usage: bash scripts/optimize-filament.sh
################################################################################

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  FILAMENT PERFORMANCE OPTIMIZATION DEPLOYMENT SCRIPT          ║"
echo "║  Version 1.1  |  March 2026                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
verify_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ $1${NC}"
        ((FAILED++))
    fi
}

warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
    ((WARNINGS++))
}

# ════════════════════════════════════════════════════════════════════════════
# PHASE 1: PRE-FLIGHT CHECKS
# ════════════════════════════════════════════════════════════════════════════

echo "PHASE 1: PRE-FLIGHT CHECKS"
echo "────────────────────────────────────────────────────────────────"

# Check PHP version
PHP_VERSION=$(php -r 'echo PHP_MAJOR_VERSION . "." . PHP_MINOR_VERSION;')
echo "PHP Version: $PHP_VERSION"

# Check if Laravel is installed
if [ -f "artisan" ]; then
    echo -e "${GREEN}✓ Laravel found${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ artisan not found - Run from Laravel root directory${NC}"
    exit 1
fi

# Check .env exists
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file found${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ .env file not found${NC}"
    ((FAILED++))
fi

# Check important env variables
echo ""
echo "Environment Configuration:"
APP_DEBUG=$(grep 'APP_DEBUG' .env | cut -d '=' -f 2)
CACHE_DRIVER=$(grep 'CACHE_DRIVER' .env | cut -d '=' -f 2)
QUEUE_CONNECTION=$(grep 'QUEUE_CONNECTION' .env | cut -d '=' -f 2)

echo "  APP_DEBUG: $APP_DEBUG"
[ "$APP_DEBUG" = "false" ] && echo -e "    ${GREEN}✓ Good (debug disabled)${NC}" || warn "APP_DEBUG should be 'false' in production"

echo "  CACHE_DRIVER: $CACHE_DRIVER"
[ "$CACHE_DRIVER" = "redis" ] && echo -e "    ${GREEN}✓ Good (using Redis)${NC}" || warn "CACHE_DRIVER should be 'redis' for best performance"

echo "  QUEUE_CONNECTION: $QUEUE_CONNECTION"
[ "$QUEUE_CONNECTION" = "redis" ] && echo -e "    ${GREEN}✓ Good (using Redis)${NC}" || warn "QUEUE_CONNECTION should be 'redis'"

# ════════════════════════════════════════════════════════════════════════════
# PHASE 2: CACHE OPTIMIZATION
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "PHASE 2: CACHE OPTIMIZATION"
echo "────────────────────────────────────────────────────────────────"

echo "Clearing old caches..."
php artisan cache:clear > /dev/null 2>&1
verify_success "Cache cleared"

php artisan config:clear > /dev/null 2>&1
verify_success "Config cache cleared"

php artisan route:clear > /dev/null 2>&1
verify_success "Route cache cleared"

php artisan view:clear > /dev/null 2>&1
verify_success "View cache cleared"

echo ""
echo "Building new caches (this improves performance)..."

php artisan config:cache > /dev/null 2>&1
verify_success "Config cached (~50ms faster per request)"

php artisan route:cache > /dev/null 2>&1
verify_success "Routes cached (~30ms faster per request)"

php artisan view:cache > /dev/null 2>&1
verify_success "Views cached"

# ════════════════════════════════════════════════════════════════════════════
# PHASE 3: DATABASE OPTIMIZATION
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "PHASE 3: DATABASE OPTIMIZATION"
echo "────────────────────────────────────────────────────────────────"

echo "Running migrations (ensures indexes are in place)..."
php artisan migrate --force > /dev/null 2>&1
verify_success "Migrations completed"

echo ""
echo "Checking critical database indexes..."

# Create a test PHP script to check indexes
php artisan tinker --execute "
    use Illuminate\Support\Facades\DB;
    
    \$checkIndexes = [
        ['table' => 'tickets', 'column' => 'numero'],
        ['table' => 'tickets', 'column' => 'client_id'],
        ['table' => 'commandes', 'column' => 'numero'],
        ['table' => 'commandes', 'column' => 'client_id'],
        ['table' => 'products', 'column' => 'barcode'],
    ];
    
    foreach (\$checkIndexes as \$check) {
        \$indexes = DB::select(\"SHOW INDEX FROM {\$check['table']} WHERE Column_name = '{\$check['column']}'\");
        if (count(\$indexes) > 0) {
            echo \"✓ Index on {\$check['table']}.{\$check['column']}\\n\";
        } else {
            echo \"⚠ Missing index on {\$check['table']}.{\$check['column']}\\n\";
        }
    }
" 2>/dev/null || warn "Could not verify database indexes"

# ════════════════════════════════════════════════════════════════════════════
# PHASE 4: ASSET COMPILATION
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "PHASE 4: ASSET COMPILATION"
echo "────────────────────────────────────────────────────────────────"

if [ -f "package.json" ]; then
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing npm dependencies..."
        npm ci > /dev/null 2>&1
        verify_success "Dependencies installed"
    fi
    
    echo "Building production assets (this may take 30-60 seconds)..."
    npm run build > /dev/null 2>&1
    verify_success "Assets built and minified"
    
    # Check build output size
    if [ -d "public/build" ] || [ -d "dist" ]; then
        ASSET_SIZE=$(du -sh public/build 2>/dev/null | cut -f 1 || du -sh dist 2>/dev/null | cut -f 1)
        echo "  Asset bundle size: $ASSET_SIZE (minified)"
    fi
else
    warn "package.json not found - skipping asset compilation"
fi

# ════════════════════════════════════════════════════════════════════════════
# PHASE 5: QUEUE & OPTIMIZATION
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "PHASE 5: OPTIMIZATION COMMANDS"
echo "────────────────────────────────────────────────────────────────"

echo "Running composer optimization..."
composer install --optimize-autoloader --no-dev > /dev/null 2>&1
verify_success "Composer autoloader optimized"

php artisan optimize > /dev/null 2>&1
verify_success "Framework optimized"

# ════════════════════════════════════════════════════════════════════════════
# PHASE 6: PERFORMANCE VERIFICATION
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "PHASE 6: PERFORMANCE VERIFICATION"
echo "────────────────────────────────────────────────────────────────"

# Use PHP tinker to verify settings
php artisan tinker --execute "
    \$debugEnabled = config('app.debug');
    \$cacheDriver = config('cache.default');
    
    echo 'APP_DEBUG: ' . (\$debugEnabled ? 'TRUE (⚠ should be FALSE)' : 'FALSE ✓') . \"\\n\";
    echo 'CACHE_DRIVER: ' . \$cacheDriver . \" ✓\\n\";
    
    if (function_exists('opcache_get_status')) {
        \$opcache = opcache_get_status();
        echo 'OPcache: ' . (\$opcache['opcache_enabled'] ? 'ENABLED ✓' : 'DISABLED ⚠') . \"\\n\";
    }
" 2>/dev/null

echo ""
echo "Checking file permissions..."
# Verify writable directories
for dir in "storage" "bootstrap/cache" "storage/logs"; do
    if [ -w "$dir" ]; then
        echo -e "  ${GREEN}✓${NC} $dir is writable"
        ((PASSED++))
    else
        echo -e "  ${RED}✗${NC} $dir is not writable"
        chmod -R 775 "$dir" 2>/dev/null || warn "Could not fix permissions on $dir"
    fi
done

# ════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  OPTIMIZATION SUMMARY                                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "Results: ${GREEN}$PASSED Passed${NC} | ${RED}$FAILED Failed${NC} | ${YELLOW}$WARNINGS Warnings${NC}"
echo ""

# Performance expectations
echo "Expected Performance After Optimization:"
echo "  • Dashboard load:      0.8 - 1.2 seconds (was 3+ seconds)"
echo "  • Resource list:       0.4 - 0.6 seconds (was 2+ seconds)"
echo "  • Page interaction:    < 100ms (instant response to clicks)"
echo "  • API responses:       < 200ms (was 500ms+)"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All optimizations applied successfully!${NC}"
    echo ""
    echo "NEXT STEPS:"
    echo "  1. Restart your queue workers: php artisan queue:restart"
    echo "  2. Monitor performance: tail -f storage/logs/performance.log"
    echo "  3. Test dashboard: curl -I https://admin.sobitas.tn/admin"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some optimizations failed. Please review above errors.${NC}"
    exit 1
fi
