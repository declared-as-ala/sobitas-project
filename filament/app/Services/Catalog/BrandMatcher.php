<?php

namespace App\Services\Catalog;

use App\Models\Brand;
use App\Support\BrandKey;
use Illuminate\Support\Facades\DB;

/**
 * Resolve a source brand name to a `brands` row — matching before creating, and never overwriting.
 *
 * ── THE FAILURE THIS EXISTS TO PREVENT ────────────────────────────────────────────────────
 * `brands` had no slug, no normalisation and no `firstOrCreate` anywhere; brand lookups in the API
 * are `where('designation_fr', 'like', '%'.$search.'%')`. Import a large catalogue against that and
 * "Optimum Nutrition", "optimum nutrition", "Optimum Nutrition®" and "OPTIMUM NUTRITION, INC."
 * become four rows. Each takes a share of the products, every brand page shows a fraction of the
 * catalogue, and not one error is raised — the site simply, quietly, sells less.
 *
 * ── MATCH ORDER, STRICTEST FIRST ──────────────────────────────────────────────────────────
 *   1. `external_code`  — iHerb's brandCode ("OPN"). Stable across renames, unlike a display name.
 *   2. `match_key`      — the folded name. This is what catches the four spellings above.
 *   3. create           — only when both miss.
 *
 * ── WHAT IS NEVER TOUCHED ─────────────────────────────────────────────────────────────────
 * An existing brand's `designation_fr`, `logo`, `meta_title` and `meta_description` are
 * protein.tn's, often written by hand. A sync may fill a BLANK external_code or match_key, because
 * those are bookkeeping, and nothing else. A brand's display name is never rewritten from a source
 * — that is how "Optimum Nutrition" would silently become "OPTIMUM NUTRITION, INC." on a page
 * somebody wrote.
 *
 * ── NO FUZZY MATCHING, ON PURPOSE ─────────────────────────────────────────────────────────
 * Levenshtein or similar-text would merge "Optimum Nutrition" with "Optimum Health" — two real,
 * different brands one edit apart. A wrong merge is unrecoverable in a way a duplicate is not: the
 * duplicate can be merged later by a human, but products already filed under a wrongly-merged brand
 * have lost the information needed to separate them.
 */
class BrandMatcher
{
    /** @var array<string, ?int> in-request memo, so a chunk of 100 products is not 100 lookups */
    private array $memo = [];

    /**
     * @return array{brand: ?Brand, created: bool}
     */
    public function resolve(?string $name, ?string $externalCode = null): array
    {
        $key = BrandKey::for($name);

        // An unnamed brand is not a brand. Returning null here keeps the product in staging rather
        // than inventing a "" brand that would collect every nameless product in the catalogue.
        if ($key === '') {
            return ['brand' => null, 'created' => false];
        }

        $memoKey = $key.'|'.strtolower((string) $externalCode);
        if (array_key_exists($memoKey, $this->memo)) {
            $id = $this->memo[$memoKey];

            return ['brand' => $id === null ? null : Brand::find($id), 'created' => false];
        }

        $brand = $this->findExisting($key, $externalCode);
        $created = false;

        if ($brand === null) {
            $brand = $this->create($name, $key, $externalCode);
            $created = true;
        } else {
            $this->backfillBookkeeping($brand, $key, $externalCode);
        }

        $this->memo[$memoKey] = $brand?->id;

        return ['brand' => $brand, 'created' => $created];
    }

    private function findExisting(string $key, ?string $externalCode): ?Brand
    {
        if ($externalCode !== null && trim($externalCode) !== '') {
            $byCode = Brand::where('external_code', trim($externalCode))->first();
            if ($byCode !== null) {
                return $byCode;
            }
        }

        return Brand::where('match_key', $key)->first();
    }

    /**
     * Create the brand — through the model, and tolerant of a race.
     *
     * Two queue workers hydrating two products of the same new brand at the same moment will both
     * miss the lookup and both insert. The unique index on `match_key` (added by migration when the
     * data allowed it) turns the loser into an exception rather than a duplicate; catching it and
     * re-reading is what makes concurrency safe without a lock.
     */
    private function create(?string $name, string $key, ?string $externalCode): ?Brand
    {
        $display = BrandKey::displayName($name);

        try {
            // Only columns `brands` actually has. It carries designation_fr, logo, alt_cover,
            // meta_title, meta_description (BrandResource) plus the three added by migration
            // 2026_08_10_000004. There is no `publier` on this table — writing one would throw
            // "Unknown column" on the first new brand and fail every hydration behind it.
            return Brand::create([
                'designation_fr' => $display,
                'slug' => BrandKey::slug($name),
                'match_key' => $key,
                'external_code' => $externalCode !== null && trim($externalCode) !== '' ? trim($externalCode) : null,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // 23000 = integrity constraint violation. The other worker won; use its row.
            if (! str_starts_with((string) $e->getCode(), '23')) {
                throw $e;
            }

            return Brand::where('match_key', $key)->first();
        }
    }

    /**
     * Fill in only what is genuinely empty.
     *
     * Note what is absent: designation_fr, logo, meta_title, meta_description. Those belong to
     * protein.tn. A sync that "helpfully" refreshed them would overwrite hand-written copy with a
     * supplier's legal name, on a schedule, with no record of what it replaced.
     */
    private function backfillBookkeeping(Brand $brand, string $key, ?string $externalCode): void
    {
        $updates = [];

        if (blank($brand->match_key)) {
            $updates['match_key'] = $key;
        }

        if (blank($brand->external_code) && $externalCode !== null && trim($externalCode) !== '') {
            $updates['external_code'] = trim($externalCode);
        }

        if (blank($brand->slug) && filled($brand->designation_fr)) {
            $updates['slug'] = BrandKey::slug($brand->designation_fr);
        }

        if ($updates !== []) {
            $brand->forceFill($updates)->save();
        }
    }

    /**
     * Brands that would be created by promoting the currently hydrated rows.
     *
     * A dry-run answer to "how many new brands is this import about to add to my shop?" — asked
     * before it happens rather than discovered afterwards in the brand filter.
     *
     * @return array<string, int> match_key => product count
     */
    public static function pendingNewBrands(): array
    {
        return DB::table('external_catalog_products as e')
            ->leftJoin('brands as b', 'b.match_key', '=', 'e.normalized_brand_key')
            ->where('e.status', 'hydrated')
            ->whereNull('b.id')
            ->whereNotNull('e.normalized_brand_key')
            ->where('e.normalized_brand_key', '!=', '')
            ->groupBy('e.normalized_brand_key')
            ->orderByRaw('COUNT(*) DESC')
            ->pluck(DB::raw('COUNT(*)'), 'e.normalized_brand_key')
            ->toArray();
    }
}
