<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * One order attests ONE rating per product: unique index on reviews(commande_id, product_id).
 *
 * POST /api/reviews/by-order checked « already reviewed? » with a bare exists() and inserted a few
 * queries later, with no lock and no constraint, so parallel submissions with one token could each
 * insert an attested « Achat vérifié » rating that counts in aggregateRating. ReviewController now
 * locks the order row around the check and the insert; this index is the guarantee behind it.
 * Guest and legacy rows have commande_id NULL, and MySQL allows any number of NULLs in a unique index.
 *
 * A deploy never changes which reviews are published (that decision stays with the owner): when rows
 * already break the rule, their ids are logged and the index is NOT created — the ReviewController
 * lock still prevents new duplicates. Re-run this migration's logic by hand once they are resolved.
 *
 * Guarded like the other review migrations: a failure is logged and never aborts `migrate --force`.
 */
return new class extends Migration
{
    private const INDEX = 'reviews_commande_product_unique';

    public function up(): void
    {
        try {
            if (! Schema::hasTable('reviews')
                || ! Schema::hasColumn('reviews', 'commande_id')
                || ! Schema::hasColumn('reviews', 'product_id')
                || Schema::hasIndex('reviews', self::INDEX)) {
                return;
            }

            $duplicates = $this->duplicateGroups();
            if ($duplicates !== []) {
                Log::warning('reviews: several ratings share one order and product; unique index NOT created, nothing changed', [
                    'groups' => $duplicates,
                ]);

                return;
            }

            Schema::table('reviews', function (Blueprint $table): void {
                $table->unique(['commande_id', 'product_id'], self::INDEX);
            });
        } catch (\Throwable $e) {
            Log::error('migration reviews(commande_id, product_id) unique failed (continuing)', ['error' => $e->getMessage()]);
        }
    }

    /** @return list<array{commande_id: int, product_id: int, review_ids: list<int>}> */
    private function duplicateGroups(): array
    {
        $groups = DB::table('reviews')
            ->select('commande_id', 'product_id')
            ->whereNotNull('commande_id')
            ->groupBy('commande_id', 'product_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $out = [];
        foreach ($groups as $group) {
            $out[] = [
                'commande_id' => (int) $group->commande_id,
                'product_id' => (int) $group->product_id,
                'review_ids' => DB::table('reviews')->where('commande_id', $group->commande_id)
                    ->where('product_id', $group->product_id)->orderBy('id')->pluck('id')->map(fn ($id) => (int) $id)->all(),
            ];
        }

        return $out;
    }

    public function down(): void
    {
        if (Schema::hasTable('reviews') && Schema::hasIndex('reviews', self::INDEX)) {
            Schema::table('reviews', function (Blueprint $table): void {
                $table->dropUnique(self::INDEX);
            });
        }
    }
};
