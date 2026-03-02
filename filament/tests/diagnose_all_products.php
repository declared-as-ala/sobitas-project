<?php

/**
 * Diagnostic script for /api/all_products endpoint
 * 
 * This script makes an HTTP request to the endpoint and measures:
 * - TTFB (Time To First Byte)
 * - Total response time
 * - Response size
 * 
 * Run: docker exec sobitas-backend php tests/diagnose_all_products.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

$url = 'http://localhost:8080/api/all_products';

echo "🔍 Diagnosing /api/all_products endpoint...\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Clear cache first
\Illuminate\Support\Facades\Cache::flush();
echo "✅ Cache cleared\n\n";

// Enable query logging
DB::enableQueryLog();

$startTime = microtime(true);
$startMemory = memory_get_usage();

// Make request using curl for accurate TTFB measurement
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'Accept-Encoding: gzip, deflate, br',
    ],
    CURLOPT_VERBOSE => false,
]);

$ttfbStart = microtime(true);
$response = curl_exec($ch);
$ttfbEnd = microtime(true);
$totalTime = (microtime(true) - $startTime) * 1000;

$ttfb = ($ttfbEnd - $ttfbStart) * 1000; // Approximate TTFB

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$totalTimeCurl = curl_getinfo($ch, CURLINFO_TOTAL_TIME) * 1000;
$ttfbCurl = curl_getinfo($ch, CURLINFO_STARTTRANSFER_TIME) * 1000;
$sizeDownload = curl_getinfo($ch, CURLINFO_SIZE_DOWNLOAD);

curl_close($ch);

$memoryUsed = (memory_get_usage() - $startMemory) / 1024 / 1024;
$peakMemory = memory_get_peak_usage() / 1024 / 1024;

$responseSize = $sizeDownload;
$statusCode = $httpCode;

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📈 RESULTS:\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "Status Code:     {$statusCode}\n";
echo "TTFB (curl):     " . round($ttfbCurl, 2) . "ms ⚠️ (Time To First Byte)\n";
echo "Total Time:      " . round($totalTimeCurl, 2) . "ms\n";
echo "Response Size:   " . number_format($responseSize) . " bytes (" . round($responseSize / 1024, 2) . " KB)\n";
echo "Memory Used:     " . round($memoryUsed, 2) . " MB\n";
echo "Peak Memory:     " . round($peakMemory, 2) . " MB\n";

// Get query log
$queryLog = DB::getQueryLog();
$queryCount = count($queryLog);
$totalQueryTime = array_sum(array_column($queryLog, 'time'));

echo "\n📊 DATABASE QUERIES:\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "Total Queries:   {$queryCount}\n";
echo "Total Query Time: " . round($totalQueryTime, 2) . "ms\n";
echo "Time Outside DB: " . round($totalTimeCurl - $totalQueryTime, 2) . "ms\n";

if ($queryCount > 0) {
    echo "\n🔍 Top 10 Slowest Queries:\n";
    usort($queryLog, fn($a, $b) => $b['time'] <=> $a['time']);
    foreach (array_slice($queryLog, 0, 10) as $i => $query) {
        echo sprintf(
            "\n%d. [%.2fms] %s\n   Bindings: %s\n",
            $i + 1,
            $query['time'],
            $query['query'],
            json_encode($query['bindings'])
        );
    }
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ Diagnostic complete. Check storage/logs/laravel.log for detailed [PERF] logs.\n";
