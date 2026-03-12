<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Make tickets.client_id nullable if it isn't already
        if (Schema::hasTable('tickets') && Schema::hasColumn('tickets', 'client_id')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->unsignedInteger('client_id')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        // We do NOT revert to NOT NULL since existing records might have NULL client_id
    }
};
