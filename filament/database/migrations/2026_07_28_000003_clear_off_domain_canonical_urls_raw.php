<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Second attempt at clearing off-domain canonical_url values — this time with the query builder
 * and the Schema facade taken out of the picture, and with diagnostics printed to the deploy log.
 *
 * Migration 2026_07_28_000001 reported DONE in 36ms and cleared NOTHING, yet
 * GET /api/page/politique-des-cookies still answers with
 * canonical_url = "https://sobitas.tn/politique-des-cookies" — read straight off the column by
 * ApisController::pagePayload (the Page model has no accessor, and the 60s route cache had long
 * expired between the deploy and the check). So the rows are there and the first migration's
 * WHERE did not see them. Rather than guess at why (Schema::hasColumn returning false for a column
 * that exists is the leading suspect), this runs plain SQL and PRINTS what it finds, so the deploy
 * log settles it either way.
 *
 * Same semantics as before: clear only values whose HOST is not protein.tn. A NULL makes the app
 * fall back to https://protein.tn/{slug}, which is what these rows should have said all along.
 * Relative values have no host and are left alone. Idempotent.
 */
return new class extends Migration
{
    private const TABLES = ['pages', 'categs', 'sous_categories', 'products', 'blog_categories', 'blog_tags', 'articles'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            try {
                // Raw read: no Schema facade, no query builder. If the column or table is absent
                // this throws and the catch below just notes it and moves on.
                $rows = DB::select("SELECT id, canonical_url FROM `{$table}` WHERE canonical_url IS NOT NULL AND TRIM(canonical_url) <> ''");
            } catch (\Throwable $e) {
                echo "[canonical-raw] {$table}: skipped ({$e->getMessage()})\n";
                continue;
            }

            echo sprintf("[canonical-raw] %s: %d row(s) carry a canonical_url\n", $table, count($rows));

            $ids = [];
            foreach ($rows as $row) {
                $value = trim((string) $row->canonical_url);
                $host = parse_url($value, PHP_URL_HOST);
                if (! $host) {
                    continue; // relative / unparseable — out of scope
                }
                if (strtolower(preg_replace('/^www\./i', '', $host)) === 'protein.tn') {
                    continue;
                }
                $ids[] = (int) $row->id;
                echo "[canonical-raw]   clearing {$table}#{$row->id}: {$value}\n";
            }

            if ($ids === []) {
                continue;
            }

            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $affected = DB::update("UPDATE `{$table}` SET canonical_url = NULL WHERE id IN ({$placeholders})", $ids);
            echo sprintf("[canonical-raw] %s: cleared %d row(s)\n", $table, $affected);
        }
    }

    public function down(): void
    {
        // Not reversible — the cleared values were wrong by definition (they pointed off-domain).
        // Pre-update values are printed in the migration log above, and every deploy takes an
        // automatic mysqldump first.
    }
};
