# Compare /api/all_products vs /api/all_products_fast
# Run: .\tests\compare_routes.ps1

$ErrorActionPreference = "Continue"

$urlNormal = "http://localhost:8080/api/all_products"
$urlFast = "http://localhost:8080/api/all_products_fast"
$iterations = 30
$timeoutSec = 30
$betweenMs = 50

function Get-HeaderValue {
    param(
        [Parameter(Mandatory=$false)] $Headers,
        [Parameter(Mandatory=$true)] [string] $Name
    )
    if ($null -eq $Headers) { return $null }
    foreach ($k in $Headers.Keys) {
        if ($k -ieq $Name) { return $Headers[$k] }
    }
    return $null
}

Write-Host "Route Comparison Benchmark" -ForegroundColor Cyan
Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host ""

# Clear cache
Write-Host "Clearing cache..." -ForegroundColor Green
try {
    docker exec sobitas-backend php artisan cache:clear | Out-Null
} catch {
    Write-Host "WARN: Could not clear cache" -ForegroundColor Yellow
}
Write-Host ""

# Warm both routes
Write-Host "Warming cache for both routes..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $urlNormal -Method GET -UseBasicParsing -TimeoutSec $timeoutSec | Out-Null
    Invoke-WebRequest -Uri $urlFast -Method GET -UseBasicParsing -TimeoutSec $timeoutSec | Out-Null
    Start-Sleep -Seconds 1
} catch {
    Write-Host "WARN: Warm-up failed" -ForegroundColor Yellow
}
Write-Host ""

# Test normal route
Write-Host ("Testing {0} ({1} requests)..." -f $urlNormal, $iterations) -ForegroundColor Cyan
$normalResults = @()
$normalStart = Get-Date

