<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Give `brands` a stable slug and a source code, so an importer cannot silently split a brand in two.
 *
 * ── THE PROBLEM THIS CLOSES ───────────────────────────────────────────────────────────────
 * `App\Models\Brand` is eighteen lines: a table name, `$guarded`, and one relation. No `$fillable`,
 * no casts, no slug, no normalisation, and no `firstOrCreate` anywhere in the codebase. Brand
 * lookups are `Brand::where('designation_fr', 'like', '%'.$search.'%')`
 * (ApisController.php:613, :833), and brand *slugs* are computed at request time by
 * `App\Support\PublicSlug` loading EVERY brand and comparing `Str::slug($brand->designation_fr)`.
 *
 * Import 47,537 products against that and "Optimum Nutrition", "optimum nutrition" and
 * "Optimum Nutrition®" become three rows. Each gets a fraction of the products, the brand page shows
 * a third of the catalogue, and no error is ever raised.
 *
 * ── WHY THE UNIQUE INDEX IS CONDITIONAL ───────────────────────────────────────────────────
 * `brands` is a legacy table with no migration history and unknown contents; two existing brands may
 * already collapse to the same slug. A migration that fails on production data is worse than one
 * that reports the collision, so the unique index is added only when the backfill produced none, and
 * the collisions are logged for a human. The application-level matcher does not depend on the index.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('brands')) {
            return;
        }

        Schema::table('brands', function (Blueprint $table): void {
            if (! Schema::hasColumn('brands', 'slug')) {
                $table->string('slug', 190)->nullable()->after('designation_fr');
            }
            if (! Schema::hasColumn('brands', 'external_code')) {
                // iHerb's `brandCode` ("OPN", "DRB"). Stable across renames, unlike the display name.
                $table->string('external_code', 24)->nullable()->after('slug');
            }
            if (! Schema::hasColumn('brands', 'match_key')) {
                // Casing/accent/punctuation-folded name. The thing BrandMatcher actually compares.
                $table->string('match_key', 190)->nullable()->after('external_code');
            }
        });

        // Backfill in chunks — brands is small, but the same shape works if it is not.
        DB::table('brands')->orderBy('id')->chunkById(200, function ($brands): void {
            foreach ($brands as $brand) {
                $name = (string) ($brand->designation_fr ?? '');
                if ($name === '') {
                    continue;
                }

                DB::table('brands')->where('id', $brand->id)->update([
                    'slug' => Str::slug($name),
                    // Mirrors App\Support\BrandKey::for() — if you change one, change both.
                    'match_key' => self::matchKey($name),
                ]);
            }
        });

        $this->indexOrReport();
    }

    /**
     * Add the unique index only if the data allows it; otherwise say exactly which brands collide.
     */
    private function indexOrReport(): void
    {
        $collisions = DB::table('brands')
            ->select('match_key', DB::raw('COUNT(*) as n'))
            ->whereNotNull('match_key')
            ->where('match_key', '!=', '')
            ->groupBy('match_key')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('n', 'match_key');

        if ($collisions->isEmpty()) {
            Schema::table('brands', function (Blueprint $table): void {
                $table->unique('match_key', 'brands_match_key_unique');
            });

            return;
        }

        // Not fatal: the matcher works without the index, and merging brands is a business decision
        // a migration must not make on someone's behalf.
        \Illuminate\Support\Facades\Log::warning('[brands] duplicate match_key values — unique index not added', [
            'collisions' => $collisions->toArray(),
        ]);
    }

    /** Duplicated from App\Support\BrandKey so this migration has no runtime class dependency. */
    private static function matchKey(string $name): string
    {
        $key = Str::ascii($name);
        $key = mb_strtolower($key, 'UTF-8');
        $key = preg_replace('~\b(s\.?a\.?r\.?l|s\.?a|inc|ltd|llc|gmbh|bv|nv|co|corp|company)\b~u', ' ', $key) ?? $key;
        $key = preg_replace('~[^a-z0-9]+~', ' ', $key) ?? $key;

        return trim(preg_replace('~\s+~', ' ', $key) ?? $key);
    }

    public function down(): void
    {
        if (! Schema::hasTable('brands')) {
            return;
        }

        Schema::table('brands', function (Blueprint $table): void {
            if (Schema::hasColumn('brands', 'match_key')) {
                try {
                    $table->dropUnique('brands_match_key_unique');
                } catch (\Throwable) {
                    // Index may never have been added — see indexOrReport().
                }
            }
            foreach (['match_key', 'external_code', 'slug'] as $column) {
                if (Schema::hasColumn('brands', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
