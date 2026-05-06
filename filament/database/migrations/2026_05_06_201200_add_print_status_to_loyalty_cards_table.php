<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_cards', function (Blueprint $table) {
            if (! Schema::hasColumn('loyalty_cards', 'print_status')) {
                $table->enum('print_status', ['not_printed', 'exported', 'printed', 'delivered_to_store'])
                    ->default('not_printed')
                    ->after('status');
            }
            if (! Schema::hasColumn('loyalty_cards', 'exported_at')) {
                $table->timestamp('exported_at')->nullable()->after('printed_at');
            }
            if (! Schema::hasColumn('loyalty_cards', 'delivered_to_store_at')) {
                $table->timestamp('delivered_to_store_at')->nullable()->after('exported_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_cards', function (Blueprint $table) {
            if (Schema::hasColumn('loyalty_cards', 'delivered_to_store_at')) {
                $table->dropColumn('delivered_to_store_at');
            }
            if (Schema::hasColumn('loyalty_cards', 'exported_at')) {
                $table->dropColumn('exported_at');
            }
            if (Schema::hasColumn('loyalty_cards', 'print_status')) {
                $table->dropColumn('print_status');
            }
        });
    }
};
