# benchmark_parallel.ps1 (ASCII-only, PowerShell 5.1 compatible)
# Run: .\benchmark_parallel.ps1

$ErrorActionPreference = "Continue"

$url        = "http://localhost:8080/api/all_products"
$parallel   = 10
$sequential = 30
$timeoutSec = 30
$betweenMs  = 50
$warmSleep  = 1

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

Write-Host "Parallel + Sequential Benchmark" -ForegroundColor Cyan
Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host ""

# Clear cache (best-effort)
Write-Host "Clearing cache..." -ForegroundColor Green
try {
    docker exec sobitas-backend php artisan cache:clear | Out-Null
} catch {
    Write-Host "WARN: Could not clear cache (docker exec failed). Continuing..." -ForegroundColor Yellow
}
Write-Host ""

# Warm cache (best-effort)
Write-Host "Warming cache..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $url -Method GET -Headers @{ "X-PERF" = "1" } -UseBasicParsing -TimeoutSec $timeoutSec | Out-Null
    Start-Sleep -Seconds $warmSleep
} catch {
    Write-Host "WARN: Warm-up failed. Continuing..." -ForegroundColor Yellow
}
Write-Host ""

# -----------------------
# PARALLEL
# -----------------------
Write-Host ("Running {0} parallel requests..." -f $parallel) -ForegroundColor Cyan

$parallelJobs  = @()
$parallelStart = Get-Date

for ($i = 1; $i -le $parallel; $i++) {
    $job = Start-Job -ScriptBlock {
        param($u, $idx, $tsec)

        $start = Get-Date
        try {
            $resp = Invoke-WebRequest -Uri $u -Method GET -Headers @{ "X-PERF" = "1" } -UseBasicParsing -TimeoutSec $tsec
            $end  = Get-Date

            $cache = $null
            foreach ($k in $resp.Headers.Keys) { if ($k -ieq "X-Cache") { $cache = $resp.Headers[$k] } }

            $perfTotal = $null
            foreach ($k in $resp.Headers.Keys) { if ($k -ieq "X-Perf-TotalMs") { $perfTotal = $resp.Headers[$k] } }

            [pscustomobject]@{
                Request     = $idx
                Success     = $true
                WallMs      = ($end - $start).TotalMilliseconds
                CacheStatus = $cache
                PerfTotalMs = $perfTotal
            }
        } catch {
            [pscustomobject]@{
                Request = $idx
                Success = $false
                Error   = $_.Exception.Message
            }
        }
    } -ArgumentList $url, $i, $timeoutSec

    $parallelJobs += $job
}

$parallelResults = $parallelJobs | Wait-Job | Receive-Job
$parallelJobs | Remove-Job | Out-Null

$parallelEnd   = Get-Date
$parallelTotal = ($parallelEnd - $parallelStart).TotalMilliseconds

Write-Host ("Parallel completed in {0}ms" -f ([math]::Round($parallelTotal, 2))) -ForegroundColor Green
Write-Host ""

$successfulPar = $parallelResults | Where-Object { $_.Success }
$failedPar     = $parallelResults | Where-Object { -not $_.Success }

Write-Host "Parallel stats:" -ForegroundColor Yellow
Write-Host ("  Successful: {0}/{1}" -f $successfulPar.Count, $parallel)
Write-Host ("  Failed:     {0}/{1}" -f $failedPar.Count, $parallel)

if ($successfulPar.Count -gt 0) {
    $vals = $successfulPar | ForEach-Object { $_.WallMs }
    Write-Host ("  Min: {0}ms" -f ([math]::Round((($vals | Measure-Object -Minimum).Minimum), 2)))
    Write-Host ("  Max: {0}ms" -f ([math]::Round((($vals | Measure-Object -Maximum).Maximum), 2)))
    Write-Host ("  Avg: {0}ms" -f ([math]::Round((($vals | Measure-Object -Average).Average), 2)))
}
Write-Host ""

if ($failedPar.Count -gt 0) {
    Write-Host "Parallel failures:" -ForegroundColor Red
    $failedPar | Sort-Object Request | ForEach-Object {
        Write-Host ("  #{0} ERROR: {1}" -f $_.Request, $_.Error) -ForegroundColor Red
    }
    Write-Host ""
}

# -----------------------
# SEQUENTIAL
# -----------------------
Write-Host ("Running {0} sequential requests..." -f $sequential) -ForegroundColor Cyan

$sequentialResults = @()
$sequentialStart   = Get-Date

for ($i = 1; $i -le $sequential; $i++) {
    Write-Host ("Request {0}/{1}... " -f $i, $sequential) -NoNewline

    $start = Get-Date
    try {
        $resp = Invoke-WebRequest -Uri $url -Method GET -Headers @{ "X-PERF" = "1" } -UseBasicParsing -TimeoutSec $timeoutSec
        $end  = Get-Date

        $cache  = Get-HeaderValue -Headers $resp.Headers -Name "X-Cache"
        $perfMs = Get-HeaderValue -Headers $resp.Headers -Name "X-Perf-TotalMs"

        $wallMs = ($end - $start).TotalMilliseconds

        $sequentialResults += [pscustomobject]@{
            Request     = $i
            Success     = $true
            WallMs      = $wallMs
            CacheStatus = $cache
            PerfTotalMs = $perfMs
        }

        $status = if ($cache -eq "HIT") { "HIT" } else { "MISS" }
        $color  = if ($cache -eq "HIT") { "Green" } else { "Yellow" }
        $perfPrint = if ($perfMs) { $perfMs } else { "-" }

        Write-Host ("{0} | Wall: {1}ms | X-Perf-TotalMs: {2}" -f $status, ([math]::Round($wallMs,2)), $perfPrint) -ForegroundColor $color
    } catch {
        Write-Host ("ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
        $sequentialResults += [pscustomobject]@{
            Request = $i
            Success = $false
            Error   = $_.Exception.Message
        }
    }

    Start-Sleep -Milliseconds $betweenMs
}

$sequentialEnd   = Get-Date
$sequentialTotal = ($sequentialEnd - $sequentialStart).TotalMilliseconds

Write-Host ""
Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host ""

$successfulSeq = $sequentialResults | Where-Object { $_.Success }
$failedSeq     = $sequentialResults | Where-Object { -not $_.Success }

Write-Host ("Total Time: {0}ms" -f ([math]::Round($sequentialTotal, 2))) -ForegroundColor Yellow
Write-Host ("Successful: {0}/{1}" -f $successfulSeq.Count, $sequential) -ForegroundColor Yellow
Write-Host ("Failed:     {0}/{1}" -f $failedSeq.Count, $sequential) -ForegroundColor Yellow
Write-Host ""

if ($successfulSeq.Count -gt 0) {
    $vals = $successfulSeq | ForEach-Object { $_.WallMs }
    $hits = ($successfulSeq | Where-Object { $_.CacheStatus -eq "HIT" }).Count
    $hitPercent = [math]::Round(($hits / $sequential) * 100, 1)

    Write-Host "Sequential stats:" -ForegroundColor Yellow
    Write-Host ("  Cache Hits: {0} ({1} percent)" -f $hits, $hitPercent)
    Write-Host ("  Min: {0}ms" -f ([math]::Round((($vals | Measure-Object -Minimum).Minimum), 2)))
    Write-Host ("  Max: {0}ms" -f ([math]::Round((($vals | Measure-Object -Maximum).Maximum), 2)))
    Write-Host ("  Avg: {0}ms" -f ([math]::Round((($vals | Measure-Object -Average).Average), 2)))
    Write-Host ""
}

Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host "Benchmark complete." -ForegroundColor Green
