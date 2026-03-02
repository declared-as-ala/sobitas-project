# Benchmark First Request Performance (Cold vs Warm)
# Reliable on Windows: uses curl.exe for TTFB + Total + reads headers.
# Run: powershell -ExecutionPolicy Bypass -File .\benchmark_first_request.ps1

$ErrorActionPreference = "Continue"

# --- Config ---
$url        = "http://localhost:8080/api/all_products_fast"
$iterations = 10
$timeoutSec = 30

# If your container name differs, change it here:
$backendContainer = "sobitas-backend"

# --- Helpers ---
function Clear-AppCache {
    param([string]$Container)
    Write-Host "Clearing app cache (cold start)..." -ForegroundColor Yellow
    try {
        docker exec $Container php artisan cache:clear | Out-Null
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "WARN: Could not clear cache (docker exec failed)." -ForegroundColor Yellow
    }
}

function Parse-Headers {
    param([string]$RawHeaders)
    $lines = $RawHeaders -split "`r?`n"
    $map = @{}
    foreach ($line in $lines) {
        if ($line -match '^\s*$') { continue }
        if ($line -match '^([^:]+):\s*(.*)$') {
            $name = $matches[1].Trim().ToLower()
            $val  = $matches[2].Trim()
            $map[$name] = $val
        }
    }
    return $map
}

function Curl-Measure {
    param(
        [string]$Url,
        [int]$TimeoutSec
    )

    $cmd = @(
        "curl.exe",
        "-s",
        "-D", "-",
        "-o", "NUL",
        "--http1.1",
        "--max-time", "$TimeoutSec",
        "-w", "TTFB=%{time_starttransfer};TOTAL=%{time_total}`n",
        $Url
    )

    $output = & $cmd[0] $cmd[1..($cmd.Length-1)] 2>$null

    $allLines = $output -split "`r?`n"
    $timingLine = ($allLines | Where-Object { $_ -match '^TTFB=' } | Select-Object -Last 1)
    if (-not $timingLine) {
        return [pscustomobject]@{
            Ok = $false
            Error = "Could not parse curl timing output."
        }
    }

    $headersText = ($allLines | Where-Object { $_ -notmatch '^TTFB=' }) -join "`n"
    $headers = Parse-Headers -RawHeaders $headersText

    # Parse timings (seconds -> ms)
    $parts = $timingLine -split '[=;]'
    $ttfbSec  = [double]$parts[1]
    $totalSec = [double]$parts[3]

    $xCache = $null
    if ($headers.ContainsKey("x-cache")) { $xCache = $headers["x-cache"] }

    $xNext = $null
    if ($headers.ContainsKey("x-perf-nextms")) { $xNext = $headers["x-perf-nextms"] }

    return [pscustomobject]@{
        Ok        = $true
        TTFBms    = [math]::Round($ttfbSec * 1000, 2)
        Totalms   = [math]::Round($totalSec * 1000, 2)
        Cache     = $xCache
        PerfNext  = $xNext
        Headers   = $headers
    }
}

# --- UI ---
Write-Host "First Request Performance Benchmark (Cold vs Warm)" -ForegroundColor Cyan
Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host ""
Write-Host ("URL: {0}" -f $url) -ForegroundColor Gray
Write-Host ""

# --- Cold cache ---
Clear-AppCache -Container $backendContainer

Write-Host "Testing FIRST request (cold cache)..." -ForegroundColor Cyan
$first = Curl-Measure -Url $url -TimeoutSec $timeoutSec
if (-not $first.Ok) {
    Write-Host ("ERROR: {0}" -f $first.Error) -ForegroundColor Red
    exit 1
}

$firstColor = if ($first.TTFBms -lt 700) { "Green" } else { "Yellow" }
Write-Host ("  First: TTFB {0}ms | Total {1}ms | X-Cache {2} | X-Perf-NextMs {3}" -f $first.TTFBms, $first.Totalms, $first.Cache, $first.PerfNext) -ForegroundColor $firstColor
Write-Host ""

Start-Sleep -Seconds 1

# --- Warm cache ---
Write-Host ("Testing {0} subsequent requests (warm cache)..." -f $iterations) -ForegroundColor Cyan
$warm = @()

for ($i = 1; $i -le $iterations; $i++) {
    $r = Curl-Measure -Url $url -TimeoutSec $timeoutSec
    if ($r.Ok) {
        $warm += [pscustomobject]@{
            Request = $i
            TTFBms  = $r.TTFBms
            Totalms = $r.Totalms
            Cache   = $r.Cache
            PerfNext = $r.PerfNext
        }

        $isHit = ($r.Cache -eq "HIT")
        $color = if ($r.TTFBms -lt 120 -and $isHit) { "Green" } elseif ($r.TTFBms -lt 250) { "Yellow" } else { "Red" }
        $tag = if ($isHit) { "HIT" } else { "MISS" }

        Write-Host ("  {0}/{1}: {2} | TTFB {3}ms | Total {4}ms | Next {5}" -f $i, $iterations, $tag, $r.TTFBms, $r.Totalms, $r.PerfNext) -ForegroundColor $color
    } else {
        Write-Host ("  {0}/{1}: ERROR - {2}" -f $i, $iterations, $r.Error) -ForegroundColor Red
    }

    Start-Sleep -Milliseconds 150
}

Write-Host ""
Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host ""

# Cold summary
Write-Host "Cold (first request):" -ForegroundColor Yellow
Write-Host ("  TTFB:  {0}ms" -f $first.TTFBms)
Write-Host ("  Total: {0}ms" -f $first.Totalms)
Write-Host ("  X-Cache: {0}" -f $first.Cache)

$coldStatus = if ($first.TTFBms -lt 700) { "PASS" } else { "FAIL" }
Write-Host ("  Target: < 700ms -> {0}" -f $coldStatus)
Write-Host ""

# Warm summary
if ($warm.Count -gt 0) {
    $ttfbList = $warm | Select-Object -ExpandProperty TTFBms
    $hits = ($warm | Where-Object { $_.Cache -eq "HIT" }).Count
    $avg = ($ttfbList | Measure-Object -Average).Average
    $min = ($ttfbList | Measure-Object -Minimum).Minimum
    $max = ($ttfbList | Measure-Object -Maximum).Maximum

    Write-Host "Warm (subsequent requests):" -ForegroundColor Yellow
    Write-Host ("  Cache HIT: {0}/{1}" -f $hits, $iterations)
    Write-Host ("  Min TTFB: {0}ms" -f ([math]::Round($min, 2)))
    Write-Host ("  Max TTFB: {0}ms" -f ([math]::Round($max, 2)))
    Write-Host ("  Avg TTFB: {0}ms" -f ([math]::Round($avg, 2)))

    $warmStatus = if ($avg -lt 120) { "PASS" } else { "FAIL" }
    Write-Host ("  Target Avg: < 120ms -> {0}" -f $warmStatus)
    Write-Host ""
}

Write-Host ("-" * 78) -ForegroundColor Cyan
Write-Host "Benchmark complete." -ForegroundColor Green
