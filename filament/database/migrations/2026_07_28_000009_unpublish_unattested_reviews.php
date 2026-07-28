<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Unpublish every review that carries no evidence of a real purchase.
 *
 * WHAT WAS FOUND, reproduced against the live API before writing this:
 *
 *   presse-epaules (a SHOULDER PRESS MACHINE)
 *     published reviews : 203      verified: 0      linked to an order: 0
 *     comments include  : "Vanilla طعمها هايل."  ("the vanilla tastes great")
 *                         "Ma fihch sucre زائد." ("it doesn't have too much sugar")
 *
 *   identical comment text shared across unrelated products
 *     lateral-pulldown <-> shoulder-press      : 72 identical
 *     lateral-pulldown <-> ashwagandha capsules: 62 identical
 *
 * A shoulder press does not taste of vanilla. These reviews were seeded from a shared pool, not
 * written by customers. PR #164 already stopped ASSERTING them to Google as AggregateRating, which
 * removed the manual-action risk. This removes them from the storefront as well, because showing a
 * shopper 203 invented reviews is a trust problem and, for a supplement retailer, a consumer-
 * protection exposure — independent of any search consideration.
 *
 * REVERSIBLE BY DESIGN: sets publier = 0. Nothing is deleted, no row is dropped, and down() puts
 * back exactly the rows this migration touched (tracked by id, so reviews unpublished for other
 * reasons are never silently republished).
 *
 * Genuine reviews are untouched: any row with verified = 1 or a commande_id stays published, and
 * new reviews arriving through the post-delivery flow are unaffected.
 */
return new class extends Migration
{
    /** Where the affected ids are recorded so down() can restore precisely these rows. */
    private const BACKUP_TABLE = 'reviews_unpublished_backup_20260728';

    public function up(): void
    {
        try {
            $ids = DB::table('reviews')
                ->where('publier', 1)
                ->where(function ($q) {
                    $q->where('verified', '!=', 1)->orWhereNull('verified');
                })
                ->whereNull('commande_id')
                ->pluck('id');
        } catch (\Throwable $e) {
            echo '[reviews-unpublish] skipped: ' . $e->getMessage() . "\n";

            return;
        }

        if ($ids->isEmpty()) {
            echo "[reviews-unpublish] nothing to do — every published review is attested\n";

            return;
        }

        // Snapshot the ids first so the change is precisely reversible.
        DB::statement('CREATE TABLE IF NOT EXISTS `' . self::BACKUP_TABLE . '` (review_id BIGINT UNSIGNED PRIMARY KEY)');
        foreach ($ids->chunk(1000) as $chunk) {
            DB::table(self::BACKUP_TABLE)->insertOrIgnore(
                $chunk->map(fn ($id) => ['review_id' => $id])->all()
            );
        }

        $updated = 0;
        foreach ($ids->chunk(1000) as $chunk) {
            $updated += DB::table('reviews')->whereIn('id', $chunk->all())->update(['publier' => 0]);
        }

        $productsAffected = DB::table('reviews')->whereIn('id', $ids->all())->distinct()->count('product_id');

        echo sprintf(
            "[reviews-unpublish] unpublished %d review(s) across %d product(s); ids snapshotted in %s\n",
            $updated,
            $productsAffected,
            self::BACKUP_TABLE
        );
    }

    public function down(): void
    {
        try {
            $ids = DB::table(self::BACKUP_TABLE)->pluck('review_id');
        } catch (\Throwable $e) {
            return; // snapshot table absent — nothing to restore
        }

        foreach ($ids->chunk(1000) as $chunk) {
            DB::table('reviews')->whereIn('id', $chunk->all())->update(['publier' => 1]);
        }

        echo sprintf("[reviews-unpublish] restored %d review(s)\n", $ids->count());
    }
};
