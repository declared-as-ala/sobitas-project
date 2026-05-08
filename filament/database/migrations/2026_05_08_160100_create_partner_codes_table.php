<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('partner_codes')) {
            return;
        }

        Schema::create('partner_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained('partners')->cascadeOnDelete();
            $table->string('code', 64)->unique();
            $table->string('discount_type', 16)->nullable();
            $table->decimal('discount_value', 14, 3)->default(0);
            $table->decimal('commission_rate', 8, 2)->nullable();
            $table->string('status', 16)->default('active');
            $table->unsignedInteger('used_count')->default(0);
            $table->unsignedBigInteger('legacy_coupon_id')->nullable()->unique();
            $table->timestamps();

            $table->index(['partner_id', 'status']);
        });

        if (! Schema::hasTable('coupons')) {
            return;
        }

        $coupons = DB::table('coupons')
            ->where('is_partner_code', true)
            ->whereNotNull('partner_id')
            ->orderBy('id')
            ->get();

        foreach ($coupons as $c) {
            $discountType = match ((string) ($c->type ?? 'percent')) {
                'fixed' => 'fixed',
                default => 'percentage',
            };

            $used = 0;
            if (Schema::hasTable('coupon_redemptions')) {
                $used = (int) DB::table('coupon_redemptions')
                    ->where('coupon_id', $c->id)
                    ->whereNotNull('ticket_id')
                    ->count();
            }

            DB::table('partner_codes')->insert([
                'partner_id' => $c->partner_id,
                'code' => strtoupper(trim((string) $c->code)),
                'discount_type' => $discountType,
                'discount_value' => (float) ($c->value ?? 0),
                'commission_rate' => $c->commission_rate !== null ? (float) $c->commission_rate : null,
                'status' => ! empty($c->is_active) ? 'active' : 'inactive',
                'used_count' => $used,
                'legacy_coupon_id' => $c->id,
                'created_at' => $c->created_at ?? now(),
                'updated_at' => $c->updated_at ?? now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_codes');
    }
};
