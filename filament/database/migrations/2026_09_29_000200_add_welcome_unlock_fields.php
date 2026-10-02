<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $addedCreditedAt = false;
        if (! Schema::hasColumn('welcome_bonus_claims', 'credited_at')) {
            Schema::table('welcome_bonus_claims', fn (Blueprint $t) => $t->timestamp('credited_at')->nullable());
            $addedCreditedAt = true;
        }
        if (! Schema::hasColumn('welcome_bonus_claims', 'unlocked_by_commande_id')) {
            Schema::table('welcome_bonus_claims', fn (Blueprint $t) => $t->unsignedBigInteger('unlocked_by_commande_id')->nullable());
        }
        if (! Schema::hasColumn('welcome_bonus_claims', 'unlock_phone_hash')) {
            Schema::table('welcome_bonus_claims', fn (Blueprint $t) => $t->char('unlock_phone_hash', 64)->nullable());
        }
        if (! collect(Schema::getIndexes('welcome_bonus_claims'))
            ->contains(fn ($index) => $index['columns'] === ['unlock_phone_hash'])) {
            Schema::table('welcome_bonus_claims', fn (Blueprint $t) => $t->index('unlock_phone_hash'));
        }
        if ($addedCreditedAt) {
            // All claims predating this column were already credited.
            DB::table('welcome_bonus_claims')->whereNull('credited_at')->update(['credited_at' => DB::raw('created_at')]);
        } else {
            // A resumed MySQL migration may have added the column before crashing.
            // Legacy ledger rows identify old claims without touching new reservations.
            DB::table('welcome_bonus_claims')->whereNull('credited_at')
                ->whereExists(fn ($q) => $q->select(DB::raw(1))->from('user_point_transactions as t')
                    ->whereColumn('t.user_id', 'welcome_bonus_claims.user_id')
                    ->where('t.type', 'earn')->whereNull('t.idempotency_key')
                    ->where('t.description', 'like', 'Cadeau de bienvenue%'))
                ->update(['credited_at' => DB::raw('created_at')]);
        }
    }

    public function down(): void {}
};
