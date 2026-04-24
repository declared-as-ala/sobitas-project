<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->unsignedBigInteger('partner_id')->nullable()->after('notes');
            $table->decimal('commission_rate', 5, 2)->nullable()->after('partner_id')
                ->comment('Override partner commission rate for this specific code. Null = use partner default.');

            $table->foreign('partner_id')->references('id')->on('partners')->nullOnDelete();
            $table->index('partner_id');
        });
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropForeign(['partner_id']);
            $table->dropIndex(['partner_id']);
            $table->dropColumn(['partner_id', 'commission_rate']);
        });
    }
};
