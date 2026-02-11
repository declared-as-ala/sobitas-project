<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;

if (Schema::hasColumn('commandes', 'refund_amount')) {
    echo "refund_amount exists\n";
} else {
    echo "refund_amount MISSING\n";
}
