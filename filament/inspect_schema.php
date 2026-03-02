<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$tables = ['commandes', 'commande_details', 'products', 'categs'];
$output = "";
foreach ($tables as $table) {
    $output .= "Processing table: $table\n";
    $columns = Schema::getColumnListing($table);
    $output .= print_r($columns, true);
    $output .= "\n";
}
file_put_contents('schema_output.txt', $output);
