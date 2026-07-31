<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Repair a heading that lost its first character somewhere in the WordPress → Angular → Next
 * migrations.
 *
 * `categories.description_fr` for the "proteines" category opens with:
 *
 *     <h2 ...><strong>ROT&Eacute;INES EN TUNISIE &ndash; PROTEIN.TN</strong></h2>
 *
 * so the lead heading of the page that targets "proteine tunisie" / "protéines tunisie" — 2,241
 * and 438 impressions at positions 12.5 and 15.5 — renders to Google and to customers as
 * "ROTÉINES EN TUNISIE". The `P` is gone in the stored HTML, not in any transform: the same string
 * comes back raw from GET /api/productsByCategoryId/proteines, and both the crawler view and the
 * hydrated human view render it identically.
 *
 * Anchored on `<strong>` and applied only to rows that actually contain the broken form, so:
 * - it cannot touch a correct "PROTÉINES" (the match requires `>` immediately before `ROT`), and
 * - re-running is a no-op, because after the fix the text is preceded by `P`, not `>`.
 *
 * All 88 listing pages were crawled as Googlebot while writing this; this is the only heading in
 * the set with a lost leading character, so this is a targeted repair and not a sweep.
 */
return new class extends Migration
{
    /** Stored (broken) → corrected. Keys must include the `<strong>` anchor. */
    private const REPAIRS = [
        '<strong>ROT&Eacute;INES EN TUNISIE' => '<strong>PROT&Eacute;INES EN TUNISIE',
    ];

    public function up(): void
    {
        try {
            foreach (self::REPAIRS as $broken => $fixed) {
                $affected = DB::table('categories')
                    ->where('description_fr', 'like', '%' . $broken . '%')
                    ->update([
                        'description_fr' => DB::raw(
                            'REPLACE(description_fr, ' . DB::getPdo()->quote($broken) . ', ' . DB::getPdo()->quote($fixed) . ')'
                        ),
                    ]);

                Log::info('repaired truncated category heading', [
                    'broken' => $broken,
                    'rows' => $affected,
                ]);
            }
        } catch (\Throwable $e) {
            // A cosmetic content repair must never block the migrations queued behind it.
            Log::error('category heading repair failed (continuing)', ['error' => $e->getMessage()]);
        }
    }

    public function down(): void
    {
        // Irreversible by design: re-breaking a heading serves no one.
    }
};
