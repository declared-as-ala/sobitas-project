<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('clients')) {
            return;
        }

        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'code_postale')) {
                $table->string('code_postale', 20)->nullable()->after('ville');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('clients')) {
            return;
        }

        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'code_postale')) {
                $table->dropColumn('code_postale');
            }
        });
    }
};

