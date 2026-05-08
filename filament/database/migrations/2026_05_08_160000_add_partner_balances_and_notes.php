<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('partners')) {
            Schema::table('partners', function (Blueprint $table) {
                if (! Schema::hasColumn('partners', 'current_balance')) {
                    $table->decimal('current_balance', 14, 3)->default(0)->after('default_commission_rate');
                }
                if (! Schema::hasColumn('partners', 'total_earned')) {
                    $table->decimal('total_earned', 14, 3)->default(0)->after('current_balance');
                }
                if (! Schema::hasColumn('partners', 'total_paid')) {
                    $table->decimal('total_paid', 14, 3)->default(0)->after('total_earned');
                }
                if (! Schema::hasColumn('partners', 'notes')) {
                    $table->text('notes')->nullable()->after('admin_notes');
                }
            });

            if (Schema::hasColumn('partners', 'default_commission_rate') && ! Schema::hasColumn('partners', 'commission_rate')) {
                Schema::table('partners', function (Blueprint $table) {
                    $table->renameColumn('default_commission_rate', 'commission_rate');
                });
            }

            DB::table('partners')->whereIn('status', ['pending', 'rejected'])->update(['status' => 'suspended']);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('partners')) {
            return;
        }

        if (Schema::hasColumn('partners', 'commission_rate') && ! Schema::hasColumn('partners', 'default_commission_rate')) {
            Schema::table('partners', function (Blueprint $table) {
                $table->renameColumn('commission_rate', 'default_commission_rate');
            });
        }

        Schema::table('partners', function (Blueprint $table) {
            foreach (['notes', 'total_paid', 'total_earned', 'current_balance'] as $col) {
                if (Schema::hasColumn('partners', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
