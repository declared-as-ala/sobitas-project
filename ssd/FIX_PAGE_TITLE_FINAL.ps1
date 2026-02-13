# Final Fix Script for Page Title "Bon de commandes" → "Bons de livraison" (PowerShell Version)
# This script will update the data_types table and clear all caches

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
Write-Host "Fixing Page Title: Bon de commandes → Bons de livraison" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Updating data_types table for 'factures' and 'commandes'..." -ForegroundColor Yellow
$sqlScript = @"
UPDATE `data_types` 
SET `display_name_singular` = 'Bon de livraison',
    `display_name_plural` = 'Bons de livraison'
WHERE `slug` = 'factures' OR `name` = 'factures'
   OR `slug` = 'commandes' OR `name` = 'commandes';
"@

$sqlScript | docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database updated successfully." -ForegroundColor Green
} else {
    Write-Host "✗ Error: Database update failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Verifying the update..." -ForegroundColor Yellow
docker exec -i sobitas-mysql mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT id, name, slug, display_name_singular, display_name_plural FROM data_types WHERE slug IN ('factures', 'commandes') OR name IN ('factures', 'commandes');"

Write-Host ""
Write-Host "Step 3: Removing ALL compiled views..." -ForegroundColor Yellow
docker exec -it sobitas-backend bash -c "rm -rf storage/framework/views/*.php"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ All compiled views removed." -ForegroundColor Green
} else {
    Write-Host "✗ Error: Failed to remove compiled views." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Clearing all Laravel caches..." -ForegroundColor Yellow
docker exec -it sobitas-backend php artisan optimize:clear
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ All caches cleared." -ForegroundColor Green
} else {
    Write-Host "✗ Error: Failed to clear Laravel caches." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 5: Clearing view cache specifically..." -ForegroundColor Yellow
docker exec -it sobitas-backend php artisan view:clear
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ View cache cleared." -ForegroundColor Green
} else {
    Write-Host "✗ Warning: Failed to clear view cache." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 6: Clearing config cache..." -ForegroundColor Yellow
docker exec -it sobitas-backend php artisan config:clear
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Config cache cleared." -ForegroundColor Green
} else {
    Write-Host "✗ Warning: Failed to clear config cache." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 7: Restarting backend Docker container..." -ForegroundColor Yellow
docker restart sobitas-backend
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend container restarted successfully." -ForegroundColor Green
} else {
    Write-Host "✗ Error: Failed to restart backend container." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fix completed successfully!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The page title should now show 'Bons de livraison' instead of 'Bon de commandes'." -ForegroundColor Green
Write-Host ""
Write-Host "Please wait 15-20 seconds for the container to fully restart," -ForegroundColor Yellow
Write-Host "then hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)." -ForegroundColor Yellow
Write-Host ""
Write-Host "If you still see 'Bon de commandes', try:" -ForegroundColor Yellow
Write-Host "  1. Clear your browser cache completely (Ctrl+Shift+Delete)" -ForegroundColor Yellow
Write-Host "  2. Try in an incognito/private window" -ForegroundColor Yellow
Write-Host "  3. Check the database directly to verify the update" -ForegroundColor Yellow
