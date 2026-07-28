<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Repair UTF-8 text that was stored after being decoded as Windows-1252 ("mojibake").
 *
 * Six products carry it in their NAME, which means Google is reading it too — it is the visible
 * title on the product page, in the sitemap link text and in the meta title/description generated
 * from that name:
 *
 *     ISO 100 DYMATIZE â€“ 2.3KG        (should be: ISO 100 DYMATIZE – 2.3KG)
 *     ANIMAL WHEY ISOLATE LOADED â€“ 2.27KG
 *     OPTI-WOMEN â€“ 120CAPS
 *
 * `â€“` is the three UTF-8 bytes of an en dash (E2 80 93) each rendered as its Windows-1252
 * character. Reversing it means encoding the string back to Windows-1252 bytes and reading those
 * bytes as UTF-8.
 *
 * THREE GUARDS, because a bad "fix" here would corrupt correct French across the catalogue:
 *   1. the value must contain a known mojibake marker;
 *   2. the reversal must produce valid UTF-8;
 *   3. the result must actually differ.
 * Verified against real values before shipping — "Protéine Whey — Tunisie" and
 * "Mass Gainer Créatine - Eric Favre" fail guards 1 AND 2, so correctly-encoded text is
 * untouchable by this migration.
 *
 * Idempotent: once repaired, the marker is gone and the row is skipped.
 */
return new class extends Migration
{
    /** table => text columns that are shown to users or search engines. */
    private const TARGETS = [
        'products' => ['designation_fr', 'meta_title', 'meta_description', 'alt_cover'],
        'articles' => ['designation_fr', 'meta_title'],
        'pages' => ['title', 'meta_title', 'meta_description'],
        'categs' => ['designation_fr'],
        'sous_categories' => ['designation_fr'],
        'brands' => ['designation_fr'],
    ];

    /**
     * Sequences that only ever appear when UTF-8 has been read as Windows-1252.
     *
     * Written as CODEPOINT ranges (\x{80}) rather than byte ranges (\x80): under /u the latter are
     * isolated bytes, not valid UTF-8, so PCRE fails to compile the pattern and preg_match returns
     * false for every input — which silently turned guard 1 into "never repair anything".
     */
    private const MARKER = '/â€|Ã[\x{80}-\x{bf}]|Â[\x{80}-\x{bf}]/u';

    public function up(): void
    {
        $totalRows = 0;

        foreach (self::TARGETS as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            $columns = array_values(array_filter($columns, fn ($c) => Schema::hasColumn($table, $c)));
            if ($columns === []) {
                continue;
            }

            $rows = DB::table($table)->select(array_merge(['id'], $columns))->get();

            foreach ($rows as $row) {
                $updates = [];
                foreach ($columns as $column) {
                    $value = (string) ($row->{$column} ?? '');
                    $fixed = self::repair($value);
                    if ($fixed !== null) {
                        $updates[$column] = $fixed;
                    }
                }
                if ($updates === []) {
                    continue;
                }

                DB::table($table)->where('id', $row->id)->update($updates);
                $totalRows++;
                echo sprintf(
                    "[mojibake] %s#%d: %s\n",
                    $table,
                    $row->id,
                    implode(' | ', array_map(fn ($c) => "{$c} -> {$updates[$c]}", array_keys($updates)))
                );
            }
        }

        echo sprintf("[mojibake] repaired %d row(s)\n", $totalRows);
    }

    /** Repaired string, or null when the value is fine / cannot be safely repaired. */
    private static function repair(string $value): ?string
    {
        if ($value === '' || ! preg_match(self::MARKER, $value)) {
            return null; // guard 1
        }

        $fixed = @mb_convert_encoding($value, 'Windows-1252', 'UTF-8');
        if ($fixed === false || $fixed === '' || ! mb_check_encoding($fixed, 'UTF-8')) {
            return null; // guard 2
        }

        return $fixed !== $value ? $fixed : null; // guard 3
    }

    public function down(): void
    {
        // Not reversible, and would not be desirable: the previous values were corrupted text.
    }
};
