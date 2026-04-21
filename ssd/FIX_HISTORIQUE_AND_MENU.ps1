# Complete Fix Script for Historique and Menu Issues (PowerShell Version)
# This script will:
# 1. Update database (data_types and menu_items)
# 2. Remove compiled views
# 3. Clear all caches
# 4. Restart backend container

# Navigate to the backend directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Load environment variables from .env file
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
} else {
    Write-Host "Error: .env file not found in backend directory." -ForegroundColor Red
    exit 1
}

$DB_NAME = $DB_DATABASE
$DB_USER = $DB_USERNAME
$DB_PASS = $DB_PASSWORD

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fixing Historique and Menu Issues" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Updating database (data_types and menu_items)..." -ForegroundColor Yellow
$sqlScript = @"
-- Fix page title
UPDATE \`data_types\` 
SET \`display_name_singular\` = 'Bon de livraison',
    \`display_name_plural\` = 'Bons de livraison'
WHERE \`slug\` = 'commandes' OR \`name\` = 'commandes';

-- Update "Ajouter B.Commande" → "Ajouter Bon de livraison"
UPDATE \`menu_items\` 
SET \`title\` = 'Ajouter Bon de livraison'
WHERE \`title\` LIKE '%Ajouter B.Commande%'
   OR \`title\` LIKE '%Ajouter Bon Commande%'
   OR (\`route\` = 'voyager.facture' AND \`parent_id\` = 26);

-- Update "Bon De Commandes" → "Bon de livraison"
UPDATE \`menu_items\` 
SET \`title\` = 'Bon de livraison'
WHERE \`title\` LIKE '%Bon De Commandes%'
   OR \`title\` LIKE '%Bon de commandes%'
   OR \`title\` LIKE '%Bons de commandes%'
   OR (\`route\` = 'voyager.factures.index' AND \`parent_id\` = 26)
   OR (\`route\` = 'voyager.commandes.index' AND \`parent_id\` = 26);

-- Remove standalone "Bon de livraison" menu item (NOT under Facturations & Tickets)
DELETE FROM \`menu_items\` 
WHERE (\`title\` = 'Bon de livraison' OR \`title\` = 'Bons de livraison')
  AND (\`parent_id\` IS NULL OR \`parent_id\` != 26)
  AND (\`route\` LIKE '%commandes%' OR \`route\` = 'voyager.commandes.index');

-- Ensure all commandes routes use correct title
UPDATE \`menu_items\` 
SET \`title\` = 'Bon de livraison'
WHERE \`route\` = 'voyager.commandes.index'
   AND \`title\` != 'Bon de livraison'
   AND \`parent_id\` = 26;
"@

$sqlScript | docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database updated successfully." -ForegroundColor Green
} else {
    Write-Host "✗ Error: Database update failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Removing ALL compiled views..." -ForegroundColor Yellow
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ All compiled views removed." -ForegroundColor Green
} else {
    Write-Host "✗ Error: Failed to remove compiled views." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Clearing all Laravel caches..." -ForegroundColor Yellow
docker exec -it sobitas-backend php artisan optimize:clear
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ All caches cleared." -ForegroundColor Green
} else {
    Write-Host "✗ Error: Failed to clear Laravel caches." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Restarting backend Docker container..." -ForegroundColor Yellow
docker restart sobitas-backend
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend container restarted successfully." -ForegroundColor Green
} else {
    Write-Host "✗ Error: Failed to restart backend container." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "All fixes applied successfully!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Changes made:" -ForegroundColor Green
Write-Host "  ✓ Fixed 'Liste des commandes' → 'Liste des bons de livraison' in historique"
Write-Host "  ✓ Fixed 'Bon de commande' → 'Bon de livraison' in imprimer_facture template"
Write-Host "  ✓ Updated database (data_types and menu_items)"
Write-Host "  ✓ Removed standalone 'Bon de livraison' menu item"
Write-Host "  ✓ Ensured menu items are under 'Facturations & Tickets'"
Write-Host "  ✓ Cleared all caches and restarted backend"
Write-Host ""
Write-Host "Please wait 10-15 seconds for the container to fully restart," -ForegroundColor Yellow
Write-Host "then hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)." -ForegroundColor Yellow
