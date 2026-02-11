<?php

/**
 * Test API endpoint timing
 * Run: docker exec sobitas-backend php tests/test_api_timing.php
 */

$url = $argv[1] ?? 'http://localhost:8080/api/all_products';

echo "Testing: $url\n";
echo str_repeat("=", 60) . "\n\n";

// Test 1: First request (uncached)
echo "Request 1 (uncached):\n";
$start = microtime(true);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept-Encoding: gzip']);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$time1 = (microtime(true) - $start) * 1000;
curl_close($ch);
echo sprintf("  Time: %.2f ms\n", $time1);
echo sprintf("  Status: %d\n", $httpCode);
echo sprintf("  Size: %d bytes\n", strlen($response));
echo "\n";

// Test 2: Second request (cached)
echo "Request 2 (cached):\n";
$start = microtime(true);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept-Encoding: gzip']);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$time2 = (microtime(true) - $start) * 1000;
curl_close($ch);
echo sprintf("  Time: %.2f ms\n", $time2);
echo sprintf("  Status: %d\n", $httpCode);
echo sprintf("  Size: %d bytes\n", strlen($response));
echo "\n";

// Test 3: Third request (cached)
echo "Request 3 (cached):\n";
$start = microtime(true);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept-Encoding: gzip']);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$time3 = (microtime(true) - $start) * 1000;
curl_close($ch);
echo sprintf("  Time: %.2f ms\n", $time3);
echo sprintf("  Status: %d\n", $httpCode);
echo "\n";

echo str_repeat("=", 60) . "\n";
echo sprintf("First request (uncached): %.2f ms\n", $time1);
echo sprintf("Cached requests average: %.2f ms\n", ($time2 + $time3) / 2);
echo sprintf("Improvement: %.1f%% faster when cached\n", (($time1 - ($time2 + $time3) / 2) / $time1) * 100);
echo "\n";

if ($time1 > 2000) {
    echo "⚠️  First request is still slow (> 2s).\n";
    echo "   This might be due to:\n";
    echo "   - Response serialization overhead\n";
    echo "   - Compression middleware\n";
    echo "   - Large response size\n";
} elseif ($time1 > 500) {
    echo "⚠️  First request is moderate (500ms-2s).\n";
    echo "   Consider further optimization.\n";
} else {
    echo "✅ First request is fast (< 500ms)!\n";
}

if (($time2 + $time3) / 2 < 200) {
    echo "✅ Cached requests are fast (< 200ms)!\n";
} else {
    echo "⚠️  Cached requests could be faster.\n";
}
