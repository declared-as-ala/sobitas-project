#!/bin/bash

# Force Clear All Caches Script
# This script will aggressively clear all caches and restart the backend

# Navigate to the backend directory
cd "$(dirname "$0")"

echo "=========================================="
echo "Force Clearing All Caches"
echo "=========================================="
echo ""

echo "Step 1: Removing ALL compiled views..."
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php"
if [ $? -eq 0 ]; then
    echo "✓ All compiled views removed."
else
    echo "✗ Error: Failed to remove compiled views."
    exit 1
fi

echo ""
echo "Step 2: Clearing Laravel view cache..."
docker exec -it sobitas-backend php artisan view:clear
if [ $? -eq 0 ]; then
    echo "✓ View cache cleared."
else
    echo "✗ Error: Failed to clear view cache."
    exit 1
fi

echo ""
echo "Step 3: Clearing Laravel config cache..."
docker exec -it sobitas-backend php artisan config:clear
if [ $? -eq 0 ]; then
    echo "✓ Config cache cleared."
else
    echo "✗ Error: Failed to clear config cache."
    exit 1
fi

echo ""
echo "Step 4: Clearing Laravel route cache..."
docker exec -it sobitas-backend php artisan route:clear
if [ $? -eq 0 ]; then
    echo "✓ Route cache cleared."
else
    echo "✗ Error: Failed to clear route cache."
    exit 1
fi

echo ""
echo "Step 5: Clearing Laravel application cache..."
docker exec -it sobitas-backend php artisan cache:clear
if [ $? -eq 0 ]; then
    echo "✓ Application cache cleared."
else
    echo "✗ Error: Failed to clear application cache."
    exit 1
fi

echo ""
echo "Step 6: Clearing all caches with optimize:clear..."
docker exec -it sobitas-backend php artisan optimize:clear
if [ $? -eq 0 ]; then
    echo "✓ All caches cleared with optimize:clear."
else
    echo "✗ Error: Failed to clear caches."
    exit 1
fi

echo ""
echo "Step 7: Restarting backend Docker container..."
docker restart sobitas-backend
if [ $? -eq 0 ]; then
    echo "✓ Backend container restarted successfully."
else
    echo "✗ Error: Failed to restart backend container."
    exit 1
fi

echo ""
echo "=========================================="
echo "All caches cleared and backend restarted!"
echo "=========================================="
echo ""
echo "Please wait 15-20 seconds for the container to fully restart,"
echo "then hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)."
echo ""
echo "If you still see 'bon de commande', try:"
echo "  1. Clear your browser cache completely"
echo "  2. Try in an incognito/private window"
echo "  3. Check if the compiled views were actually removed"
