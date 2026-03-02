<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }
        if (! Schema::hasColumn('products', 'code_product')) {
            Schema::table('products', function (Blueprint $table) {
                $table->string('code_product', 100)->nullable()->after('id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'code_product')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('code_product');
            });
        }
    }
};
