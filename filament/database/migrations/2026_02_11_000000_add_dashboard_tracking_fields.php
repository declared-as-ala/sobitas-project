<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add tracking fields to commandes table for advanced dashboard analytics.
 *
 * Fields added:
 * - delivered_at: Track actual delivery time for fulfillment metrics
 * - refund_amount: Track refund amounts for net revenue calculation
 * - discount_amount: Track discount amounts for net revenue calculation
 * - payment_method: Track payment methods for payment analytics
 * - is_returning_customer: Cached flag to optimize customer analytics
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            // Delivery tracking
            if (! Schema::hasColumn('commandes', 'delivered_at')) {
                $table->timestamp('delivered_at')->nullable();
            }

            // Financial tracking
            if (! Schema::hasColumn('commandes', 'refund_amount')) {
                $table->decimal('refund_amount', 10, 2)->default(0);
            }

            if (! Schema::hasColumn('commandes', 'discount_amount')) {
                $table->decimal('discount_amount', 10, 2)->default(0);
            }

            // Payment method tracking
            if (! Schema::hasColumn('commandes', 'payment_method')) {
                $table->string('payment_method', 50)->nullable();
            }

            // Customer analytics optimization
            if (! Schema::hasColumn('commandes', 'is_returning_customer')) {
                $table->boolean('is_returning_customer')->default(false);
            }
        });
    }

    public function down(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            $columns = ['delivered_at', 'refund_amount', 'discount_amount', 'payment_method', 'is_returning_customer'];

            foreach ($columns as $column) {
                if (Schema::hasColumn('commandes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
