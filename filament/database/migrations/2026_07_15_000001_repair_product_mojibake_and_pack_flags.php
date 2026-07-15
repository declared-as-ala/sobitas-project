<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * ONE-OFF DATA REPAIR (idempotent, non-destructive).
 *
 * 1) MOJIBAKE: some product/category text was written to the DB through a
 *    Windows-1252 connection, so UTF-8 accents were double-mangled and now show
 *    as e.g. "Banc rÃ©glable" instead of "Banc réglable" (only affected a batch
 *    of fitness/gym items; supplements were untouched). The reverse is applied
 *    ONLY when it is EXACTLY invertible (round-trip verified per string), so a
 *    clean name, a "™", or an emoji is NEVER altered.
 *
 * 2) PACK FLAG: the pack/bundle products were NOT deleted — their rows still
 *    exist, but the `pack` flag was cleared (so /packs returned empty). This
 *    re-flags every product whose name starts with "PACK ".
 *
 * The deploy pipeline takes a full mysqldump backup BEFORE this runs, so it is
 * fully recoverable. down() is intentionally a no-op (data repair).
 */
return new class extends Migration
{
    public function up(): void
    {
        $repaired = 0;
        // Repair the common French text columns on the catalogue tables (each guarded).
        $repaired += $this->safeRepair('products', ['designation_fr', 'description_fr', 'meta_title', 'meta_description', 'seo_description']);
        $repaired += $this->safeRepair('sous_categories', ['designation_fr', 'description_fr', 'meta_title', 'meta_description']);
        $repaired += $this->safeRepair('categories', ['designation_fr', 'description_fr', 'meta_title', 'meta_description']);
        $repaired += $this->safeRepair('brands', ['designation_fr', 'description_fr']);

        // Restore the pack flag (rows exist; only the flag was cleared).
        $packs = 0;
        try {
            if (Schema::hasTable('products') && Schema::hasColumn('products', 'pack')) {
                $packs = DB::table('products')
                    ->whereRaw("TRIM(UPPER(designation_fr)) LIKE 'PACK %'")
                    ->update(['pack' => 1]);
            }
        } catch (\Throwable $e) {
            Log::error('data-repair pack flag restore failed', ['error' => $e->getMessage()]);
        }

        Log::info("data-repair 2026_07_15: mojibake rows repaired={$repaired}, pack flags restored={$packs}");
    }

    public function down(): void
    {
        // One-off data repair — not reversible.
    }

    private function safeRepair(string $table, array $columns): int
    {
        try {
            return $this->repair($table, $columns);
        } catch (\Throwable $e) {
            Log::error("data-repair on {$table} failed", ['error' => $e->getMessage()]);

            return 0;
        }
    }

    private function repair(string $table, array $columns): int
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'id')) {
            return 0;
        }
        $cols = array_values(array_filter($columns, fn (string $c) => Schema::hasColumn($table, $c)));
        if (empty($cols)) {
            return 0;
        }

        $count = 0;
        DB::table($table)
            ->select(array_merge(['id'], $cols))
            ->orderBy('id')
            ->chunkById(300, function ($rows) use ($table, $cols, &$count) {
                foreach ($rows as $row) {
                    $update = [];
                    foreach ($cols as $c) {
                        $orig = $row->{$c};
                        if (! is_string($orig) || $orig === '') {
                            continue;
                        }
                        $fixed = $this->fixMojibake($orig);
                        if ($fixed !== $orig) {
                            $update[$c] = $fixed;
                        }
                    }
                    if (! empty($update)) {
                        DB::table($table)->where('id', $row->id)->update($update);
                        $count++;
                    }
                }
            });

        return $count;
    }

    /**
     * Reverse UTF-8-read-as-Windows-1252 corruption. Returns the input unchanged
     * unless the fix is EXACTLY invertible (so it can only ever help, never harm).
     */
    private function fixMojibake(string $s): string
    {
        if ($s === '' || ! function_exists('iconv')) {
            return $s;
        }
        // Candidate only if it contains a Â/Ã lead byte (the mojibake signature).
        if (! preg_match('/[\x{00C2}\x{00C3}]/u', $s)) {
            return $s;
        }
        $bytes = @iconv('UTF-8', 'CP1252', $s);
        if ($bytes === false || $bytes === '' || $bytes === $s) {
            return $s;
        }
        if (! mb_check_encoding($bytes, 'UTF-8')) {
            return $s;
        }
        // Only apply when re-corrupting the fix reproduces the original byte-for-byte.
        if (@iconv('CP1252', 'UTF-8', $bytes) !== $s) {
            return $s;
        }

        return $bytes;
    }
};
