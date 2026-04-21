#!/bin/bash

# Complete Fix with Backend Restart
# This script fixes the database, clears caches, and restarts the backend

cd "$(dirname "$0")"

echo "=========================================="
echo "🔴 FIXING BON DE LIVRAISON"
echo "=========================================="
echo ""

# Read database credentials from .env
DB_NAME=$(grep DB_DATABASE .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_USER=$(grep DB_USERNAME .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' \r\n"')

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Step 1: Update data_types table (FIXES PAGE TITLE)
echo "Step 1: Updating data_types table..."
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << EOF
UPDATE \`data_types\` 
SET \`display_name_singular\` = 'Bon de livraison',
    \`display_name_plural\` = 'Bons de livraison'
WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';
EOF

# Step 2: Update menu_items
echo ""
echo "Step 2: Updating menu_items..."
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << EOF
UPDATE \`menu_items\` 
SET \`title\` = 'Ajouter Bon de livraison'
WHERE \`title\` LIKE '%Ajouter B.Commande%'
   OR (\`route\` = 'voyager.facture' AND \`parent_id\` IS NOT NULL);

UPDATE \`menu_items\` 
SET \`title\` = 'Bon de livraison'
WHERE \`title\` LIKE '%Bon De Commandes%'
   OR \`title\` LIKE '%Bon de commandes%'
   OR (\`route\` = 'voyager.commandes.index' AND \`parent_id\` IS NOT NULL);
EOF

# Step 3: Verify updates
echo ""
echo "Step 3: Verifying database updates..."
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT \`id\`, \`name\`, \`slug\`, \`display_name_singular\`, \`display_name_plural\` FROM \`data_types\` WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';"

# Step 4: Remove ALL compiled views
echo ""
echo "Step 4: Removing ALL compiled views..."
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php"

# Step 5: Clear ALL caches
echo ""
echo "Step 5: Clearing all caches..."
docker exec -it sobitas-backend php artisan cache:clear
docker exec -it sobitas-backend php artisan view:clear
docker exec -it sobitas-backend php artisan config:clear
docker exec -it sobitas-backend php artisan route:clear
docker exec -it sobitas-backend php artisan optimize:clear

# Step 6: Restart backend container
echo ""
echo "Step 6: Restarting backend container..."
docker restart sobitas-backend

echo ""
echo "Waiting for backend to restart (10 seconds)..."
sleep 10

# Step 7: Clear caches again after restart
echo ""
echo "Step 7: Clearing caches again after restart..."
docker exec -it sobitas-backend php artisan optimize:clear

echo ""
echo "=========================================="
echo "✅ FIX COMPLETE - Backend Restarted!"
echo "=========================================="
echo ""
echo "NOW:"
echo "1. Wait 10-15 seconds for backend to fully restart"
echo "2. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "3. The page title should now show 'Bons de livraison'"
echo ""