for ($i = 1; $i -le $iterations; $i++) {
    Write-Host ("Request {0}/{1}... " -f $i, $iterations) -NoNewline
    $start = Get-Date
    try {
        $resp = Invoke-WebRequest -Uri $urlNormal -Method GET -UseBasicParsing -TimeoutSec $timeoutSec
        $end = Get-Date
        $wallMs = ($end - $start).TotalMilliseconds
        $cache = Get-HeaderValue -Headers $resp.Headers -Name "X-Cache"
        $perfMs = Get-HeaderValue -Headers $resp.Headers -Name "X-Perf-TotalMs"
        
        $normalResults += [pscustomobject]@{
            Request = $i
            Success = $true
            WallMs = $wallMs
            CacheStatus = $cache
            PerfTotalMs = $perfMs
        }
        
        $status = if ($cache -eq "HIT") { "HIT" } else { "MISS" }
        Write-Host ("{0} | {1}ms" -f $status, ([math]::Round($wallMs, 2))) -ForegroundColor $(if ($cache -eq "HIT") { "Green" } else { "Yellow" })
    } catch {
        Write-Host ("ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
        $normalResults += [pscustomobject]@{
            Request = $i
            Success = $false
            Error = $_.Exception.Message
        }
    }
    Start-Sleep -Milliseconds $betweenMs
}

$normalEnd = Get-Date
$normalTotal = ($normalEnd - $normalStart).TotalMilliseconds

Write-Host ""
Write-Host ("Normal route completed in {0}ms" -f ([math]::Round($normalTotal, 2))) -ForegroundColor Green
Write-Host ""

# Test fast route
Write-Host ("Testing {0} ({1} requests)..." -f $urlFast, $iterations) -ForegroundColor Cyan
$fastResults = @()
$fastStart = Get-Date

for ($i = 1; $i -le $iterations; $i++) {
    Write-Host ("Request {0}/{1}... " -f $i, $iterations) -NoNewline
    $start = Get-Date
    try {
        $resp = Invoke-WebRequest -Uri $urlFast -Method GET -UseBasicParsing -TimeoutSec $timeoutSec
        $end = Get-Date
        $wallMs = ($end - $start).TotalMilliseconds
        $cache = Get-HeaderValue -Headers $resp.Headers -Name "X-Cache"
        $perfMs = Get-HeaderValue -Headers $resp.Headers -Name "X-Perf-TotalMs"
        
        $fastResults += [pscustomobject]@{
            Request = $i
            Success = $true
            WallMs = $wallMs
            CacheStatus = $cache
            PerfTotalMs = $perfMs
        }
        
        $status = if ($cache -eq "HIT") { "HIT" } else { "MISS" }
        Write-Host ("{0} | {1}ms" -f $status, ([math]::Round($wallMs, 2))) -ForegroundColor $(if ($cache -eq "HIT") { "Green" } else { "Yellow" })
    } catch {
        Write-Host ("ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
        $fastResults += [pscustomobject]@{
            Request = $i
            Success = $false
            Error = $_.Exception.Message
        }
    }
    Start-Sleep -Milliseconds $betweenMs
}

$fastEnd = Get-Date
$fastTotal = ($fastEnd - $fastStart).TotalMilliseconds

Write-Host ""
Write-Host ("Fast route completed in {0}ms" -f ([math]::Round($fastTotal, 2))) -ForegroundColor Green
Write-Host ""

# Summary
Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host "COMPARISON SUMMARY" -ForegroundColor Cyan
Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host ""

$normalSuccess = $normalResults | Where-Object { $_.Success }
$fastSuccess = $fastResults | Where-Object { $_.Success }

if ($normalSuccess.Count -gt 0 -and $fastSuccess.Count -gt 0) {
    $normalVals = $normalSuccess | ForEach-Object { $_.WallMs }
    $fastVals = $fastSuccess | ForEach-Object { $_.WallMs }
    
    $normalHits = ($normalSuccess | Where-Object { $_.CacheStatus -eq "HIT" }).Count
    $fastHits = ($fastSuccess | Where-Object { $_.CacheStatus -eq "HIT" }).Count
    
    Write-Host "Normal Route (/api/all_products):" -ForegroundColor Yellow
    Write-Host ("  Total Time: {0}ms" -f ([math]::Round($normalTotal, 2)))
    Write-Host ("  Cache Hits: {0}/{1}" -f $normalHits, $iterations)
    Write-Host ("  Min: {0}ms" -f ([math]::Round((($normalVals | Measure-Object -Minimum).Minimum), 2)))
    Write-Host ("  Max: {0}ms" -f ([math]::Round((($normalVals | Measure-Object -Maximum).Maximum), 2)))
    Write-Host ("  Avg: {0}ms" -f ([math]::Round((($normalVals | Measure-Object -Average).Average), 2)))
    Write-Host ""
    
    Write-Host "Fast Route (/api/all_products_fast):" -ForegroundColor Yellow
    Write-Host ("  Total Time: {0}ms" -f ([math]::Round($fastTotal, 2)))
    Write-Host ("  Cache Hits: {0}/{1}" -f $fastHits, $iterations)
    Write-Host ("  Min: {0}ms" -f ([math]::Round((($fastVals | Measure-Object -Minimum).Minimum), 2)))
    Write-Host ("  Max: {0}ms" -f ([math]::Round((($fastVals | Measure-Object -Maximum).Maximum), 2)))
    Write-Host ("  Avg: {0}ms" -f ([math]::Round((($fastVals | Measure-Object -Average).Average), 2)))
    Write-Host ""
    
    $improvement = (($normalVals | Measure-Object -Average).Average) - (($fastVals | Measure-Object -Average).Average)
    $improvementPercent = [math]::Round(($improvement / (($normalVals | Measure-Object -Average).Average)) * 100, 1)
    
    Write-Host "Improvement:" -ForegroundColor Green
    Write-Host ("  Avg Time: {0}ms faster ({1} percent)" -f ([math]::Round($improvement, 2)), $improvementPercent)
    Write-Host ("  Max Time: {0}ms vs {1}ms" -f ([math]::Round((($fastVals | Measure-Object -Maximum).Maximum), 2)), ([math]::Round((($normalVals | Measure-Object -Maximum).Maximum), 2)))
    Write-Host ""
}

Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host "Comparison complete." -ForegroundColor Green
