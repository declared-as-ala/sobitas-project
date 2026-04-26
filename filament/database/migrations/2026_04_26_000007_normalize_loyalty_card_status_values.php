<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('loyalty_cards') || ! Schema::hasColumn('loyalty_cards', 'status')) {
            return;
        }

        $columnType = DB::table('information_schema.COLUMNS')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', 'loyalty_cards')
            ->where('COLUMN_NAME', 'status')
            ->value('COLUMN_TYPE');

        $allowedStatuses = [];
        if (is_string($columnType) && preg_match("/^enum\((.*)\)$/i", $columnType, $matches) === 1) {
            $allowedStatuses = array_values(array_filter(array_map(
                static fn (string $value): string => trim($value, " '\""),
                explode(',', $matches[1])
            )));
        }

        if ($allowedStatuses === []) {
            return;
        }

        $fallbackStatus = in_array('available', $allowedStatuses, true)
            ? 'available'
            : $allowedStatuses[0];

        DB::table('loyalty_cards')
            ->whereNull('status')
            ->orWhereRaw("TRIM(status) = ''")
            ->update(['status' => $fallbackStatus]);
    }

    public function down(): void
    {
        // no-op: data normalization should not be reverted
    }
};
