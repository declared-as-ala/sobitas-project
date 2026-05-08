<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('partners')) {
            return;
        }

        $afterCommission = $this->resolveColumnAfterCommission();

        Schema::table('partners', function (Blueprint $table) use ($afterCommission) {
            if (Schema::hasColumn('partners', 'current_balance')) {
                $after = 'current_balance';
            } else {
                $table->decimal('current_balance', 14, 3)->default(0)->after($afterCommission);
                $after = 'current_balance';
            }
            if (Schema::hasColumn('partners', 'total_earned')) {
                $after = 'total_earned';
            } else {
                $table->decimal('total_earned', 14, 3)->default(0)->after($after);
                $after = 'total_earned';
            }
            if (! Schema::hasColumn('partners', 'total_paid')) {
                $table->decimal('total_paid', 14, 3)->default(0)->after($after);
            }
        });

        if (! Schema::hasColumn('partners', 'notes')) {
            $afterNotes = Schema::hasColumn('partners', 'admin_notes')
                ? 'admin_notes'
                : (Schema::hasColumn('partners', 'payout_notes') ? 'payout_notes' : $afterCommission);
            Schema::table('partners', function (Blueprint $table) use ($afterNotes) {
                $table->text('notes')->nullable()->after($afterNotes);
            });
        }

        if (Schema::hasColumn('partners', 'default_commission_rate') && ! Schema::hasColumn('partners', 'commission_rate')) {
            Schema::table('partners', function (Blueprint $table) {
                $table->renameColumn('default_commission_rate', 'commission_rate');
            });
        }

        DB::table('partners')->whereIn('status', ['pending', 'rejected'])->update(['status' => 'suspended']);
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

    private function resolveColumnAfterCommission(): string
    {
        if (Schema::hasColumn('partners', 'commission_rate')) {
            return 'commission_rate';
        }
        if (Schema::hasColumn('partners', 'default_commission_rate')) {
            return 'default_commission_rate';
        }

        return 'status';
    }
};
