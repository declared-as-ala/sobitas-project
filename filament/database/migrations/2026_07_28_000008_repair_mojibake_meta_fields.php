<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Finish the mojibake repair: the META fields were left corrupted.
 *
 * 2026_07_28_000007 fixed products.designation_fr on 6 rows — confirmed in the deploy log — but
 * meta_title, meta_description and alt_cover on those same rows still hold the broken text:
 *
 *     designation_fr : ISO 100 DYMATIZE – 2.3KG            (repaired)
 *     meta_title     : ISO 100 DYMATIZE â€“ 2.3KG – Prix…   (still corrupt)
 *
 * Those three columns were listed in that migration's TARGETS, so they should have been repaired
 * in the same pass. They were dropped by its `Schema::hasColumn()` filter — the SECOND time today
 * that helper has silently returned false for a column that demonstrably exists (it also made
 * 2026_07_28_000001 match zero rows, which is why 000003 had to redo that work in raw SQL).
 * Treat Schema::hasColumn as unreliable in this environment: use raw SQL and catch the error.
 *
 * This is urgent rather than cosmetic because the corruption is now UNHEALABLE by the normal path.
 * ProductSeoDefaults decides "is this value mine to upgrade?" by rebuilding the legacy template
 * from the CURRENT designation_fr — which is now the repaired name — so it will never match the
 * stored corrupted string, and would leave `â€“` in the meta description indefinitely. That string
 * is what Google shows in the search snippet.
 *
 * Same three guards as 000007: marker present, reversal yields valid UTF-8, result differs.
 */
return new class extends Migration
{
    private const TARGETS = [
        'products' => ['meta_title', 'meta_description', 'alt_cover', 'designation_fr', 'seo_title', 'seo_description'],
        'articles' => ['meta_title', 'meta_description_fr', 'seo_title', 'seo_description', 'designation_fr'],
        'pages' => ['title', 'meta_title', 'meta_description', 'excerpt'],
        'categs' => ['designation_fr', 'meta_title', 'meta_description'],
        'sous_categories' => ['designation_fr', 'meta_title', 'meta_description'],
        'brands' => ['designation_fr'],
    ];

    /** Codepoint ranges, not byte ranges — under /u the latter fail to compile and match nothing. */
    private const MARKER = '/â€|Ã[\x{80}-\x{bf}]|Â[\x{80}-\x{bf}]/u';

    public function up(): void
    {
        $total = 0;

        foreach (self::TARGETS as $table => $columns) {
            foreach ($columns as $column) {
                try {
                    // Raw SQL, no Schema facade: a missing table/column throws and is caught below.
                    $rows = DB::select("SELECT id, `{$column}` AS v FROM `{$table}` WHERE `{$column}` IS NOT NULL AND `{$column}` <> ''");
                } catch (\Throwable $e) {
                    continue; // column or table absent — nothing to do
                }

                $fixedCount = 0;
                foreach ($rows as $row) {
                    $repaired = self::repair((string) $row->v);
                    if ($repaired === null) {
                        continue;
                    }
                    DB::update("UPDATE `{$table}` SET `{$column}` = ? WHERE id = ?", [$repaired, $row->id]);
                    $fixedCount++;
                    $total++;
                    echo sprintf("[mojibake-meta] %s#%d.%s -> %s\n", $table, $row->id, $column, mb_substr($repaired, 0, 70));
                }

                if ($fixedCount > 0) {
                    echo sprintf("[mojibake-meta] %s.%s: %d value(s)\n", $table, $column, $fixedCount);
                }
            }
        }

        echo sprintf("[mojibake-meta] repaired %d value(s) in total\n", $total);
    }

    private static function repair(string $value): ?string
    {
        if ($value === '' || ! preg_match(self::MARKER, $value)) {
            return null;
        }
        $fixed = @mb_convert_encoding($value, 'Windows-1252', 'UTF-8');
        if ($fixed === false || $fixed === '' || ! mb_check_encoding($fixed, 'UTF-8')) {
            return null;
        }

        return $fixed !== $value ? $fixed : null;
    }

    public function down(): void
    {
        // Not reversible — the previous values were corrupted text.
    }
};
