# PowerShell script to benchmark /api/all_products from host
# Run: .\tests\benchmark_from_host.ps1

$url = "http://localhost:8080/api/all_products"
$iterations = 20
$results = @()

Write-Host "🔥 Benchmarking /api/all_products endpoint" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Clear cache first
Write-Host "✅ Clearing cache..." -ForegroundColor Green
docker exec sobitas-backend php artisan cache:clear | Out-Null

Write-Host ""

for ($i = 1; $i -le $iterations; $i++) {
    Write-Host "Request $i/$iterations... " -NoNewline
    
    $start = Get-Date
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -Headers @{
            "Accept" = "application/json"
            "X-PERF" = "1"
        } -UseBasicParsing -TimeoutSec 30
        
        $end = Get-Date
        $totalMs = ($end - $start).TotalMilliseconds
        
        # Extract performance headers
        $perfData = @{
            Request = $i
            HttpCode = $response.StatusCode
            TTFB = [math]::Round($totalMs, 2)
            TotalMs = [math]::Round($totalMs, 2)
            CacheStatus = $response.Headers["X-Cache"]
            TotalMsHeader = [float]$response.Headers["X-Perf-TotalMs"]
            BootstrapMs = [float]$response.Headers["X-Perf-BootstrapMs"]
            MiddlewareMs = [float]$response.Headers["X-Perf-MiddlewareMs"]
            ControllerMs = [float]$response.Headers["X-Perf-ControllerMs"]
            DbMs = [float]$response.Headers["X-Perf-DbMs"]
            QueryCount = [int]$response.Headers["X-Perf-QueryCount"]
            RedisGetMs = [float]$response.Headers["X-Perf-RedisGetMs"]
            RedisPutMs = [float]$response.Headers["X-Perf-RedisPutMs"]
            SerializeMs = [float]$response.Headers["X-Perf-SerializeMs"]
        }
        
        $results += $perfData
        
        $status = if ($perfData.CacheStatus -eq "HIT") { "HIT" } else { "MISS" }
        $statusIcon = if ($perfData.CacheStatus -eq "HIT") { "OK" } else { "MISS" }
        Write-Host "$statusIcon | TTFB: $($perfData.TTFB)ms | Total: $($perfData.TotalMs)ms" -ForegroundColor $(if ($perfData.CacheStatus -eq "HIT") { "Green" } else { "Yellow" })
        
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 50
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Calculate statistics
$hits = ($results | Where-Object { $_.CacheStatus -eq "HIT" }).Count
$misses = $iterations - $hits
$ttfbValues = $results | ForEach-Object { $_.TTFB }
$totalValues = $results | ForEach-Object { $_.TotalMs }

Write-Host "Cache Performance:" -ForegroundColor Yellow
Write-Host "  Hits: $hits ($([math]::Round($hits/$iterations*100, 1))%)"
Write-Host "  Misses: $misses ($([math]::Round($misses/$iterations*100, 1))%)"
Write-Host ""

Write-Host "TTFB Statistics:" -ForegroundColor Yellow
Write-Host "  Min: $([math]::Round(($ttfbValues | Measure-Object -Minimum).Minimum, 2))ms"
Write-Host "  Max: $([math]::Round(($ttfbValues | Measure-Object -Maximum).Maximum, 2))ms"
Write-Host "  Avg: $([math]::Round(($ttfbValues | Measure-Object -Average).Average, 2))ms"
Write-Host ""

Write-Host "Total Time Statistics:" -ForegroundColor Yellow
Write-Host "  Min: $([math]::Round(($totalValues | Measure-Object -Minimum).Minimum, 2))ms"
Write-Host "  Max: $([math]::Round(($totalValues | Measure-Object -Maximum).Maximum, 2))ms"
Write-Host "  Avg: $([math]::Round(($totalValues | Measure-Object -Average).Average, 2))ms"
Write-Host ""

# Detailed breakdown for cache MISS requests
$missResults = $results | Where-Object { $_.CacheStatus -eq "MISS" }
if ($missResults.Count -gt 0) {
    $firstMiss = $missResults[0]
    Write-Host "Cache MISS Breakdown (first request):" -ForegroundColor Yellow
    Write-Host "  Bootstrap: $($firstMiss.BootstrapMs)ms"
    Write-Host "  Middleware: $($firstMiss.MiddlewareMs)ms"
    Write-Host "  Controller: $($firstMiss.ControllerMs)ms"
    Write-Host "  DB: $($firstMiss.DbMs)ms ($($firstMiss.QueryCount) queries)"
    Write-Host "  Redis Get: $($firstMiss.RedisGetMs)ms"
    Write-Host "  Redis Put: $($firstMiss.RedisPutMs)ms"
    Write-Host "  Serialization: $($firstMiss.SerializeMs)ms"
    Write-Host "  Total: $($firstMiss.TotalMsHeader)ms"
    Write-Host ""
}

# Detailed breakdown for cache HIT requests
$hitResults = $results | Where-Object { $_.CacheStatus -eq "HIT" }
if ($hitResults.Count -gt 0) {
    Write-Host "Cache HIT Breakdown (average):" -ForegroundColor Yellow
    Write-Host "  Bootstrap: $([math]::Round(($hitResults | Measure-Object -Property BootstrapMs -Average).Average, 2))ms"
    Write-Host "  Middleware: $([math]::Round(($hitResults | Measure-Object -Property MiddlewareMs -Average).Average, 2))ms"
    Write-Host "  Controller: $([math]::Round(($hitResults | Measure-Object -Property ControllerMs -Average).Average, 2))ms"
    Write-Host "  DB: $([math]::Round(($hitResults | Measure-Object -Property DbMs -Average).Average, 2))ms"
    Write-Host "  Redis Get: $([math]::Round(($hitResults | Measure-Object -Property RedisGetMs -Average).Average, 2))ms"
    Write-Host "  Serialization: $([math]::Round(($hitResults | Measure-Object -Property SerializeMs -Average).Average, 2))ms"
    Write-Host "  Total: $([math]::Round(($hitResults | Measure-Object -Property TotalMsHeader -Average).Average, 2))ms"
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Benchmark complete. Check storage/logs/laravel.log for detailed [PERF] logs." -ForegroundColor Green
