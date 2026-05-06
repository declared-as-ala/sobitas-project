<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Production DBs may have loyalty_cards without printed_at (legacy / partial migrations).
     * Never use ->after('printed_at') unless that column exists.
     */
    public function up(): void
    {
        if (! Schema::hasTable('loyalty_cards')) {
            return;
        }

        if (! Schema::hasColumn('loyalty_cards', 'printed_at')) {
            Schema::table('loyalty_cards', function (Blueprint $table): void {
                $table->timestamp('printed_at')->nullable();
            });
        }

        if (! Schema::hasColumn('loyalty_cards', 'print_status')) {
            Schema::table('loyalty_cards', function (Blueprint $table): void {
                $table->enum('print_status', ['not_printed', 'exported', 'printed', 'delivered_to_store'])
                    ->default('not_printed');
            });
        }

        if (! Schema::hasColumn('loyalty_cards', 'exported_at')) {
            Schema::table('loyalty_cards', function (Blueprint $table): void {
                $table->timestamp('exported_at')->nullable();
            });
        }

        if (! Schema::hasColumn('loyalty_cards', 'delivered_to_store_at')) {
            Schema::table('loyalty_cards', function (Blueprint $table): void {
                $table->timestamp('delivered_to_store_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('loyalty_cards')) {
            return;
        }

        Schema::table('loyalty_cards', function (Blueprint $table): void {
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
