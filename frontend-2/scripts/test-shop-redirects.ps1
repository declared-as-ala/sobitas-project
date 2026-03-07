# Tests for /shop/:slug anti-404 redirects (301/308 to /category/:slug when product not found).
# Run in PowerShell from frontend folder:
#   $env:BASE = "http://localhost:3000"; .\scripts\test-shop-redirects.ps1
# Production: .\scripts\test-shop-redirects.ps1
#
# Note: Results depend on your API. If "proteine-whey" exists as a PRODUCT in the API, you get 200 (correct).
# For "slug-inexistant" the API must return 404 for the app to return 404. Use production (protein.tn) to validate.

$Base = if ($env:BASE) { $env:BASE } else { "https://protein.tn" }
# Use GET so the server runs the full route and returns the real status (HEAD can return 200 on some setups)
$UseGet = $true

Write-Host "=== Testing shop anti-404 redirects (BASE=$Base) ===" -ForegroundColor Cyan
Write-Host ""

function Get-StatusAndLocation {
    param($Uri)
    $method = if ($UseGet) { "Get" } else { "Head" }
    try {
        $r = Invoke-WebRequest -Uri $Uri -Method $method -MaximumRedirection 0 -ErrorAction Stop
        return [PSCustomObject]@{ Status = [int]$r.StatusCode; Location = $null }
    } catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $status = [int]$resp.StatusCode
            $loc = $resp.Headers["Location"]
            if ($loc) { $loc = $loc.ToString() }
            return [PSCustomObject]@{ Status = $status; Location = $loc }
        }
    }
    return $null
}

# 1) /shop/proteine-whey -> 301/308 -> /category/proteine-whey
Write-Host "1) GET /shop/proteine-whey (expect 301 or 308, Location: /category/proteine-whey)"
$t1 = Get-StatusAndLocation -Uri "$Base/shop/proteine-whey"
if ($t1) { Write-Host "   Status: $($t1.Status) | Location: $($t1.Location)" } else { Write-Host "   (no response)" }
Write-Host ""

# 2) /shop/instant-mass-7kg-scenit-nutrition -> 200
Write-Host "2) GET /shop/instant-mass-7kg-scenit-nutrition (expect 200)"
$t2 = Get-StatusAndLocation -Uri "$Base/shop/instant-mass-7kg-scenit-nutrition"
if ($t2) { Write-Host "   Status: $($t2.Status)" } else { Write-Host "   (no response)" }
Write-Host ""

# 3) /shop/slug-inexistant -> 404
Write-Host "3) GET /shop/slug-inexistant (expect 404)"
$t3 = Get-StatusAndLocation -Uri "$Base/shop/slug-inexistant"
if ($t3) { Write-Host "   Status: $($t3.Status)" } else { Write-Host "   (no response)" }
Write-Host ""

# 4) /shop/proteine-whey?utm=1 -> Location must contain ?utm=1
Write-Host "4) GET /shop/proteine-whey?utm=1 (expect 301/308, Location contains ?utm=1)"
$t4 = Get-StatusAndLocation -Uri "$Base/shop/proteine-whey?utm=1"
if ($t4) {
    Write-Host "   Location: $($t4.Location)"
    if ($t4.Location -and $t4.Location -match "utm=1") { Write-Host "   OK: UTM preserved" -ForegroundColor Green } else { Write-Host "   WARN: UTM not in Location" -ForegroundColor Yellow }
} else { Write-Host "   (no response)" }
Write-Host ""

Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you see 200 everywhere: local API may differ. Test against production:" -ForegroundColor Yellow
Write-Host "  .\scripts\test-shop-redirects.ps1   (no env BASE = https://protein.tn)" -ForegroundColor Gray
Write-Host "Or with curl.exe:" -ForegroundColor Yellow
Write-Host "  curl.exe -sI https://protein.tn/shop/proteine-whey" -ForegroundColor Gray
Write-Host "  curl.exe -sI https://protein.tn/shop/slug-inexistant" -ForegroundColor Gray
