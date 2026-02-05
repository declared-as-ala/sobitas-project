# PowerShell Script to fix Bon de livraison in database
# This script reads credentials from .env file

$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    exit 1
}

# Read database credentials from .env
$envContent = Get-Content $envFile
$DB_NAME = ($envContent | Select-String "DB_DATABASE=").ToString().Split('=')[1].Trim()
$DB_USER = ($envContent | Select-String "DB_USERNAME=").ToString().Split('=')[1].Trim()
$DB_PASS = ($envContent | Select-String "DB_PASSWORD=").ToString().Split('=')[1].Trim()

Write-Host "Updating database: $DB_NAME" -ForegroundColor Green
Write-Host "User: $DB_USER" -ForegroundColor Green
Write-Host ""

# SQL commands
$sqlCommands = @"
UPDATE \`data_types\` 
SET \`display_name_singular\` = 'Bon de livraison',
    \`display_name_plural\` = 'Bons de livraison'
WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';

UPDATE \`menu_items\` 
SET \`title\` = 'Ajouter Bon de livraison'
WHERE \`title\` LIKE '%Ajouter B.Commande%'
   OR \`title\` LIKE '%Ajouter Bon Commande%'
   OR (\`route\` = 'voyager.facture' AND \`parent_id\` IS NOT NULL);

UPDATE \`menu_items\` 
SET \`title\` = 'Bon de livraison'
WHERE \`title\` LIKE '%Bon De Commandes%'
   OR \`title\` LIKE '%Bon de commandes%'
   OR \`title\` LIKE '%Bons de commandes%'
   OR (\`route\` = 'voyager.factures.index' AND \`parent_id\` IS NOT NULL)
   OR (\`route\` = 'voyager.commandes.index' AND \`parent_id\` IS NOT NULL);

DELETE FROM \`menu_items\` 
WHERE (\`title\` = 'Bon de livraison' OR \`title\` = 'Bons de livraison')
  AND (\`parent_id\` IS NULL OR \`parent_id\` NOT IN (
      SELECT \`id\` FROM \`menu_items\` WHERE \`title\` LIKE '%Facturations%Tickets%' OR \`title\` LIKE '%Facturation%Ticket%'
  ))
  AND (\`route\` LIKE '%commandes%' OR \`route\` = 'voyager.commandes.index');
"@

# Execute SQL
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e $sqlCommands

Write-Host ""
Write-Host "Clearing caches..." -ForegroundColor Yellow
docker exec -it sobitas-backend php artisan cache:clear
docker exec -it sobitas-backend php artisan view:clear
docker exec -it sobitas-backend php artisan config:clear

Write-Host ""
Write-Host "All done! Please refresh your browser." -ForegroundColor Green
