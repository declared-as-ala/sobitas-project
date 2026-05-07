<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('coupons')) {
            return;
        }

        Schema::table('coupons', function (Blueprint $table) {
            if (! Schema::hasColumn('coupons', 'partner_id')) {
                $table->foreignId('partner_id')->nullable()->after('id')->constrained('partners')->nullOnDelete();
            }
            if (! Schema::hasColumn('coupons', 'is_partner_code')) {
                $table->boolean('is_partner_code')->default(false)->after('partner_id');
            }
            if (! Schema::hasColumn('coupons', 'commission_rate')) {
                $table->decimal('commission_rate', 8, 2)->nullable()->after('value');
            }
            if (! Schema::hasColumn('coupons', 'applies_channel')) {
                $table->string('applies_channel', 16)->default('website')->after('applies_to');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('coupons')) {
            return;
        }

        Schema::table('coupons', function (Blueprint $table) {
            if (Schema::hasColumn('coupons', 'partner_id')) {
                $table->dropForeign(['partner_id']);
                $table->dropColumn('partner_id');
            }
            foreach (['is_partner_code', 'commission_rate', 'applies_channel'] as $col) {
                if (Schema::hasColumn('coupons', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
