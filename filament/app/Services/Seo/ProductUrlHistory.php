<?php

namespace App\Services\Seo;

use App\Models\Product;
use App\Models\Redirection;
use App\Models\SousCategory;
use Illuminate\Support\Facades\Log;

/**
 * A product's public address is /{sous_categorie.slug}/{product.slug}. Change either and the old
 * address stops resolving — so this class remembers it, as a 301 in the `redirections` table.
 *
 * ── WHY THIS EXISTS (owner, 28/09/2026: "google isn't indexing products I really sell") ─────────
 * The product form regenerates the slug from the name while the two are still in sync
 * (ProductResource, `designation_fr` → afterStateUpdated). Tidying a name therefore silently moves
 * the product: "Whey Regime Ultra Pure Whey Protein Blend 2.21kg" became "Whey Regime 2kg" and
 *
 *     /whey-proteine/whey-regime-ultra-pure-whey-protein-blend-221kg-william-bonac
 *
 * stopped resolving. Nothing recorded the old slug, so the middleware did what it does for any
 * unknown slug — `bestCategoryForSlug` — and 301'd a live, in-stock product (qte 96) to the
 * /whey-proteine LISTING. Google files a redirect to an irrelevant page as a soft 404: Search
 * Console showed "Page avec redirection", the product's crawl history was thrown away, and the new
 * URL had to be discovered from zero.
 *
 * Renames were only ever rescued by hand, one deploy at a time (RESLUGGED_PRODUCT_SLUGS in
 * middleware.ts — two entries). This makes the rescue automatic for every future rename.
 *
 * ── WHY THE `redirections` TABLE ───────────────────────────────────────────────────────────────
 * It is already the first thing the middleware consults (exact path, cached ~5 min, fail-open), it
 * is editable in Filament → Redirections so the owner can see and override every rule, and it needs
 * no deploy. A rename shows up as a row the owner can read.
 *
 * ── THREE RULES, ALL NEEDED ─────────────────────────────────────────────────────────────────────
 *   1. A live address is never redirected away: any rule whose SOURCE is the product's new path is
 *      deleted. Without it, renaming a product back to an old slug would 301 the live page to
 *      itself-via-history, since admin rules run before the page.
 *   2. Chains collapse: rules that POINTED at the old path now point at the new one, so a product
 *      renamed twice costs Google one hop, not two.
 *   3. Upsert on the old path, so saving twice never duplicates.
 *
 * NOT COVERED: bulk writes through the query builder (`Product::where()->update([...])`) fire no
 * model events. A command that re-slugs in bulk must call `move()` itself.
 */
class ProductUrlHistory
{
    /** `/{sub}/{slug}`, lowercased; null when either half is missing. */
    public static function pathFor(?string $subSlug, ?string $slug): ?string
    {
        $subSlug = trim((string) $subSlug, "/ \t\n");
        $slug = trim((string) $slug, "/ \t\n");

        if ($subSlug === '' || $slug === '') {
            return null;
        }

        return '/'.mb_strtolower($subSlug).'/'.mb_strtolower($slug);
    }

    /**
     * Call from a `saved` observer: `wasChanged()` and `getOriginal()` still describe the save that
     * just happened there (syncOriginal runs after the event).
     */
    public function recordIfMoved(Product $product): void
    {
        if ($product->wasRecentlyCreated || ! $product->wasChanged(['slug', 'sous_categorie_id'])) {
            return;
        }

        try {
            $oldSubId = $product->getOriginal('sous_categorie_id');
            $newSubId = $product->sous_categorie_id;

            $oldSub = $oldSubId ? SousCategory::whereKey($oldSubId)->value('slug') : null;
            $newSub = $newSubId == $oldSubId
                ? $oldSub
                : ($newSubId ? SousCategory::whereKey($newSubId)->value('slug') : null);

            $old = self::pathFor($oldSub, $product->getOriginal('slug'));
            $new = self::pathFor($newSub, $product->slug);

            if ($old === null || $new === null || $old === $new) {
                return;
            }

            $this->move($old, $new);

            Log::info('Product URL moved — 301 recorded', [
                'product_id' => $product->getKey(),
                'from' => $old,
                'to' => $new,
            ]);
        } catch (\Throwable $e) {
            // The product itself is already saved. Losing the redirect is bad; failing the admin's
            // save over it would be worse, so this is logged and never rethrown.
            Log::warning('Product URL move could not be recorded', [
                'product_id' => $product->getKey(),
                'error' => $e->getMessage(),
            ]);
        }
    }

    /** Record `$old` → `$new` as a permanent move. Both are site-relative paths. */
    public function move(string $old, string $new): void
    {
        // 1. The new address is live — nothing may redirect it away.
        Redirection::query()->where('old_url', $new)->delete();

        // 2. Anything that pointed at the old address now points straight at the new one.
        Redirection::query()->where('new_url', $old)->update(['new_url' => $new, 'code' => 301]);

        // 3. The move itself, idempotently.
        Redirection::query()->updateOrCreate(
            ['old_url' => $old],
            ['new_url' => $new, 'code' => 301, 'is_active' => true],
        );
    }
}
