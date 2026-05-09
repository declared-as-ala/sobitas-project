<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('partners')) {
            return;
        }

        Schema::table('partners', function (Blueprint $table) {
            if (! Schema::hasColumn('partners', 'business_name')) {
                $table->string('business_name')->nullable()->after('name');
            }

            if (! Schema::hasColumn('partners', 'address')) {
                $after = Schema::hasColumn('partners', 'phone') ? 'phone' : 'email';
                $table->text('address')->nullable()->after($after);
            }

            if (! Schema::hasColumn('partners', 'avatar')) {
                $after = Schema::hasColumn('partners', 'address') ? 'address' : 'phone';
                $table->string('avatar', 512)->nullable()->after($after);
            }

            if (! Schema::hasColumn('partners', 'payment_method')) {
                $after = Schema::hasColumn('partners', 'commission_rate')
                    ? 'commission_rate'
                    : (Schema::hasColumn('partners', 'default_commission_rate') ? 'default_commission_rate' : 'status');
                $table->string('payment_method', 64)->nullable()->after($after);
            }

            if (! Schema::hasColumn('partners', 'bank_name')) {
                $after = Schema::hasColumn('partners', 'payment_method') ? 'payment_method' : 'status';
                $table->string('bank_name', 128)->nullable()->after($after);
            }

            if (! Schema::hasColumn('partners', 'rib_or_iban')) {
                $after = Schema::hasColumn('partners', 'bank_name') ? 'bank_name' : 'payment_method';
                $table->string('rib_or_iban', 128)->nullable()->after($after);
            }

            if (! Schema::hasColumn('partners', 'payout_notes')) {
                $after = Schema::hasColumn('partners', 'rib_or_iban') ? 'rib_or_iban' : 'payment_method';
                $table->text('payout_notes')->nullable()->after($after);
            }

            if (! Schema::hasColumn('partners', 'admin_notes')) {
                $after = Schema::hasColumn('partners', 'payout_notes') ? 'payout_notes' : 'payment_method';
                $table->text('admin_notes')->nullable()->after($after);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('partners')) {
            return;
        }

        Schema::table('partners', function (Blueprint $table) {
            foreach (['admin_notes', 'payout_notes', 'rib_or_iban', 'bank_name', 'payment_method', 'avatar', 'address', 'business_name'] as $column) {
                if (Schema::hasColumn('partners', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

