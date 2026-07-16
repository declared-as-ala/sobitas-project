<?php

namespace App\Services\Seo;

use App\Models\Product;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Instant-indexing + cache-refresh when an SEO-relevant product (or an approved review) changes.
 *
 * It calls the Next.js storefront over the INTERNAL docker network
 * (config: services.frontend.internal_url = http://sobitas-frontend:3000) so the request never
 * traverses Cloudflare, and submits the PUBLIC product URL to IndexNow. All network work is
 * dispatched AFTER the HTTP response and wrapped best-effort — an admin save must never be blocked
 * or broken if the storefront is slow or unreachable.
 */
class SeoNotifier
{
    public function productChanged(Product $product): void
    {
        $path = $this->productPath($product);
        if ($path === null) {
            return;
        }

        $internal = rtrim((string) config('services.frontend.internal_url'), '/');
        $public   = rtrim((string) config('services.frontend.public_url'), '/');
        $secret   = (string) config('services.frontend.revalidate_secret');
        if ($internal === '' || $secret === '') {
            return; // not configured — no-op
        }

        $publicUrl = $public . $path;

        // Runs after the response is flushed (never blocks the admin save); best-effort.
        dispatch(function () use ($internal, $path, $publicUrl, $secret): void {
            try {
                // 1) Refresh the exact product page (price / stock / stars) immediately.
                Http::withToken($secret)->connectTimeout(2)->timeout(4)
                    ->post($internal . '/api/revalidate?path=' . rawurlencode($path));
                // 2) Bust the cached sitemap so <lastmod> reflects the change at once (Google's signal).
                Http::withToken($secret)->connectTimeout(2)->timeout(4)
                    ->post($internal . '/api/revalidate?tag=sitemap');
                // 3) Tell Bing/Yandex/etc. to recrawl now (Google relies on the fresh sitemap instead).
                Http::withToken($secret)->connectTimeout(2)->timeout(4)
                    ->asJson()->post($internal . '/api/indexnow', ['urls' => [$publicUrl]]);
            } catch (\Throwable $e) {
                Log::warning('SeoNotifier failed', ['url' => $publicUrl, 'error' => $e->getMessage()]);
            }
        })->afterResponse();
    }

    /**
     * Canonical product path, derived the SAME way the storefront canonical + sitemap do:
     * the many-to-many sous_categories first, then the legacy single sous_categorie. Returns
     * "/{subSlug}/{slug}" (the indexable URL), or "/shop/{slug}" (which the storefront 301s) when
     * no subcategory is resolvable. Deriving it any other way would revalidate the wrong path.
     */
    protected function productPath(Product $product): ?string
    {
        $slug = trim((string) $product->slug);
        if ($slug === '') {
            return null;
        }

        $sub = optional($product->sousCategories()->first())->slug
            ?? optional($product->sousCategorie)->slug;

        return $sub
            ? '/' . rawurlencode($sub) . '/' . rawurlencode($slug)
            : '/shop/' . rawurlencode($slug);
    }
}
