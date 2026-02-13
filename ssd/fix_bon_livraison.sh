#!/bin/bash

# Script to fix Bon de livraison in database
# This script reads credentials from .env file

cd "$(dirname "$0")"

# Read database credentials from .env
DB_NAME=$(grep DB_DATABASE .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_USER=$(grep DB_USERNAME .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' \r\n"')

echo "Updating database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Run SQL commands
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << EOF

-- Update data_types table (FIXES PAGE TITLE)
UPDATE \`data_types\` 
SET \`display_name_singular\` = 'Bon de livraison',
    \`display_name_plural\` = 'Bons de livraison'
WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';

-- Update menu_items - "Ajouter B.Commande" to "Ajouter Bon de livraison"
UPDATE \`menu_items\` 
SET \`title\` = 'Ajouter Bon de livraison'
WHERE \`title\` LIKE '%Ajouter B.Commande%'
   OR \`title\` LIKE '%Ajouter Bon Commande%'
   OR (\`route\` = 'voyager.facture' AND \`parent_id\` IS NOT NULL);

-- Update menu_items - "Bon De Commandes" to "Bon de livraison"
UPDATE \`menu_items\` 
SET \`title\` = 'Bon de livraison'
WHERE \`title\` LIKE '%Bon De Commandes%'
   OR \`title\` LIKE '%Bon de commandes%'
   OR \`title\` LIKE '%Bons de commandes%'
   OR (\`route\` = 'voyager.factures.index' AND \`parent_id\` IS NOT NULL)
   OR (\`route\` = 'voyager.commandes.index' AND \`parent_id\` IS NOT NULL);

-- Remove standalone "Bon de livraison" menu item
DELETE FROM \`menu_items\` 
WHERE (\`title\` = 'Bon de livraison' OR \`title\` = 'Bons de livraison')
  AND (\`parent_id\` IS NULL OR \`parent_id\` NOT IN (
      SELECT \`id\` FROM \`menu_items\` WHERE \`title\` LIKE '%Facturations%Tickets%' OR \`title\` LIKE '%Facturation%Ticket%'
  ))
  AND (\`route\` LIKE '%commandes%' OR \`route\` = 'voyager.commandes.index');

-- Verify updates
SELECT 'data_types updated:' as info;
SELECT \`id\`, \`name\`, \`slug\`, \`display_name_singular\`, \`display_name_plural\` 
FROM \`data_types\` 
WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';

SELECT 'menu_items updated:' as info;
SELECT \`id\`, \`title\`, \`route\`, \`parent_id\` 
FROM \`menu_items\` 
WHERE \`title\` LIKE '%livraison%' OR \`route\` LIKE '%commandes%';

EOF

echo ""
echo "✅ Database updated successfully!"
echo ""
echo "Now clearing caches..."
docker exec -it sobitas-backend php artisan cache:clear
docker exec -it sobitas-backend php artisan view:clear
docker exec -it sobitas-backend php artisan config:clear

echo ""
echo "✅ All done! Please refresh your browser."
