<?php

/**
 * Benchmark script: Run 20 consecutive requests to /api/all_products
 * and collect timing data from headers and logs
 * 
 * Run: docker exec sobitas-backend php tests/benchmark_20_requests.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Cache;

$url = 'http://localhost:8080/api/all_products';
$iterations = 20;

echo "🔥 Benchmarking /api/all_products endpoint\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Clear cache first
Cache::flush();
echo "✅ Cache cleared\n\n";

$results = [];

for ($i = 1; $i <= $iterations; $i++) {
    echo "Request {$i}/{$iterations}... ";
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'X-PERF: 1', // Enable profiling
        ],
        CURLOPT_VERBOSE => false,
    ]);

    $start = microtime(true);
    $response = curl_exec($ch);
    $totalTime = (microtime(true) - $start) * 1000;

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ttfb = curl_getinfo($ch, CURLINFO_STARTTRANSFER_TIME) * 1000;
    $sizeDownload = curl_getinfo($ch, CURLINFO_SIZE_DOWNLOAD);

    // Parse headers
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $headers = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);

    curl_close($ch);

    // Extract performance headers
    $perfHeaders = [];
    foreach (explode("\n", $headers) as $line) {
        if (preg_match('/^X-Perf-(\w+):\s*(.+)$/i', $line, $matches)) {
            $perfHeaders[strtolower($matches[1])] = trim($matches[2]);
        }
        if (preg_match('/^X-Cache:\s*(.+)$/i', $line, $matches)) {
            $perfHeaders['cache_status'] = trim($matches[1]);
        }
    }

    $result = [
        'request' => $i,
        'http_code' => $httpCode,
        'ttfb_ms' => round($ttfb, 2),
        'total_ms' => round($totalTime, 2),
        'size_bytes' => $sizeDownload,
        'cache_status' => $perfHeaders['cache_status'] ?? 'UNKNOWN',
        'total_ms_header' => (float) ($perfHeaders['totalms'] ?? 0),
        'bootstrap_ms' => (float) ($perfHeaders['bootstrapms'] ?? 0),
        'middleware_ms' => (float) ($perfHeaders['middlewarems'] ?? 0),
        'controller_ms' => (float) ($perfHeaders['controllerms'] ?? 0),
        'db_ms' => (float) ($perfHeaders['dbms'] ?? 0),
        'query_count' => (int) ($perfHeaders['querycount'] ?? 0),
        'redis_get_ms' => (float) ($perfHeaders['redisgetms'] ?? 0),
        'redis_put_ms' => (float) ($perfHeaders['redisputms'] ?? 0),
        'serialize_ms' => (float) ($perfHeaders['serializems'] ?? 0),
    ];

    $results[] = $result;

    $status = $result['cache_status'] === 'HIT' ? '✅ HIT' : '❌ MISS';
    echo "{$status} | TTFB: {$result['ttfb_ms']}ms | Total: {$result['total_ms']}ms\n";
    
    // Small delay to avoid overwhelming
    usleep(50000); // 50ms
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📊 SUMMARY\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Calculate statistics
$ttfbValues = array_column($results, 'ttfb_ms');
$totalValues = array_column($results, 'total_ms');
$hits = count(array_filter($results, fn($r) => $r['cache_status'] === 'HIT'));
$misses = $iterations - $hits;

echo "Cache Performance:\n";
echo "  Hits: {$hits} ({$hits}%)\n";
echo "  Misses: {$misses} ({$misses}%)\n\n";

echo "TTFB Statistics:\n";
echo "  Min: " . round(min($ttfbValues), 2) . "ms\n";
echo "  Max: " . round(max($ttfbValues), 2) . "ms\n";
echo "  Avg: " . round(array_sum($ttfbValues) / count($ttfbValues), 2) . "ms\n";
echo "  Median: " . round($ttfbValues[count($ttfbValues) / 2], 2) . "ms\n\n";

echo "Total Time Statistics:\n";
echo "  Min: " . round(min($totalValues), 2) . "ms\n";
echo "  Max: " . round(max($totalValues), 2) . "ms\n";
echo "  Avg: " . round(array_sum($totalValues) / count($totalValues), 2) . "ms\n";
echo "  Median: " . round($totalValues[count($totalValues) / 2], 2) . "ms\n\n";

// Detailed breakdown for cache MISS requests
$missResults = array_filter($results, fn($r) => $r['cache_status'] === 'MISS');
if (count($missResults) > 0) {
    echo "Cache MISS Breakdown (first request):\n";
    $firstMiss = reset($missResults);
    echo "  Bootstrap: {$firstMiss['bootstrap_ms']}ms\n";
    echo "  Middleware: {$firstMiss['middleware_ms']}ms\n";
    echo "  Controller: {$firstMiss['controller_ms']}ms\n";
    echo "  DB: {$firstMiss['db_ms']}ms ({$firstMiss['query_count']} queries)\n";
    echo "  Redis Get: {$firstMiss['redis_get_ms']}ms\n";
    echo "  Redis Put: {$firstMiss['redis_put_ms']}ms\n";
    echo "  Serialization: {$firstMiss['serialize_ms']}ms\n";
    echo "  Total: {$firstMiss['total_ms_header']}ms\n\n";
}

// Detailed breakdown for cache HIT requests
$hitResults = array_filter($results, fn($r) => $r['cache_status'] === 'HIT');
if (count($hitResults) > 0) {
    $avgHit = [
        'bootstrap_ms' => array_sum(array_column($hitResults, 'bootstrap_ms')) / count($hitResults),
        'middleware_ms' => array_sum(array_column($hitResults, 'middleware_ms')) / count($hitResults),
        'controller_ms' => array_sum(array_column($hitResults, 'controller_ms')) / count($hitResults),
        'db_ms' => array_sum(array_column($hitResults, 'db_ms')) / count($hitResults),
        'redis_get_ms' => array_sum(array_column($hitResults, 'redis_get_ms')) / count($hitResults),
        'serialize_ms' => array_sum(array_column($hitResults, 'serialize_ms')) / count($hitResults),
        'total_ms_header' => array_sum(array_column($hitResults, 'total_ms_header')) / count($hitResults),
    ];
    
    echo "Cache HIT Breakdown (average):\n";
    echo "  Bootstrap: " . round($avgHit['bootstrap_ms'], 2) . "ms\n";
    echo "  Middleware: " . round($avgHit['middleware_ms'], 2) . "ms\n";
    echo "  Controller: " . round($avgHit['controller_ms'], 2) . "ms\n";
    echo "  DB: " . round($avgHit['db_ms'], 2) . "ms\n";
    echo "  Redis Get: " . round($avgHit['redis_get_ms'], 2) . "ms\n";
    echo "  Serialization: " . round($avgHit['serialize_ms'], 2) . "ms\n";
    echo "  Total: " . round($avgHit['total_ms_header'], 2) . "ms\n\n";
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ Benchmark complete. Check storage/logs/laravel.log for detailed [PERF] logs.\n";
