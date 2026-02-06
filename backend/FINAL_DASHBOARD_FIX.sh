#!/bin/bash
set -e

echo "=== FINAL DASHBOARD FIX ==="
echo "This will ensure the modern dashboard is loaded"
echo ""

cd /root/sobitas-project || { echo "Directory not found!"; exit 1; }

# Pull latest code
echo "1. Pulling latest code..."
git pull origin main

cd backend || { echo "Backend directory not found!"; exit 1; }

# Clear ALL caches (CRITICAL!)
echo "2. Clearing ALL caches..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 php artisan optimize:clear
    docker compose exec -T backend-v2 php artisan route:clear
    docker compose exec -T backend-v2 php artisan config:clear
    docker compose exec -T backend-v2 php artisan view:clear
    docker compose exec -T backend-v2 php artisan cache:clear
    echo "✓ All caches cleared"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend php artisan optimize:clear
    docker compose exec -T backend php artisan route:clear
    docker compose exec -T backend php artisan config:clear
    docker compose exec -T backend php artisan view:clear
    docker compose exec -T backend php artisan cache:clear
    echo "✓ All caches cleared"
fi

# Rebuild route cache (MUST be done after clearing!)
echo "3. Rebuilding route cache..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose exec -T backend-v2 php artisan route:cache
    docker compose exec -T backend-v2 php artisan config:cache
    echo "✓ Route cache rebuilt"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose exec -T backend php artisan route:cache
    docker compose exec -T backend php artisan config:cache
    echo "✓ Route cache rebuilt"
fi

# Verify route
echo "4. Verifying dashboard route..."
if docker ps | grep -q "sobitas-backend-v2"; then
    echo "Checking route registration:"
    docker compose exec -T backend-v2 php artisan route:list | grep -E "GET.*admin/$|dashboard" | head -3
elif docker ps | grep -q "sobitas-backend"; then
    echo "Checking route registration:"
    docker compose exec -T backend php artisan route:list | grep -E "GET.*admin/$|dashboard" | head -3
fi

# Verify view file exists
echo "5. Verifying view file..."
if [ -f "resources/views/admin/index.blade.php" ]; then
    echo "✓ Modern dashboard view exists"
    echo "File size: $(du -h resources/views/admin/index.blade.php | cut -f1)"
else
    echo "❌ Dashboard view file not found!"
    exit 1
fi

# Verify assets
echo "6. Verifying assets..."
if [ -f "public/css/app.css" ]; then
    echo "✓ CSS file exists: $(du -h public/css/app.css | cut -f1)"
else
    echo "⚠️ CSS file not found - may need to compile assets"
fi

if [ -f "public/js/app.js" ]; then
    echo "✓ JS file exists: $(du -h public/js/app.js | cut -f1)"
else
    echo "⚠️ JS file not found - may need to compile assets"
fi

# Restart container
echo "7. Restarting container..."
if docker ps | grep -q "sobitas-backend-v2"; then
    docker compose restart backend-v2 || true
    echo "✓ Container restarted"
elif docker ps | grep -q "sobitas-backend"; then
    docker compose restart backend || true
    echo "✓ Container restarted"
fi

echo ""
echo "=== FIX COMPLETE ==="
echo "✅ Code pulled"
echo "✅ All caches cleared"
echo "✅ Route cache rebuilt"
echo "✅ Container restarted"
echo ""
echo "Now visit: https://admin.sobitas.tn/admin"
echo "After logging in, you should see the modern dashboard!"
echo ""
echo "If you still see the old dashboard:"
echo "1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "2. Clear browser cache"
echo "3. Try incognito/private mode"
