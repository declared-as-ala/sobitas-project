<?php

/**
 * Filesystem Benchmark Script
 * 
 * Tests file I/O performance to identify bottlenecks
 * Run: docker exec sobitas-backend php tests/filesystem_benchmark.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$storageLogs = storage_path('logs');
$testFile = $storageLogs . '/benchmark_test.log';

echo "🔍 Filesystem Benchmark\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Ensure directory exists
if (!is_dir($storageLogs)) {
    mkdir($storageLogs, 0755, true);
}

// Test 1: file_exists (reads)
echo "📖 Test 1: file_exists (5000 reads)...\n";
$start = microtime(true);
for ($i = 0; $i < 5000; $i++) {
    file_exists($testFile);
}
$readTime = (microtime(true) - $start);
echo sprintf("  Time: %.3fs\n", $readTime);
echo sprintf("  Result: %s\n", $readTime < 0.1 ? "✅ FAST" : "⚠️ SLOW");
echo "\n";

// Test 2: file_put_contents (writes)
echo "📝 Test 2: file_put_contents (1000 writes, append mode)...\n";
// Clean up previous test
if (file_exists($testFile)) {
    unlink($testFile);
}

$start = microtime(true);
for ($i = 0; $i < 1000; $i++) {
    file_put_contents($testFile, "Test line $i\n", FILE_APPEND);
}
$writeTime = (microtime(true) - $start);
echo sprintf("  Time: %.3fs\n", $writeTime);
echo sprintf("  Result: %s\n", $writeTime < 1.0 ? "✅ FAST" : "❌ EXTREMELY SLOW");
echo "\n";

// Cleanup
if (file_exists($testFile)) {
    unlink($testFile);
}

// Test 3: Check if storage is on named volume
echo "💾 Test 3: Storage location check...\n";
$storagePath = storage_path();
$realPath = realpath($storagePath);
echo sprintf("  Storage path: %s\n", $storagePath);
echo sprintf("  Real path: %s\n", $realPath);
echo sprintf("  Is on named volume: %s\n", str_contains($realPath, '/var/lib/docker/volumes/') ? "✅ YES" : "⚠️ NO (bind mount)");
echo "\n";

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ Benchmark complete\n";
echo "\n";
echo "Expected results after fix:\n";
echo "  - file_exists: < 0.1s ✅\n";
echo "  - file_put_contents: < 1.0s ✅ (currently 37s ❌)\n";
echo "  - Storage on named volume: YES ✅\n";
