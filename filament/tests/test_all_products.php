<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Testing /api/all_products endpoint...\n\n";

\Illuminate\Support\Facades\DB::enableQueryLog();

$start = microtime(true);

$controller = new \App\Http\Controllers\Api\ApisController();
$request = new \Illuminate\Http\Request();
$result = $controller->allProducts($request);

$time = (microtime(true) - $start) * 1000;

$queries = \Illuminate\Support\Facades\DB::getQueryLog();

echo "Total time: {$time}ms\n";
echo "Query count: " . count($queries) . "\n\n";

echo "Queries executed:\n";
echo str_repeat("─", 80) . "\n";
foreach ($queries as $i => $query) {
    $sql = substr($query['query'], 0, 70);
    echo sprintf("%2d. %6.2fms - %s\n", $i + 1, $query['time'], $sql);
}

echo str_repeat("─", 80) . "\n";
echo "Total query time: " . array_sum(array_column($queries, 'time')) . "ms\n";
echo "Response size: " . strlen(json_encode($result)) . " bytes\n";
