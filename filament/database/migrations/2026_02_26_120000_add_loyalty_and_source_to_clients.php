<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'source')) {
                $table->string('source', 50)->nullable()->comment('e.g. online, boutique');
            }
            if (! Schema::hasColumn('clients', 'loyalty_enabled')) {
                $table->boolean('loyalty_enabled')->default(false);
            }
            if (! Schema::hasColumn('clients', 'loyalty_percent')) {
                $table->unsignedTinyInteger('loyalty_percent')->default(20);
            }
            if (! Schema::hasColumn('clients', 'loyalty_note')) {
                $table->string('loyalty_note', 255)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $columns = ['source', 'loyalty_enabled', 'loyalty_percent', 'loyalty_note'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('clients', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
