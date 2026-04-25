<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('loyalty_card_id')->nullable()->after('client_id')
                ->constrained('loyalty_cards')->nullOnDelete();
            $table->unsignedInteger('loyalty_points_redeemed')->default(0)->after('loyalty_card_id');
            $table->decimal('loyalty_discount_dt', 10, 3)->default(0)->after('loyalty_points_redeemed');
            $table->unsignedInteger('loyalty_points_earned')->default(0)->after('loyalty_discount_dt');
            $table->timestamp('loyalty_processed_at')->nullable()->after('loyalty_points_earned');

            $table->index('loyalty_card_id');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['loyalty_card_id']);
            $table->dropIndex(['loyalty_card_id']);
            $table->dropColumn([
                'loyalty_card_id',
                'loyalty_points_redeemed',
                'loyalty_discount_dt',
                'loyalty_points_earned',
                'loyalty_processed_at',
            ]);
        });
    }
};
