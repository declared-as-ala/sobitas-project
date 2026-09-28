<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Unpublish the reviews written from the shop's own TEST accounts.
 *
 * Measured live 28/09/2026 on /mass-gainers/serious-mass-5-45-kg-optimum-nutrition: shoppers
 * read reviews signed "wissem test compt" (user 15) and "test" (user 148) — accounts the team
 * used to try the review form, still role 2 and still published site-wide. A review signed
 * "test" tells a buyer every other review on the page may be staged too.
 *
 * `publier = 0`, never a delete: the rows stay in Filament and can be re-published by hand.
 * Scoped to the two verified account ids AND a name that still says test, so a real customer
 * whose account later reuses an id (it cannot) or whose name merely contains the letters is safe.
 */
return new class extends Migration
{
    private const TEST_ACCOUNT_IDS = [15, 148];

    public function up(): void
    {
        $ids = DB::table('users')
            ->whereIn('id', self::TEST_ACCOUNT_IDS)
            ->get(['id', 'name'])
            ->filter(fn ($u): bool => preg_match('/(^|[^a-z])test([^a-z]|$)/i', (string) $u->name) === 1)
            ->pluck('id')
            ->all();

        if ($ids === []) {
            echo "[test-reviews] no test account matched — nothing hidden\n";

            return;
        }

        $hidden = DB::table('reviews')
            ->whereIn('user_id', $ids)
            ->where('publier', 1)
            ->update(['publier' => 0, 'updated_at' => now()]);

        echo '[test-reviews] hid '.$hidden.' review(s) from account(s) '.implode(',', $ids)."\n";
    }

    public function down(): void
    {
        // Deliberately not reversed: re-publishing test-account reviews is never the desired state.
        // Individual rows can be re-published in Filament.
    }
};
