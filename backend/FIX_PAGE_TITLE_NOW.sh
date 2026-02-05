#!/bin/bash

# URGENT FIX: Fix page title "Bon de commandes" → "Bons de livraison"
# This script reads credentials from .env and fixes the page title

cd "$(dirname "$0")"

echo "🔴 FIXING PAGE TITLE..."
echo ""

# Read database credentials from .env
DB_NAME=$(grep DB_DATABASE .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_USER=$(grep DB_USERNAME .env | cut -d '=' -f2 | tr -d ' \r\n"')
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2 | tr -d ' \r\n"')

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# CRITICAL: Update data_types table (THIS FIXES THE PAGE TITLE)
echo "Updating data_types table..."
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << EOF
UPDATE \`data_types\` 
SET \`display_name_singular\` = 'Bon de livraison',
    \`display_name_plural\` = 'Bons de livraison'
WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';
EOF

# Verify the update
echo ""
echo "Verifying update..."
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT \`id\`, \`name\`, \`slug\`, \`display_name_singular\`, \`display_name_plural\` FROM \`data_types\` WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';"

echo ""
echo "Removing ALL compiled views..."
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php"

echo ""
echo "Clearing all caches..."
docker exec -it sobitas-backend php artisan cache:clear
docker exec -it sobitas-backend php artisan view:clear
docker exec -it sobitas-backend php artisan config:clear
docker exec -it sobitas-backend php artisan route:clear
docker exec -it sobitas-backend php artisan optimize:clear

echo ""
echo "=========================================="
echo "✅ FIX COMPLETE!"
echo "=========================================="
echo ""
echo "NOW:"
echo "1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. The page title should now show 'Bons de livraison'"
echo ""
