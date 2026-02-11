<?php
use Illuminate\Support\Facades\DB;
try {
    $tables = DB::select('SHOW TABLES');
    foreach ($tables as $table) {
        foreach ($table as $key => $value) {
            echo $value . "\n";
        }
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
