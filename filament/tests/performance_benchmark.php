<?php

/**
 * Performance Benchmark Script
 * 
 * Run: docker exec -it sobitas-backend php tests/performance_benchmark.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

function benchmark($name, $callback) {
    $start = microtime(true);
    $memoryStart = memory_get_usage();
    $result = $callback();
    $time = (microtime(true) - $start) * 1000;
    $memory = (memory_get_usage() - $memoryStart) / 1024 / 1024;
    
    echo sprintf("%-50s %8.2f ms  %6.2f MB\n", $name, $time, $memory);
    return $result;
}

echo "\n";
echo "╔════════════════════════════════════════════════════════════════╗\n";
echo "║           Performance Benchmark - Sobitas Project             ║\n";
echo "╚════════════════════════════════════════════════════════════════╝\n";
echo "\n";
echo sprintf("%-50s %10s  %10s\n", "Test", "Time", "Memory");
echo str_repeat("─", 72) . "\n";

// Test 1: Cache operations
benchmark("Cache: 100 write/read operations", function() {
    for ($i = 0; $i < 100; $i++) {
        \Illuminate\Support\Facades\Cache::put("bench_test_{$i}", "value_{$i}", 60);
        \Illuminate\Support\Facades\Cache::get("bench_test_{$i}");
    }
});

// Test 2: Database queries with eager loading
benchmark("DB: Products with relations (25 records)", function() {
    \Illuminate\Support\Facades\DB::enableQueryLog();
    $products = \App\Models\Product::where('publier', 1)
        ->with(['brand', 'sousCategorie'])
        ->limit(25)
        ->get();
    $queries = \Illuminate\Support\Facades\DB::getQueryLog();
    echo sprintf("   └─ Query count: %d queries\n", count($queries));
    return $products;
});

// Test 3: Commandes list
benchmark("DB: Commandes list (25 records)", function() {
    \App\Models\Commande::limit(25)->get();
});

// Test 4: API controller method (simulated)
benchmark("API: Categories endpoint (simulated)", function() {
    $controller = new \App\Http\Controllers\Api\ApisController();
    $request = new \Illuminate\Http\Request();
    return $controller->categories($request);
});

// Test 5: Cache hit test
benchmark("Cache: 1000 reads (should be fast)", function() {
    \Illuminate\Support\Facades\Cache::put('bench_hit_test', 'data', 60);
    for ($i = 0; $i < 1000; $i++) {
        \Illuminate\Support\Facades\Cache::get('bench_hit_test');
    }
});

echo str_repeat("─", 72) . "\n";
echo "\n";
echo "✅ Benchmark complete!\n";
echo "\n";
echo "Expected Results:\n";
echo "  • Cache operations: < 5ms per operation\n";
echo "  • Database queries: < 20ms per query\n";
echo "  • API endpoints: < 200ms\n";
echo "  • Memory usage: < 50MB per test\n";
echo "\n";
