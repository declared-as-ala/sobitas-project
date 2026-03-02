<?php

/**
 * Nginx Timing Test Script
 * 
 * Makes 10 requests to /api/all_products_fast and captures Nginx timing logs
 * Run: docker exec sobitas-backend php tests/nginx_timing_test.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$url = 'http://backend-nginx/api/all_products_fast';
$iterations = 10;

echo "🔍 Nginx Timing Test\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "Making {$iterations} requests to: {$url}\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$results = [];

for ($i = 1; $i <= $iterations; $i++) {
    echo "Request {$i}/{$iterations}... ";
    
    $start = microtime(true);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
    $ttfb = curl_getinfo($ch, CURLINFO_STARTTRANSFER_TIME);
    $connectTime = curl_getinfo($ch, CURLINFO_CONNECT_TIME);
    
    curl_close($ch);
    $end = microtime(true);
    
    $wallTime = ($end - $start) * 1000; // Convert to ms
    
    // Extract headers
    $headers = [];
    if ($response) {
        $headerEnd = strpos($response, "\r\n\r\n");
        if ($headerEnd !== false) {
            $headerText = substr($response, 0, $headerEnd);
            $headerLines = explode("\r\n", $headerText);
            foreach ($headerLines as $line) {
                if (strpos($line, ':') !== false) {
                    list($key, $value) = explode(':', $line, 2);
                    $headers[trim($key)] = trim($value);
                }
            }
        }
    }
    
    $cacheStatus = $headers['X-Cache'] ?? 'UNKNOWN';
    $perfNextMs = $headers['X-Perf-NextMs'] ?? 'N/A';
    
    $results[] = [
        'request' => $i,
        'http_code' => $httpCode,
        'total_time_ms' => $totalTime * 1000,
        'ttfb_ms' => $ttfb * 1000,
        'connect_time_ms' => $connectTime * 1000,
        'wall_time_ms' => $wallTime,
        'cache' => $cacheStatus,
        'perf_next_ms' => $perfNextMs,
    ];
    
    $status = $httpCode === 200 ? "✅" : "❌";
    echo sprintf("%s %dms (TTFB: %.2fms, Cache: %s, Next: %s)\n", 
        $status, 
        round($totalTime * 1000, 2),
        round($ttfb * 1000, 2),
        $cacheStatus,
        $perfNextMs
    );
    
    // Small delay between requests
    usleep(100000); // 100ms
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📊 Summary\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$totalTimes = array_column($results, 'total_time_ms');
$ttfbTimes = array_column($results, 'ttfb_ms');
$connectTimes = array_column($results, 'connect_time_ms');
$perfNextTimes = array_filter(array_column($results, 'perf_next_ms'), function($v) { return $v !== 'N/A'; });

echo "Total Time (curl):\n";
echo sprintf("  Min: %.2fms\n", min($totalTimes));
echo sprintf("  Max: %.2fms\n", max($totalTimes));
echo sprintf("  Avg: %.2fms\n", array_sum($totalTimes) / count($totalTimes));
echo "\n";

echo "TTFB (Time To First Byte):\n";
echo sprintf("  Min: %.2fms\n", min($ttfbTimes));
echo sprintf("  Max: %.2fms\n", max($ttfbTimes));
echo sprintf("  Avg: %.2fms\n", array_sum($ttfbTimes) / count($ttfbTimes));
echo "\n";

echo "Connect Time:\n";
echo sprintf("  Min: %.2fms\n", min($connectTimes));
echo sprintf("  Max: %.2fms\n", max($connectTimes));
echo sprintf("  Avg: %.2fms\n", array_sum($connectTimes) / count($connectTimes));
echo "\n";

if (!empty($perfNextTimes)) {
    echo "Laravel App Logic (X-Perf-NextMs):\n";
    $perfNextNumeric = array_map('floatval', $perfNextTimes);
    echo sprintf("  Min: %.2fms\n", min($perfNextNumeric));
    echo sprintf("  Max: %.2fms\n", max($perfNextNumeric));
    echo sprintf("  Avg: %.2fms\n", array_sum($perfNextNumeric) / count($perfNextNumeric));
    echo "\n";
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📝 Next Steps:\n";
echo "1. Check Nginx access logs: docker exec sobitas-backend-nginx tail -n 20 /var/log/nginx/access.log\n";
echo "2. Look for 'rt=' (request_time), 'urt=' (upstream_response_time), 'uht=' (upstream_header_time)\n";
echo "3. If 'urt' is high → PHP-FPM is slow\n";
echo "4. If 'rt - urt' is high → Nginx buffering/handshake is slow\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
