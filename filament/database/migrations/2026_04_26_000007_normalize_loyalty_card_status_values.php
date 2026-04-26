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

        DB::table('loyalty_cards')
            ->whereNull('status')
            ->orWhere('status', '')
            ->update(['status' => 'available']);
    }

    public function down(): void
    {
        // no-op: data normalization should not be reverted
    }
};
