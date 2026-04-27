<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('loyalty_cards') || Schema::hasColumn('loyalty_cards', 'assigned_at')) {
            return;
        }

        Schema::table('loyalty_cards', function (Blueprint $table): void {
            $table->timestamp('assigned_at')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('loyalty_cards') || ! Schema::hasColumn('loyalty_cards', 'assigned_at')) {
            return;
        }

        Schema::table('loyalty_cards', function (Blueprint $table): void {
            $table->dropColumn('assigned_at');
        });
    }
};
