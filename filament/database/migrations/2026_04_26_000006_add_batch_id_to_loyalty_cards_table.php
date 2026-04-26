<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('loyalty_cards')) {
            return;
        }

        Schema::table('loyalty_cards', function (Blueprint $table): void {
            if (! Schema::hasColumn('loyalty_cards', 'batch_id')) {
                $table->unsignedBigInteger('batch_id')->nullable()->after('id');
                $table->index('batch_id');
            }
        });

        if (Schema::hasColumn('loyalty_cards', 'batch_id') && Schema::hasTable('loyalty_card_batches')) {
            Schema::table('loyalty_cards', function (Blueprint $table): void {
                try {
                    $table->foreign('batch_id')
                        ->references('id')
                        ->on('loyalty_card_batches')
                        ->nullOnDelete();
                } catch (\Throwable) {
                    // FK may already exist or be unsupported in legacy schema.
                }
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('loyalty_cards') || ! Schema::hasColumn('loyalty_cards', 'batch_id')) {
            return;
        }

        Schema::table('loyalty_cards', function (Blueprint $table): void {
            try {
                $table->dropForeign(['batch_id']);
            } catch (\Throwable) {
            }

            try {
                $table->dropIndex(['batch_id']);
            } catch (\Throwable) {
            }

            $table->dropColumn('batch_id');
        });
    }
};
