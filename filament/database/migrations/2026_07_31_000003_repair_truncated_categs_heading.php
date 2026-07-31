<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Repair the "ROTÉINES EN TUNISIE" heading — corrected table.
 *
 * Supersedes 2026_07_31_000002, which targeted `categories`. That table does not exist: the model
 * is App\Models\Categ with `protected $table = 'categs'`. The earlier migration therefore threw,
 * was swallowed by its own try/catch, and was still recorded as run — so it can never fire again
 * and this replacement is needed rather than an edit.
 *
 * The defect: `categs.description_fr` for the "proteines" row is stored with its first character
 * missing, so the lead heading of the page targeting *protéine tunisie* (2,241 impressions,
 * position 12.5) and *protéines tunisie* (438, 15.5) renders — to Google and to customers — as:
 *
 *     ROTÉINES EN TUNISIE – PROTEIN.TN
 *
 * Confirmed as stored data, not a render-time transform: the broken string comes back raw from
 * GET /api/productsByCategoryId/proteines, and the crawler view and hydrated human view agree.
 * Almost certainly lost in the WordPress → Angular → Next migrations.
 *
 * Anchored on `<strong>` so it cannot touch a correct "PROTÉINES" (the match needs `>` immediately
 * before `ROT`), and re-running is a no-op because after the repair the text is preceded by `P`.
 *
 * All 88 listing pages were crawled as Googlebot while writing this; this is the only heading in
 * the set with a lost leading character, so this is a targeted repair and not a sweep.
 */
return new class extends Migration
{
    /** Stored (broken) → corrected. Keys must keep the `<strong>` anchor. */
    private const REPAIRS = [
        '<strong>ROT&Eacute;INES EN TUNISIE' => '<strong>PROT&Eacute;INES EN TUNISIE',
    ];

    public function up(): void
    {
        foreach (self::REPAIRS as $broken => $fixed) {
            try {
                $affected = DB::table('categs')
                    ->where('description_fr', 'like', '%' . $broken . '%')
                    ->update([
                        'description_fr' => DB::raw(sprintf(
                            'REPLACE(description_fr, %s, %s)',
                            DB::getPdo()->quote($broken),
                            DB::getPdo()->quote($fixed)
                        )),
                    ]);

                // Logged at warning level when nothing matched: a silent zero is exactly how the
                // previous attempt looked like a success while changing nothing.
                if ($affected === 0) {
                    Log::warning('categs heading repair matched no rows', ['needle' => $broken]);
                } else {
                    Log::info('categs heading repaired', ['needle' => $broken, 'rows' => $affected]);
                }
            } catch (\Throwable $e) {
                // A cosmetic content repair must never block the migrations queued behind it.
                Log::error('categs heading repair failed (continuing)', [
                    'needle' => $broken,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Irreversible by design: re-breaking a heading serves no one.
    }
};
