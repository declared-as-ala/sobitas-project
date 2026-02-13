#!/bin/bash

# Final Fix Script for Page Title "Bon de commandes" → "Bons de livraison"
# This script will update the data_types table and clear all caches

# Navigate to the backend directory
cd "$(dirname "$0")"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found in backend directory."
    exit 1
fi

DB_NAME=${DB_DATABASE}
DB_USER=${DB_USERNAME}
DB_PASS=${DB_PASSWORD}

echo "=========================================="
echo "Fixing Page Title: Bon de commandes → Bons de livraison"
echo "=========================================="
echo ""

echo "Step 1: Updating data_types table for 'factures' and 'commandes'..."
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" <<'SQL_EOF'
UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'factures' OR `name` = 'factures'
   OR `slug` = 'commandes' OR `name` = 'commandes';
SQL_EOF

if [ $? -eq 0 ]; then
    echo "✓ Database updated successfully."
else
    echo "✗ Error: Database update failed."
    exit 1
fi

echo ""
echo "Step 2: Verifying the update..."
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT id, name, slug, display_name_singular, display_name_plural FROM data_types WHERE slug IN ('factures', 'commandes') OR name IN ('factures', 'commandes');"

echo ""
echo "Step 3: Removing ALL compiled views..."
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php"
if [ $? -eq 0 ]; then
    echo "✓ All compiled views removed."
else
    echo "✗ Error: Failed to remove compiled views."
    exit 1
fi

echo ""
echo "Step 4: Clearing all Laravel caches..."
docker exec -it sobitas-backend php artisan optimize:clear
if [ $? -eq 0 ]; then
    echo "✓ All caches cleared."
else
    echo "✗ Error: Failed to clear Laravel caches."
    exit 1
fi

echo ""
echo "Step 5: Clearing view cache specifically..."
docker exec -it sobitas-backend php artisan view:clear
if [ $? -eq 0 ]; then
    echo "✓ View cache cleared."
else
    echo "✗ Warning: Failed to clear view cache."
fi

echo ""
echo "Step 6: Clearing config cache..."
docker exec -it sobitas-backend php artisan config:clear
if [ $? -eq 0 ]; then
    echo "✓ Config cache cleared."
else
    echo "✗ Warning: Failed to clear config cache."
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
echo "Fix completed successfully!"
echo "=========================================="
echo ""
echo "The page title should now show 'Bons de livraison' instead of 'Bon de commandes'."
echo ""
echo "Please wait 15-20 seconds for the container to fully restart,"
echo "then hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)."
echo ""
echo "If you still see 'Bon de commandes', try:"
echo "  1. Clear your browser cache completely (Ctrl+Shift+Delete)"
echo "  2. Try in an incognito/private window"
echo "  3. Check the database directly to verify the update"
