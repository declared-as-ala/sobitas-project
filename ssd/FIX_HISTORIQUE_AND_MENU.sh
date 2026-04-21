#!/bin/bash

# Complete Fix Script for Historique and Menu Issues
# This script will:
# 1. Update database (data_types and menu_items)
# 2. Remove compiled views
# 3. Clear all caches
# 4. Restart backend container

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
echo "Fixing Historique and Menu Issues"
echo "=========================================="

echo ""
echo "Step 1: Updating database (data_types and menu_items)..."
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" <<'SQL_EOF'
UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'commandes' OR `name` = 'commandes';

UPDATE `menu_items` 
SET `title` = 'Ajouter Bon de livraison'
WHERE `title` LIKE '%Ajouter B.Commande%'
   OR `title` LIKE '%Ajouter Bon Commande%'
   OR (`route` = 'voyager.facture' AND `parent_id` = 26);

UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `title` LIKE '%Bon De Commandes%'
   OR `title` LIKE '%Bon de commandes%'
   OR `title` LIKE '%Bons de commandes%'
   OR (`route` = 'voyager.factures.index' AND `parent_id` = 26)
   OR (`route` = 'voyager.commandes.index' AND `parent_id` = 26);

DELETE FROM `menu_items` 
WHERE (`title` = 'Bon de livraison' OR `title` = 'Bons de livraison')
  AND (`parent_id` IS NULL OR `parent_id` != 26)
  AND (`route` LIKE '%commandes%' OR `route` = 'voyager.commandes.index');

UPDATE `menu_items` 
SET `title` = 'Bon de livraison'
WHERE `route` = 'voyager.commandes.index'
   AND `title` != 'Bon de livraison'
   AND `parent_id` = 26;
SQL_EOF

if [ $? -eq 0 ]; then
    echo "✓ Database updated successfully."
else
    echo "✗ Error: Database update failed."
    exit 1
fi

echo ""
echo "Step 2: Removing ALL compiled views..."
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php"
if [ $? -eq 0 ]; then
    echo "✓ All compiled views removed."
else
    echo "✗ Error: Failed to remove compiled views."
    exit 1
fi

echo ""
echo "Step 3: Clearing all Laravel caches..."
docker exec -it sobitas-backend php artisan optimize:clear
if [ $? -eq 0 ]; then
    echo "✓ All caches cleared."
else
    echo "✗ Error: Failed to clear Laravel caches."
    exit 1
fi

echo ""
echo "Step 4: Restarting backend Docker container..."
docker restart sobitas-backend
if [ $? -eq 0 ]; then
    echo "✓ Backend container restarted successfully."
else
    echo "✗ Error: Failed to restart backend container."
    exit 1
fi

echo ""
echo "=========================================="
echo "All fixes applied successfully!"
echo "=========================================="
echo ""
echo "Changes made:"
echo "  ✓ Fixed 'Liste des commandes' → 'Liste des bons de livraison' in historique"
echo "  ✓ Fixed 'Bon de commande' → 'Bon de livraison' in imprimer_facture template"
echo "  ✓ Updated database (data_types and menu_items)"
echo "  ✓ Removed standalone 'Bon de livraison' menu item"
echo "  ✓ Ensured menu items are under 'Facturations & Tickets'"
echo "  ✓ Cleared all caches and restarted backend"
echo ""
echo "Please wait 10-15 seconds for the container to fully restart,"
echo "then hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)."
