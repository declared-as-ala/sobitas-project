<?php

namespace App\Http\Controllers\Api;

use App\Support\StorefrontUrl;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ArticleDetailResource;
use App\Http\Resources\BlogCategoryResource as BlogCategoryApiResource;
use App\Http\Resources\BlogTagResource as BlogTagApiResource;
use App\Jobs\SendOrderEmailJob;
use App\Models\Annonce;
use App\Models\Aroma;
use App\Models\Article;
use App\Models\BlogCategory;
use App\Models\BlogTag;
use App\Models\Brand;
use App\Models\Categ;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Contact;
use App\Models\Coordinate;
use App\Models\Faq;
use App\Models\Newsletter;
use App\Models\Page;
use App\Models\Product;
use App\Models\Redirection;
use App\Models\Review;
use App\Models\SeoPage;
use App\Models\Service;
use App\Models\SiteNavigationItem;
use App\Models\Slide;
use App\Models\SousCategory;
use App\Models\Tag;
use App\Filament\Support\ImagePath;
use App\Support\CategorySeoEnvelope;
use App\Support\MediaLibrary\MediaLibraryPayload;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ApisController extends Controller
{
    private const DEFAULT_PER_PAGE = 20;
    private const MAX_PER_PAGE = 100;

    // ── Product select columns (DRY — never SELECT *) ──
    //
    // STOCK COLUMNS ARE MANDATORY IN EVERY LIST. A product card shows an "En stock" / "Rupture"
    // chip, and it can only be right if the row carries the same four fields the product page
    // reads: qte, rupture, force_out_of_stock, low_stock_threshold. Omit any of them and the card
    // silently disagrees with the detail page for the same product — which is exactly what
    // happened: force_out_of_stock and low_stock_threshold were in NONE of these three lists, so
    // an item the admin had explicitly forced out of stock still advertised "En stock" on every
    // grid, and PRODUCT_LIST_COLUMNS had no qte or rupture at all, so /similar_products claimed
    // everything was available. 170 of 303 products are currently out of stock, so this was not
    // an edge case — it was most of the catalogue.
    //
    // If you add a list endpoint, use one of these constants. Do not hand-roll a select().
    private const PRODUCT_LIST_COLUMNS = [
        'id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller',
        'note', 'alt_cover', 'description_cover', 'prix', 'pack', 'promo',
        'promo_expiration_date', 'sous_categorie_id', 'brand_id',
        'qte', 'rupture', 'force_out_of_stock', 'low_stock_threshold',
    ];

    // Columns for product list with relations (includes FKs for filtering)
    private const PRODUCT_FULL_LIST_COLUMNS = [
        'id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller',
        'note', 'alt_cover', 'description_cover', 'prix', 'prix_ht', 'pack', 'promo',
        'promo_expiration_date', 'sous_categorie_id', 'brand_id',
        'qte', 'rupture', 'force_out_of_stock', 'low_stock_threshold',
        'meta_title', 'meta_description', 'seo_title', 'seo_description',
    ];

    /** Same as backend ApisController::PRODUCT_LISTING — used for /api/all_products, which paginates. */
    private const PRODUCT_LISTING = [
        'id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller', 'note',
        'alt_cover', 'description_cover', 'prix', 'pack', 'promo', 'promo_expiration_date',
        'qte', 'rupture', 'force_out_of_stock', 'low_stock_threshold',
        'brand_id', 'sous_categorie_id', 'meta_title', 'meta_description', 'seo_title', 'seo_description',
        // seo_robots_index is here for ONE consumer: the sitemap builder. sitemapData.ts refuses to
        // submit a URL that renders <meta robots="noindex"> — but this projection is the only thing
        // /all_products returns, it carried no robots column at all, and /product_details (the only
        // endpoint that emits `seo.robots.index`) is not what the sitemap reads. So the filter tested
        // `undefined !== false`, which is a constant true, and every published-but-noindex product
        // was submitted anyway. That is invisible today because none of the 309 existing products is
        // noindexed; it becomes 5,000 "Submitted URL marked noindex" errors the first time a wave of
        // imported products is published with seo_robots_index = 0, which is precisely the workflow
        // CatalogIHerbPromote and ImportedProductContent describe. One column, cast to boolean by
        // the model, so the frontend receives true/false/null rather than a MySQL tinyint.
        'seo_robots_index',
        // Timestamps power <lastmod> in the sitemap. Without them the frontend fell back to
        // `new Date()`, so EVERY product claimed to have been modified at the moment of the fetch —
        // Google discounts a lastmod it can prove is untrustworthy, which wasted the signal
        // entirely. Two extra columns, real change dates.
        'created_at', 'updated_at',
    ];

    // Article list columns — exclude description_fr (can be huge HTML); blog_type only if migrated
    private function articleListSelectColumns(): array
    {
        $base = ['id', 'slug', 'designation_fr', 'cover', 'publier', 'created_at'];
        // 'updated_at' is appended LAST on purpose: the array_splice below inserts blog_type at
        // index 9 (just before created_at), so adding anything ahead of that would shift it.
        // Like products, articles need a real change date for the sitemap's <lastmod>.
        $base = ['id', 'slug', 'designation_fr', 'cover', 'publier', 'meta_title', 'meta_description_fr', 'seo_title', 'seo_description', 'created_at', 'updated_at'];
        if (Article::hasBlogTypeColumn()) {
            array_splice($base, 9, 0, ['blog_type']);
        }

        return $base;
    }

    private function resolvePerPage(Request $request, int $default = self::DEFAULT_PER_PAGE): int
    {
        $perPage = (int) $request->query('per_page', $request->query('limit', $default));

        if ($perPage < 1) {
            $perPage = $default;
        }

        return min($perPage, self::MAX_PER_PAGE);
    }

    /**
     * Give each product ONE extra string: the packshot the card cross-fades to on hover.
     *
     * On an iHerb listing the first photograph is the front of the pack and the next is the back —
     * on a supplement, the Supplement Facts panel. Putting it one mouse-move from the grid is the
     * most useful thing a shopper can see without opening the page.
     *
     * ── WHY THIS IS A HELPER AND NOT FOUR COPIES ─────────────────────────────────────────────
     * Product cards are served by FIVE endpoints — /all_products, by-category, by-subcategory,
     * by-brand and similar_products — and the first version of this feature was written into
     * /all_products alone. The result was a hover that worked on /shop and silently did nothing on
     * every category and brand page, which is indistinguishable from "the feature is broken"
     * because those are the pages a shopper actually browses. One implementation, called from each.
     *
     * ── THE TWO THINGS THAT MADE THIS SUBTLE ────────────────────────────────────────────────
     * 1. The caller's eager load MUST be `externalCatalogSource:id,product_id,source_gallery_images`.
     *    Laravel's docs: "always include the id column and any relevant foreign key columns". Drop
     *    `id` and Eloquent cannot hydrate the related model, so the relation is null, this method
     *    returns null for everything, and the endpoint still answers 200. That exact omission is
     *    what made the feature look like missing data for a day.
     *
     * 2. The hover image is the first gallery entry that DIFFERS FROM THE COVER, not gallery[1].
     *    `cover` is not guaranteed to be gallery[0] — for an imported product it is built from the
     *    part number and a primary index — so taking index 1 on faith can swap the packshot for an
     *    identical packshot, which reads as a broken hover rather than as a coincidence.
     *
     * The relation is UNSET afterwards: Eloquent serialises every loaded relation, so leaving it on
     * would ship up to twelve gallery URLs per product in a payload the catalogue walk pays for on
     * every page. Send the one value that gets rendered.
     *
     * @param  \Illuminate\Support\Collection<int, Product>|\Illuminate\Pagination\LengthAwarePaginator  $products
     */
    private function attachHoverImages($products): void
    {
        /*
         * Both sides are compared as the /l/ variant. The same photograph is stored as /s/ in the
         * gallery and served as /l/ in the cover, so comparing raw strings would call one image two.
         * A URL that does not match the documented path shape is passed through untouched rather
         * than mangled — the same rule ImportedSourceContent::largeVariant() follows.
         */
        $normalise = static fn (?string $url): string => $url === null
            ? ''
            : (string) preg_replace('~(/images/[^/]+/[^/]+)/[smlkr]/(\d+\.jpg)$~', '$1/l/$2', $url);

        foreach ($products as $product) {
            $source = $product->relationLoaded('externalCatalogSource')
                ? $product->getRelation('externalCatalogSource')
                : null;

            $gallery = $source?->source_gallery_images;

            // The column is cast to 'array', so this is normally redundant — but the failure mode
            // here is silent (a non-array simply yields null, which looks like "no gallery"), and
            // that silence is what made the original bug expensive to find.
            if (is_string($gallery)) {
                $gallery = json_decode($gallery, true);
            }

            $cover = $normalise(is_string($product->cover) ? $product->cover : null);
            $hover = null;

            if (is_array($gallery)) {
                foreach ($gallery as $candidate) {
                    if (! is_string($candidate) || $candidate === '') {
                        continue;
                    }

                    $large = $normalise($candidate);

                    if ($large !== $cover) {
                        $hover = $large;
                        break;
                    }
                }
            }

            $product->setAttribute('hover_image', $hover);
            $product->unsetRelation('externalCatalogSource');
        }
    }

    private function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'page'      => $paginator->currentPage(),
            'per_page'  => $paginator->perPage(),
            'total'     => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ];
    }

    private function paginationLinks(LengthAwarePaginator $paginator): array
    {
        return [
            'first' => $paginator->url(1),
            'last'  => $paginator->url($paginator->lastPage()),
            'prev'  => $paginator->previousPageUrl(),
            'next'  => $paginator->nextPageUrl(),
        ];
    }

    private function paginatedResponse(LengthAwarePaginator $paginator, string $dataKey = 'data'): array
    {
        return [
            $dataKey => $paginator->items(),
            'meta'   => $this->paginationMeta($paginator),
            'links'  => $this->paginationLinks($paginator),
        ];
    }

    private function paginatedKeyedResponse(LengthAwarePaginator $paginator, string $dataKey): array
    {
        return [
            $dataKey              => $paginator->items(),
            "{$dataKey}_meta"  => $this->paginationMeta($paginator),
            "{$dataKey}_links" => $this->paginationLinks($paginator),
        ];
    }

    private function pagePayload(Page $page): array
    {
        // Forced to the protein.tn apex. Reading the env directly is what made every CMS page
        // synthesise "https://sobitas.tn/{slug}" as its canonical — see StorefrontUrl.
        $frontendBase = StorefrontUrl::base();
        $slug = trim((string) $page->slug);
        $canonical = trim((string) ($page->canonical_url ?? ''));

        if ($canonical === '') {
            $canonical = $slug !== ''
                ? $frontendBase.'/'.rawurlencode($slug)
                : $frontendBase.'/';
        } elseif (str_starts_with($canonical, '/page/')) {
            $canonical = $frontendBase.'/'.ltrim(substr($canonical, strlen('/page/')), '/');
        } elseif (! str_starts_with($canonical, 'http')) {
            $canonical = $frontendBase.'/'.ltrim($canonical, '/');
        } else {
            $parts = parse_url($canonical);
            $path = is_array($parts) ? (string) ($parts['path'] ?? '') : '';
            if (str_starts_with($path, '/page/')) {
                $query = isset($parts['query']) && $parts['query'] !== '' ? '?'.$parts['query'] : '';
                $fragment = isset($parts['fragment']) && $parts['fragment'] !== '' ? '#'.$parts['fragment'] : '';
                $canonical = $frontendBase.'/'.ltrim(substr($path, strlen('/page/')), '/').$query.$fragment;
            }
        }

        return [
            'id' => $page->id,
            'author_id' => $page->author_id,
            'title' => $page->title,
            'slug' => $page->slug,
            'excerpt' => $page->excerpt,
            'body' => $page->body,
            'body_editor_type' => $page->body_editor_type,
            'image' => $page->image,
            'meta_title' => $page->meta_title,
            'meta_description' => $page->meta_description,
            'meta_keywords' => $page->meta_keywords,
            'canonical_url' => $canonical,
            'robots_index' => $page->robots_index ?? true,
            'robots_follow' => $page->robots_follow ?? true,
            'og_title' => $page->og_title,
            'og_description' => $page->og_description,
            'og_image' => $page->og_image,
            'status' => $page->status,
            'created_at' => $page->created_at,
            'updated_at' => $page->updated_at,
        ];
    }

    private function normalizeCollectionImages(
        \Illuminate\Support\Collection $collection,
        string ...$fields
    ): void {
        $collection->transform(function ($item) use ($fields) {
            foreach ($fields as $field) {
                $value = $item->{$field};
                $item->{$field} = is_array($value)
                    ? ImagePath::normalizeArray($value)
                    : ImagePath::normalize($value);
            }

            return $item;
        });
    }

    private function normalizePaginatorImages(
        LengthAwarePaginator $paginator,
        string ...$fields
    ): void {
        $this->normalizeCollectionImages($paginator->getCollection(), ...$fields);
    }

    /**
     * EVERY product listing must eager-load `sousCategorie`, or the frontend cannot build a
     * canonical product URL.
     *
     * getProductLink() (frontend/src/util/productUrl.ts) returns /{subcategory}/{slug} when the
     * relation is present and falls back to the legacy /shop/{slug} when it is not — and
     * /shop/{slug} is a 301 to the canonical form. Only allProducts() loaded the relation, so
     * every other listing emitted redirect links: measured across the 88 listing URLs in the
     * sitemap, 639 of 875 product anchors (73%) pointed at a redirect, and 76 products had no
     * canonical inbound link anywhere on the site. Whole page classes were 100% redirects —
     * /equipement, /proteines, /performance and every brand page.
     *
     * It is not just wasted crawl budget: those pages are what should rank for product-name
     * queries, and they were being linked with the weakest signal available. The ItemList schema
     * on category pages was publishing the redirect URLs too.
     */
    private function productListQuery()
    {
        return Product::where('publier', 1)
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
            ->with('sousCategorie:id,slug,designation_fr,categorie_id', 'externalCatalogSource:id,product_id,source_gallery_images')
            ->withCount(['reviews' => fn ($q) => $q->where('publier', 1)]);
    }

    /**
     * Shared home data builder — DRY: accueil() and home() share this logic.
     */
    private function buildHomeData(): array
    {
        $new_product = $this->productListQuery()
            ->where('new_product', 1)
            ->latest('created_at')
            ->limit(8)
            ->get();

        $packs = $this->productListQuery()
            ->where('pack', 1)
            ->latest('created_at')
            ->limit(4)
            ->get();

        $last_articles = Article::where('publier', 1)
            ->latest('created_at')
            ->select('id', 'slug', 'designation_fr', 'cover', 'created_at')
            ->limit(4)
            ->get();

        $ventes_flash = $this->productListQuery()
            ->whereNotNull('promo')
            ->whereDate('promo_expiration_date', '>', Carbon::now())
            ->limit(50)
            ->get();

        $best_sellers = $this->productListQuery()
            ->where('best_seller', 1)
            ->latest('created_at')
            ->limit(4)
            ->get();

        $this->enrichProductCollectionWithCoverMedia($new_product);
        $this->enrichProductCollectionWithCoverMedia($packs);
        $this->enrichProductCollectionWithCoverMedia($ventes_flash);
        $this->enrichProductCollectionWithCoverMedia($best_sellers);
        $this->enrichArticleCollectionWithCoverMedia($last_articles);

        return compact('new_product', 'packs', 'last_articles', 'ventes_flash', 'best_sellers');
    }

    private function enrichProductCollectionWithCoverMedia(\Illuminate\Support\Collection $collection): void
    {
        if ($collection->isEmpty()) {
            return;
        }

        $paths = $collection->pluck('cover')
            ->map(fn ($p) => ImagePath::normalize($p))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($paths === []) {
            return;
        }

        $map = MediaLibraryPayload::forPaths('public', $paths);

        foreach ($collection as $product) {
            $n = ImagePath::normalize($product->cover);
            $product->setAttribute('cover_media', $n && isset($map[$n]) ? $map[$n] : null);
        }
    }

    private function enrichArticleCollectionWithCoverMedia(\Illuminate\Support\Collection $collection): void
    {
        if ($collection->isEmpty()) {
            return;
        }

        $paths = $collection->pluck('cover')
            ->map(fn ($p) => ImagePath::normalize($p))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($paths === []) {
            return;
        }

        $map = MediaLibraryPayload::forPaths('public', $paths);

        foreach ($collection as $article) {
            $n = ImagePath::normalize($article->cover);
            $article->setAttribute('cover_media', $n && isset($map[$n]) ? $map[$n] : null);
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<int, \App\Models\Categ>  $items
     * @return list<array<string, mixed>>
     */
    private function categoriesWithCoverMedia(\Illuminate\Support\Collection $items): array
    {
        if ($items->isEmpty()) {
            return [];
        }

        $paths = $items->pluck('cover')
            ->map(fn ($p) => ImagePath::normalize($p))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $map = $paths === [] ? [] : MediaLibraryPayload::forPaths('public', $paths);

        return $items->map(function (Categ $categ) use ($map): array {
            $base = $categ->toArray();
            $n = ImagePath::normalize($categ->cover);
            $base['cover_media'] = $n && isset($map[$n]) ? $map[$n] : null;

            return $base;
        })->values()->all();
    }

    // ── Endpoints ───────────────────────────────────────

    public function accueil(Request $request): array
    {
        $perPage = $this->resolvePerPage($request);
        $data = $this->buildHomeData();

        $categories = Categ::query()
            ->select([
                'id', 'sort_order', 'cover', 'slug', 'designation_fr',
                'sitemap_include', 'sitemap_priority', 'sitemap_changefreq', 'robots_index', 'seo_enabled',
                'updated_at', 'created_at',
            ])
            ->with(['sousCategories' => fn ($q) => $q->select(
                'id', 'sort_order', 'slug', 'designation_fr', 'categorie_id',
                'sitemap_include', 'sitemap_priority', 'sitemap_changefreq', 'robots_index', 'seo_enabled',
                'updated_at', 'created_at',
            )->orderBy('sort_order')->orderBy('id')])
            ->orderBy('id')
            ->paginate($perPage);

        $data['categories'] = $this->categoriesWithCoverMedia($categories->getCollection());
        $data['categories_meta'] = $this->paginationMeta($categories);
        $data['categories_links'] = $this->paginationLinks($categories);

        return $data;
    }

    public function home(): array
    {
        return $this->buildHomeData();
    }

    public function categories(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $categories = Categ::query()
            ->select([
                'id', 'sort_order', 'cover', 'slug', 'designation_fr',
                'sitemap_include', 'sitemap_priority', 'sitemap_changefreq', 'robots_index', 'seo_enabled',
                'updated_at', 'created_at',
            ])
            ->with(['sousCategories' => fn ($q) => $q->select(
                'id', 'sort_order', 'slug', 'designation_fr', 'categorie_id',
                'sitemap_include', 'sitemap_priority', 'sitemap_changefreq', 'robots_index', 'seo_enabled',
                'updated_at', 'created_at',
            )->orderBy('sort_order')->orderBy('id')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate($perPage);

        $categories->setCollection(
            collect($this->categoriesWithCoverMedia($categories->getCollection()))
        );

        return $this->paginatedResponse($categories);
    }

    public function slides(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        // Query all columns to avoid column name mismatches
        // Handle both possible column names: titre/title, lien/link
        //
        // The is_active filter and ordre sort are guarded on Schema::hasColumn because the
        // Filament backend and the Next.js frontend deploy from SEPARATE workflows: this
        // controller can go live before the migration that adds those columns has run.
        // Without the guard that window is a hard 500 on the homepage's slide fetch.
        $hasActiveFlag = Schema::hasColumn('slides', 'is_active');
        $hasOrdre      = Schema::hasColumn('slides', 'ordre');

        $slides = Slide::query()
            ->when($hasActiveFlag, fn ($q) => $q->where('is_active', true))
            ->when($hasOrdre, fn ($q) => $q->orderBy('ordre'))
            ->orderBy('id')
            ->paginate($perPage);

        // Both crops need a media-library lookup — the mobile variant is a real image, not a
        // derivative of the desktop one, so it needs its own width/height for the <picture>.
        $libraryPaths = $slides->getCollection()
            ->flatMap(fn ($slide) => [$slide->image, $slide->image_mobile ?? null])
            ->map(fn ($img) => ImagePath::normalize($img))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $libraryByPath = $libraryPaths === []
            ? []
            : MediaLibraryPayload::forPaths('public', $libraryPaths);

        // Map response for backward compatibility with frontend
        // Frontend expects: cover, title, link
        // Database may have: image, titre/title, lien/link, type
        $slides->getCollection()->transform(function ($slide) use ($libraryByPath) {
            $title = $slide->titre ?? $slide->title ?? null;
            $link  = $slide->lien  ?? $slide->link  ?? null;

            // Normalize to a clean relative path (strips full URLs, legacy public/ prefix).
            // The frontend's getStorageUrl() prepends NEXT_PUBLIC_STORAGE_URL so every
            // consumer produces the same absolute URL regardless of where this runs.
            $norm = ImagePath::normalize($slide->image);

            // Only advertise a mobile crop that actually exists on disk. Emitting a path to a
            // missing file would give the hero <picture> a 404 source with no fallback, whereas
            // null makes it cleanly reuse the desktop image. `null` fallback (not the placeholder)
            // is deliberate — a placeholder image would be worse than no mobile crop at all.
            // Cheap behind the 5-min route cache; normalizeExisting also swallows disk errors.
            $normMobile = ImagePath::normalizeExisting($slide->image_mobile ?? null, 'public', null);

            return [
                'id'    => $slide->id,
                'cover' => $norm,
                'title' => $title,
                'link'  => $link,
                'type'  => $slide->type ?? 'web',

                // Optional phone crop. Null means "reuse the desktop image" — the frontend
                // <picture> falls back rather than rendering a broken source.
                'cover_mobile'      => $normMobile,
                'image_media'       => $norm ? ($libraryByPath[$norm] ?? null) : null,
                'image_mobile_media' => $normMobile ? ($libraryByPath[$normMobile] ?? null) : null,

                // Editorial overlay text. Rendered as real HTML by the hero (never baked into
                // the image) so it reflows, indexes and is announced by screen readers.
                'subtitle'  => $slide->sous_titre ?? null,
                'cta_label' => $slide->cta_label ?? null,
                // Short pill above the headline ("NOUVEAUTÉ"). Null = no pill rendered.
                'badge'     => $slide->badge ?? null,
                'alt'       => $slide->alt ?? null,
                'ordre'     => (int) ($slide->ordre ?? 0),
                'is_active' => (bool) ($slide->is_active ?? true),
            ];
        });

        return $this->paginatedResponse($slides);
    }

    public function coordonnees()
    {
        return Coordinate::getCached();
    }

    public function latestProducts(): array
    {
        $new_product = $this->productListQuery()
            ->where('new_product', 1)
            ->latest('created_at')
            ->limit(8)
            ->get();

        $packs = $this->productListQuery()
            ->where('pack', 1)
            ->latest('created_at')
            ->limit(4)
            ->get();

        $best_sellers = $this->productListQuery()
            ->where('best_seller', 1)
            ->latest('created_at')
            ->limit(4)
            ->get();

        return compact('new_product', 'packs', 'best_sellers');
    }

    public function latestPacks()
    {
        return $this->productListQuery()
            ->where('pack', 1)
            ->latest('created_at')
            ->limit(4)
            ->get();
    }

    /**
     * Product detail by slug. qte and rupture are returned as stored; rupture is derived from qte on save (Product::booted).
     */
    public function productDetails(string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)
            ->where('publier', 1)
            ->with([
                'brand:id,designation_fr,logo',
                'sousCategorie:id,designation_fr,slug,categorie_id',
                'sousCategorie.categorie:id,designation_fr,slug',
                'tags:id,designation_fr',
                'aromes:id,designation_fr',
                'reviews' => fn ($q) => $q->where('publier', 1)->with('user:id,name,avatar')->latest(),
                /**
                 * The staging row an imported product was promoted from — NULL for all 309 legacy
                 * products, which have no such row and never will.
                 *
                 * Column-limited on purpose. The staging table also holds a source URL to a
                 * competitor, an upstream rating we are forbidden to surface, and the whole raw
                 * payload; a bare `with('externalCatalogSource')` would put all of it in a public
                 * JSON response. Only the transcribed facts the page is allowed to print are
                 * selected, and `product_id` because Eloquent cannot match a hasOne without it.
                 *
                 * ── THE TRANSCRIBED PAGE CONTENT, AND WHAT IS STILL NOT HERE ────────────────
                 * Migration 2026_08_10_000009 added what the iHerb PRODUCT PAGE carries, and the
                 * blocks a customer reads are selected below. Absent, each for a stated reason
                 * (ImportedSourceContent's class docblock carries the argument): `source_content_url`
                 * (a link to the shop we sourced from — the same decision already recorded for
                 * `external_url`), `source_manufacturer_url` (an unreviewed outbound link on ~19,000
                 * pages), `source_spec_shipping_weight`, `source_spec_actual_weight` and
                 * `source_spec_first_available` (facts about THEIR logistics and THEIR catalogue —
                 * the two weights are the same number on a real product, see
                 * ImportedSourceContent::SPEC_COLUMNS), `source_spec_package_quantity` (the pack
                 * size again, in their words, next to ours), `source_content_excerpt` (4,000
                 * characters of debugging markup) and every rating column.
                 *
                 * `source_overview_html` is absent for a different reason: it is folded into
                 * `products.description_fr`, which this endpoint returns, so selecting it here would
                 * ship the manufacturer's paragraph twice and invite a view to render it twice.
                 *
                 * THAT FOLD HAPPENS AT ONE MOMENT ONLY — Product::create() in CatalogIHerbPromote —
                 * so it is true of a product promoted AFTER its page was read, and false of one
                 * promoted before. For the second kind, `catalog:iherb:promote --recompose` is what
                 * writes the overview (and the barcode, and seo_schema_description) into the product;
                 * until it has run, those pages carry the composed body alone. This projection is
                 * correct either way: it never carries the overview, and description_fr always does
                 * once the fold has happened.
                 *
                 * `source_content_locale` and `source_content_translated` are not decoration. The
                 * first is the gate — ImportedSourceContent publishes nothing whose stored language
                 * is not French — and the second is what makes the page able to say that its French
                 * is a machine translation, which on text containing dosage and contraindications is
                 * not optional.
                 */
                'externalCatalogSource:id,product_id,pack_size,pack_unit,flavour,source_image_url'
                    .',source_suggested_use_html,source_other_ingredients_html,source_warnings_html'
                    .',source_supplement_facts_html,source_gallery_images'
                    .',source_spec_dimensions'
                    .',source_content_locale,source_content_translated',
            ])
            ->first();

        if (! $product) {
            return response()->json(['error' => 'Produit introuvable'], 404);
        }

        return response()->json((new ProductDetailResource($product))->resolve());
    }

    /**
     * All products — no pagination, exactly like backend folder.
     * qte and rupture are returned as stored (qte = source of truth, rupture = out-of-stock flag).
     */
    public function allProducts(Request $request): JsonResponse
    {
        // Eager-load the subcategory (id,slug) so every product carries its canonical
        // /{subcat}/{slug} path at the source — the frontend no longer has to reconstruct it from
        // the categories list to avoid /shop/ 301 hops (the "Page with redirect" bucket in GSC).
        // Real star ratings, computed from attested reviews only (Review::scopeAttested).
        //
        // `products.note` is a legacy column, NULL on every row, so the grid never had a number to
        // print. These two aliases give it a real average the moment a genuine review lands.
        // Deliberately computed, not denormalised: a cached column would drift the moment a review
        // is edited, unpublished or moderated, and a wrong star rating is worse than none.
        //
        // TWO THINGS HERE ARE EASY TO GET WRONG, AND I GOT BOTH WRONG FIRST TIME.
        //
        // 1. The rating column on `reviews` is `stars`, NOT `note`. There is no reviews.note —
        //    confirmed against the live database. The Review model casts 'note' => 'integer',
        //    which is vestigial and misleading; only ProductSchemaBuilder::reviewStarValue()'s
        //    `stars ?? note` fallback keeps it alive. Averaging 'note' produced
        //    "Unknown column 'reviews.note'" and took /api/all_products down with a 500.
        //
        // 2. select() must come BEFORE the aggregates. withCount()/withAvg() append their
        //    subqueries to the builder's column list and select() REPLACES it, so calling select()
        //    last silently discards both — the query still returns 200, just with no rating fields
        //    at all. That failure is invisible in a status code; it has to be checked in the
        //    payload.
        $query = Product::where('publier', 1)
            ->with('sousCategorie:id,slug,designation_fr,categorie_id', 'externalCatalogSource:id,product_id,source_gallery_images')
            ->select(self::PRODUCT_LISTING)
            ->withCount(['reviews as review_count' => fn ($q) => $q->attested()])
            ->withAvg(['reviews as rating_value' => fn ($q) => $q->attested()], 'stars');

        if ($search = trim((string) $request->get('search', ''))) {
            $matchingBrandIds = Brand::where('designation_fr', 'like', '%' . $search . '%')->pluck('id');
            $query->where(function ($q) use ($search, $matchingBrandIds) {
                $q->where('designation_fr', 'like', '%' . $search . '%')
                    ->orWhere('slug', 'like', '%' . $search . '%')
                    ->orWhereIn('brand_id', $matchingBrandIds);
            });
        }
        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->get('brand_id'));
        }
        if ($request->filled('min_price')) {
            $query->where('prix', '>=', (float) $request->get('min_price'));
        }
        if ($request->filled('max_price')) {
            $query->where('prix', '<=', (float) $request->get('max_price'));
        }

        $sort = $request->get('sort');
        if ($sort === 'price_asc') {
            $query->orderBy('prix');
        } elseif ($sort === 'price_desc') {
            $query->orderByDesc('prix');
        } else {
            $query->latest('created_at');
        }

        // ── PAGINATED. It was not, and that was a live hazard. ──────────────────────────────
        //
        // This method ended in `$query->get()`: every published product, with brands and
        // categories, JSON-encoded into one body and cached for 60s. At 309 products that is
        // merely wasteful. At the scale of an imported catalogue it is a multi-megabyte response
        // rebuilt every minute, on the endpoint that both the shop page AND the sitemap depend on
        // — so the storefront and Google's discovery of it fail together.
        //
        // The client was ALREADY written for pagination: it sends per_page/page, reads
        // `raw.products?.data` as a fallback, and sitemapData.ts loops on `pagination.last_page`.
        // Only the server never paginated, so that loop always broke after one pass. Nothing on
        // the frontend has to change.
        $perPage = $this->resolvePerPage($request, 24);
        $paginator = $query->paginate($perPage);
        $products = $paginator->getCollection();

        // Brands for the WHOLE published catalogue — deliberately NOT derived from this page.
        //
        // The old code took brand_ids from the products it had, which was every product. Keeping
        // that line after paginating would have quietly reduced the shop's brand filter to the
        // brands of whichever 24 products happened to be on page 1: a filter that hides most of
        // the catalogue, on a page that still returns 200. A subquery rather than pluck(), so the
        // id list never travels through PHP.
        /*
         * ── SELECT THE SIX COLUMNS THE CLIENT ACTUALLY READS, NOT THE WHOLE ROW ───────────
         *
         * This was a bare ->get(), so every call returned all 18 brand columns — including
         * content_seo, review, aggregateRating, nutrition_values, questions, more_details and
         * description_fr, none of which any caller reads.
         *
         * Measured against the live API on 11/08/2026: 84 brands serialised to 364,297 bytes, on a
         * request for per_page=1 whose products array was 1,599 bytes. The brand list is a FIXED
         * cost paid on every page of the walk — it is deliberately computed over the whole
         * published catalogue rather than the current page, so the shop's brand filter is not
         * reduced to the brands of whichever products landed on page 1 — and getAllProductsComplete
         * requests seven pages to render /shop. That is ~2.5 MB of brand JSON built, encoded and
         * transferred per render, for a filter that needs a name, an id and a logo.
         *
         * It is the reason this endpoint costs ~4.5s even at per_page=1 with all middleware
         * stripped (measured on /all_products_fast), and therefore the reason /shop took 16.9s and
         * the sitemap crawl fell into its 503 fallback: both depend on this walk.
         *
         * The column list is exactly what callers read, verified two ways rather than assumed.
         * By grep over the frontend: the only brand fields any component touches are
         * designation_fr (30 uses), id (15), logo (4) and alt_cover (2). description_fr is declared
         * optional on the Brand type and read nowhere, and it is one of the large text columns, so
         * it is deliberately not selected — an absent optional field is type-safe, a 4 KB one
         * nobody renders is not free.
         *
         * AND against the live payload's own key list, which is what caught the mistake: the first
         * version of this select() asked for `designation_ar`, because the frontend's Brand type
         * declares it. THERE IS NO designation_ar COLUMN ON `brands` — the type is wrong, not the
         * table. Selecting it would have thrown SQLSTATE 42S22 and taken /api/all_products, the
         * shop page and the sitemap down together, on the one endpoint least able to afford it.
         * A select() list is only as safe as the schema it was checked against.
         *
         * productsByCategoryId() below already selects its brand columns this way; this brings the
         * busiest endpoint in line with it.
         */
        $brands = Brand::whereIn(
            'id',
            Product::where('publier', 1)->whereNotNull('brand_id')->select('brand_id')
        )->select('id', 'designation_fr', 'slug', 'logo', 'alt_cover')->get();

        $categories = Categ::select('id', 'slug', 'designation_fr', 'cover')->get();

        $this->normalizeCollectionImages($products, 'cover');
        $this->normalizeCollectionImages($brands, 'logo');
        $this->normalizeCollectionImages($categories, 'cover');

        $this->attachHoverImages($products);

        return response()->json([
            'products'   => $products,
            'brands'     => $brands,
            'categories' => $categories,
            // Both `page` and `current_page`. The shared paginationMeta() helper emits `page`,
            // but this endpoint's client reads `current_page` (services/api.ts) — emitting only
            // one of them leaves the shop's pager with an undefined current page while every
            // status code stays 200.
            'pagination' => [
                'page'         => $paginator->currentPage(),
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * Products by category — FIXED: added column selection + limit.
     */
    public function productsByCategoryId(Request $request, string $slug): JsonResponse
    {
        $perPage = $this->resolvePerPage($request);

        $category = Categ::where('slug', $slug)->first();

        if (! $category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        $sousCategoriesPaginator = SousCategory::where('categorie_id', $category->id)
            ->select('id', 'slug', 'designation_fr', 'categorie_id')
            ->orderBy('designation_fr')
            ->paginate($perPage);

        $productsPaginator = Product::where('publier', 1)
            ->whereIn('sous_categorie_id', SousCategory::where('categorie_id', $category->id)->select('id'))
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr', 'sousCategorie:id,slug,designation_fr,categorie_id', 'externalCatalogSource:id,product_id,source_gallery_images')
            ->latest('created_at')
            ->paginate($perPage);

        $products = $productsPaginator->getCollection();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())
            ->select('id', 'designation_fr', 'logo')
            ->orderBy('designation_fr')
            ->get();

        $this->normalizePaginatorImages($productsPaginator, 'cover');
        $this->normalizeCollectionImages($brands, 'logo');
        $category->cover = ImagePath::normalize($category->cover);

        $frontendBase = StorefrontUrl::base();

        return response()->json(array_merge(
            [
                'category'        => $category,
                'seo'             => CategorySeoEnvelope::forCateg($category, $frontendBase),
                'breadcrumb'      => [
                    ['name' => 'Accueil', 'url' => $frontendBase.'/'],
                    ['name' => $category->designation_fr, 'url' => $frontendBase.'/'.rawurlencode((string) $category->slug)],
                ],
                'sous_categories' => $sousCategoriesPaginator->items(),
                'products'        => $productsPaginator->items(),
                'brands'          => $brands,
            ],
            $this->paginatedKeyedResponse($sousCategoriesPaginator, 'sous_categories'),
            $this->paginatedKeyedResponse($productsPaginator, 'products')
        ));
    }

    /**
     * Products by brand — FIXED: added column selection + limit.
     */
    public function productsByBrandId(Request $request, int $brand_id): JsonResponse
    {
        $perPage = $this->resolvePerPage($request);

        $brand = Brand::select('id', 'designation_fr', 'logo')->find($brand_id);

        if (! $brand) {
            return response()->json(['error' => 'Brand not found'], 404);
        }

        $categoriesPaginator = Categ::select('id', 'designation_fr', 'slug')
            ->orderBy('designation_fr')
            ->paginate($perPage);

        $productsPaginator = Product::where('brand_id', $brand_id)
            ->where('publier', 1)
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr', 'sousCategorie:id,slug,designation_fr,categorie_id', 'externalCatalogSource:id,product_id,source_gallery_images')
            ->latest('created_at')
            ->paginate($perPage);

        $brandsPaginator = Brand::select('id', 'designation_fr', 'logo')
            ->orderBy('designation_fr')
            ->paginate($perPage);

        $this->normalizePaginatorImages($productsPaginator, 'cover');
        $this->normalizePaginatorImages($brandsPaginator, 'logo');
        $brand->logo = ImagePath::normalize($brand->logo);

        return response()->json(array_merge(
            [
                'categories' => $categoriesPaginator->items(),
                'products'   => $productsPaginator->items(),
                'brands'     => $brandsPaginator->items(),
                'brand'      => $brand,
            ],
            $this->paginatedKeyedResponse($categoriesPaginator, 'categories'),
            $this->paginatedKeyedResponse($productsPaginator, 'products'),
            $this->paginatedKeyedResponse($brandsPaginator, 'brands')
        ));
    }

    /**
     * Products by subcategory — returns ALL products (supports many-to-many).
     */
    public function productsBySubCategoryId(Request $request, string $slug): JsonResponse
    {
        $sous_category = SousCategory::query()
            ->where('slug', $slug)
            ->with('categorie:id,slug,designation_fr')
            ->first();

        if (! $sous_category) {
            return response()->json(['error' => 'Sous-catégorie introuvable'], 404);
        }

        $frontendBase = StorefrontUrl::base();
        $seo = CategorySeoEnvelope::forSousCategory($sous_category, $frontendBase);
        $breadcrumb = [
            ['name' => 'Accueil', 'url' => $frontendBase.'/'],
        ];
        $cat = $sous_category->categorie;
        if ($cat) {
            $breadcrumb[] = [
                'name' => $cat->designation_fr,
                'url' => $frontendBase.'/'.rawurlencode((string) $cat->slug),
            ];
        }
        $breadcrumb[] = [
            'name' => ($seo['breadcrumb_label'] ?? '') !== '' ? (string) $seo['breadcrumb_label'] : $sous_category->designation_fr,
            'url' => $frontendBase.'/'.rawurlencode((string) $sous_category->slug),
        ];

        // Get ALL products for this subcategory using many-to-many relationship
        // Checks both legacy sous_categorie_id AND new pivot table
        $products = Product::where('publier', 1)
            ->where(function ($query) use ($sous_category) {
                // Legacy single subcategory
                $query->where('sous_categorie_id', $sous_category->id)
                    // New many-to-many relationship
                    ->orWhereHas('sousCategories', function ($q) use ($sous_category) {
                        $q->where('sous_categories.id', $sous_category->id);
                    });
            })
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
            ->with(['aromes:id,designation_fr', 'tags:id,designation_fr', 'sousCategories:id,slug,designation_fr,categorie_id', 'sousCategorie:id,slug,designation_fr,categorie_id', 'externalCatalogSource:id,product_id,source_gallery_images'])
            ->latest('created_at')
            ->get();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())
            ->select('id', 'designation_fr', 'logo')
            ->orderBy('designation_fr')
            ->get();

        $sousCategories = SousCategory::where('categorie_id', $sous_category->categorie_id)
            ->select('id', 'slug', 'designation_fr', 'categorie_id')
            ->orderBy('designation_fr')
            ->get();

        $this->normalizeCollectionImages($products, 'cover');
        $this->attachHoverImages($products);
        $this->normalizeCollectionImages($brands, 'logo');

        return response()->json([
            'sous_category'   => $sous_category,
            'seo'             => $seo,
            'breadcrumb'      => $breadcrumb,
            'products'        => $products,
            'brands'          => $brands,
            'sous_categories' => $sousCategories,
        ]);
    }

    public function searchProduct(string $text): array
    {
        $text = mb_substr(trim($text), 0, 100);

        if (mb_strlen($text) < 2) {
            return ['products' => [], 'brands' => []];
        }

        $matchingBrandIds = Brand::where('designation_fr', 'like', "%{$text}%")->pluck('id');
        $products = Product::where('publier', 1)
            ->where(function ($q) use ($text, $matchingBrandIds) {
                $q->where('designation_fr', 'like', "%{$text}%")
                  ->orWhere('slug', 'like', "%{$text}%")
                  ->orWhereIn('brand_id', $matchingBrandIds);
            })
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr', 'sousCategorie:id,slug,designation_fr,categorie_id')
            ->limit(50)
            ->get();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())
            ->select('id', 'designation_fr', 'logo')
            ->get();

        $this->normalizeCollectionImages($products, 'cover');
        $this->attachHoverImages($products);
        $this->normalizeCollectionImages($brands, 'logo');

        return compact('products', 'brands');
    }

    public function searchProductBySubCategoryText(string $slug, string $text): array
    {
        $text = mb_substr(trim($text), 0, 100);

        if (mb_strlen($text) < 2) {
            return ['products' => [], 'brands' => []];
        }

        $sous_category = SousCategory::where('slug', $slug)->select('id')->first();

        $query = Product::where('publier', 1)
            ->where('designation_fr', 'LIKE', "%{$text}%")
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr', 'sousCategorie:id,slug,designation_fr,categorie_id');

        if ($sous_category) {
            $query->where('sous_categorie_id', $sous_category->id);
        }

        $products = $query->limit(50)->get();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())
            ->select('id', 'designation_fr', 'logo')
            ->get();

        $this->normalizeCollectionImages($products, 'cover');
        $this->attachHoverImages($products);
        $this->normalizeCollectionImages($brands, 'logo');

        return compact('products', 'brands');
    }

    /**
     * All articles — FIXED: select columns (was SELECT * including huge HTML), add limit.
     */
    public function allArticles(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $articles = Article::where('publier', 1)
            ->select($this->articleListSelectColumns())
            ->latest('created_at')
            ->paginate($perPage);

        return $this->paginatedResponse($articles);
    }

    public function articleDetails(string $slug): JsonResponse
    {
        $article = Article::where('slug', $slug)
            ->where('publier', 1)
            ->with(['categories:id,name,slug', 'tags:id,name,slug'])
            ->first();

        if (! $article) {
            return response()->json(['error' => 'Article introuvable'], 404);
        }

        return response()->json((new ArticleDetailResource($article))->resolve());
    }

    public function latestArticles()
    {
        $cols = ['id', 'slug', 'designation_fr', 'cover', 'created_at'];
        if (Article::hasBlogTypeColumn()) {
            $cols = ['id', 'slug', 'designation_fr', 'cover', 'blog_type', 'created_at'];
        }

        return Article::where('publier', 1)
            ->latest('created_at')
            ->select($cols)
            ->limit(4)
            ->get();
    }

    public function blogCategories(): JsonResponse
    {
        $categories = BlogCategory::query()
            ->withCount(['articles' => fn ($q) => $q->where('publier', 1)])
            ->orderBy('name')
            ->get();

        return response()->json(BlogCategoryApiResource::collection($categories));
    }

    public function blogTags(): JsonResponse
    {
        $tags = BlogTag::query()
            ->withCount(['articles' => fn ($q) => $q->where('publier', 1)])
            ->orderBy('name')
            ->get();

        return response()->json(BlogTagApiResource::collection($tags));
    }

    public function articlesByBlogCategorySlug(Request $request, string $slug): JsonResponse
    {
        $perPage = $this->resolvePerPage($request);
        $category = BlogCategory::where('slug', $slug)->first();
        if (! $category) {
            return response()->json(['error' => 'Categorie blog introuvable'], 404);
        }

        $articles = $category->articles()
            ->where('publier', 1)
            ->select($this->articleListSelectColumns())
            ->latest('created_at')
            ->paginate($perPage);

        return response()->json([
            'category' => (new BlogCategoryApiResource($category))->resolve(),
            'articles' => $articles->items(),
            'meta' => $this->paginationMeta($articles),
            'links' => $this->paginationLinks($articles),
        ]);
    }

    public function articlesByBlogTagSlug(Request $request, string $slug): JsonResponse
    {
        $perPage = $this->resolvePerPage($request);
        $tag = BlogTag::where('slug', $slug)->first();
        if (! $tag) {
            return response()->json(['error' => 'Tag blog introuvable'], 404);
        }

        $articles = $tag->articles()
            ->where('publier', 1)
            ->select($this->articleListSelectColumns())
            ->latest('created_at')
            ->paginate($perPage);

        return response()->json([
            'tag' => (new BlogTagApiResource($tag))->resolve(),
            'articles' => $articles->items(),
            'meta' => $this->paginationMeta($articles),
            'links' => $this->paginationLinks($articles),
        ]);
    }

    public function allBrands(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $brands = Brand::select('id', 'logo', 'designation_fr', 'alt_cover', 'updated_at', 'created_at')
            ->orderBy('designation_fr')
            ->paginate($perPage);

        $this->normalizePaginatorImages($brands, 'logo');

        return $this->paginatedResponse($brands);
    }

    public function aromes(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $aromes = Aroma::select('id', 'designation_fr')
            ->orderBy('designation_fr')
            ->paginate($perPage);

        return $this->paginatedResponse($aromes);
    }

    public function tags(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $tags = Tag::select('id', 'designation_fr')
            ->orderBy('designation_fr')
            ->paginate($perPage);

        return $this->paginatedResponse($tags);
    }

    /**
     * Packs — FIXED: added limit (was unbounded).
     */
    public function packs(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $packs = $this->productListQuery()
            ->where('pack', 1)
            ->latest('created_at')
            ->paginate($perPage);

        return $this->paginatedResponse($packs);
    }

    /**
     * Flash sales — FIXED: added limit (was unbounded).
     */
    public function flash(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $flash = $this->productListQuery()
            ->whereNotNull('promo')
            ->whereDate('promo_expiration_date', '>', Carbon::now())
            ->latest('created_at')
            ->paginate($perPage);

        return $this->paginatedResponse($flash);
    }

    public function media()
    {
        $annonce = Annonce::select('id', 'cover', 'title', 'link', 'publier')->first();

        if ($annonce) {
            $annonce->cover = ImagePath::normalize($annonce->cover);
        }

        return $annonce;
    }

    public function newsLetter(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = $request->input('email');

        if (Newsletter::where('email', $email)->exists()) {
            return response()->json(['error' => 'Vous êtes déjà inscrit!'], 406);
        }

        Newsletter::create(['email' => $email]);

        return response()->json(['success' => 'Merci de vous inscrire!']);
    }

    public function sendContact(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'    => ['required', 'string', 'max:255'],
            'email'   => ['required', 'email', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        Contact::create($validated);

        return response()->json(['success' => 'Votre message envoyé avec succès']);
    }

    /**
     * Services — FIXED: select columns + limit.
     */
    public function services(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $services = Service::select('id', 'title', 'description', 'icon', 'cover')
            ->orderBy('id')
            ->paginate($perPage);

        $this->normalizePaginatorImages($services, 'cover');

        return $this->paginatedResponse($services);
    }

    /**
     * FAQs — FIXED: select columns + limit.
     */
    public function faqs(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $faqs = Faq::select('id', 'question', 'answer')
            ->orderBy('id')
            ->paginate($perPage);

        return $this->paginatedResponse($faqs);
    }

    public function pages(Request $request)
    {
        try {
            $perPage = $this->resolvePerPage($request);

            $pages = Page::query()
                ->where('status', Page::STATUS_ACTIVE)
                ->select('id', 'title', 'slug', 'meta_title', 'meta_description', 'updated_at')
                ->orderBy('id')
                ->paginate($perPage);

            return $this->paginatedResponse($pages);
        } catch (\Exception $e) {
            return [];
        }
    }

    public function getPageBySlug(string $slug)
    {
        try {
            $page = Page::query()
                ->where('slug', $slug)
                ->where('status', Page::STATUS_ACTIVE)
                ->first();

            if (! $page) {
                return response()->json(['error' => 'Page introuvable'], 404);
            }

            return response()->json($this->pagePayload($page));
        } catch (\Exception $e) {
            return response()->json(['error' => 'Page introuvable'], 404);
        }
    }

    public function navigationItems(): JsonResponse
    {
        $items = SiteNavigationItem::query()
            ->visible()
            ->select('id', 'location', 'label', 'url', 'icon', 'is_visible', 'sort_order', 'opens_new_tab')
            ->orderBy('location')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (SiteNavigationItem $item): array => [
                'id' => $item->id,
                'location' => $item->location,
                'label' => $item->label,
                'url' => $item->url,
                'icon' => $item->icon,
                'is_visible' => $item->is_visible,
                'sort_order' => $item->sort_order,
                'opens_new_tab' => $item->opens_new_tab,
            ]);

        return response()->json([
            'navbar' => $items->where('location', SiteNavigationItem::LOCATION_NAVBAR)->values(),
            'sidebar' => $items->where('location', SiteNavigationItem::LOCATION_SIDEBAR)->values(),
        ]);
    }

    public function send_email(Request $request): JsonResponse
    {
        $request->validate([
            'commande_id' => ['required', 'integer', 'exists:commandes,id'],
        ]);

        $commande = Commande::findOrFail($request->commande_id);
        $details = CommandeDetail::where('commande_id', $commande->id)
            ->select('id', 'commande_id', 'produit_id', 'qte', 'prix_unitaire', 'prix_ht', 'prix_ttc')
            ->get();

        $adminEmail = config('mail.admin_email', 'bitoutawalid@gmail.com');

        $data = [
            'titre'    => 'Nouvelle commande',
            'commande' => $commande->toArray(),
            'details'  => $details->toArray(),
        ];

        SendOrderEmailJob::dispatch($data, $adminEmail, $adminEmail);

        return response()->json(['success' => 'Email en cours d\'envoi']);
    }

    public function similar_products(int $sous_categorie_id): array
    {
        $sous_category = SousCategory::select('id', 'categorie_id')->find($sous_categorie_id);

        if (! $sous_category) {
            return ['products' => []];
        }

        $products = Product::where('sous_categorie_id', $sous_category->id)
            ->where('publier', 1)
            ->where('qte', '>', 0)
            ->select(self::PRODUCT_LIST_COLUMNS)
            ->with('sousCategorie:id,slug,designation_fr,categorie_id', 'externalCatalogSource:id,product_id,source_gallery_images')
            ->withCount(['reviews' => fn ($q) => $q->where('publier', 1)])
            ->limit(4)
            ->get();

        if ($products->count() < 4) {
            $existingIds = $products->pluck('id');

            $extra = Product::where('publier', 1)
                ->where('qte', '>', 0)
                ->whereNotIn('id', $existingIds)
                ->whereHas('sousCategorie', fn ($q) => $q->where('categorie_id', $sous_category->categorie_id))
                ->select(self::PRODUCT_LIST_COLUMNS)
                ->with('sousCategorie:id,slug,designation_fr,categorie_id', 'externalCatalogSource:id,product_id,source_gallery_images')
            ->withCount(['reviews' => fn ($q) => $q->where('publier', 1)])
                ->limit(4 - $products->count())
                ->get();

            $products = $products->merge($extra);
        }

        // The PDP's "Produits similaires" rail renders the same ProductCard as every other grid, so
        // it gets the same hover. Called after the merge so the topped-up rows are covered too.
        $this->attachHoverImages($products);

        return ['products' => $products];
    }

    /**
     * Redirections — admin-defined 301/302/410 rules consumed by the frontend middleware.
     * Fails open (returns []) instead of 500 if the table/columns aren't present yet, so a
     * pre-migration deploy or schema drift can never take the storefront's middleware down.
     * Column is `code` (what RedirectionResource writes) — the old select used `status_code`,
     * which never existed, and was the actual cause of the 500.
     */
    public function redirections()
    {
        try {
            return Redirection::query()
                ->where('is_active', 1)
                ->select('id', 'old_url', 'new_url', 'code')
                ->limit(500)
                ->get();
        } catch (\Throwable $e) {
            Log::warning('redirections endpoint failed: '.$e->getMessage());

            return response()->json([]);
        }
    }

    public function newProduct()
    {
        return $this->productListQuery()
            ->where('new_product', 1)
            ->latest('created_at')
            ->limit(8)
            ->get();
    }

    public function bestSellers()
    {
        return $this->productListQuery()
            ->where('best_seller', 1)
            ->latest('created_at')
            ->limit(4)
            ->get();
    }

    public function add_review(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'stars'      => ['nullable', 'integer', 'min:1', 'max:5'],
            'comment'    => ['required', 'string', 'max:1000'],
        ]);

        // Attach the order this review is about, when there is one.
        //
        // Without this, a review left on the product page is unattested BY CONSTRUCTION: it never
        // gets a commande_id, never gets verified, and so can never satisfy Review::scopeAttested.
        // The stars would have stayed empty no matter how many customers wrote one — only reviews
        // arriving through the tokenised email link could ever count. That is a silent dead end,
        // and it is the whole reason on-site reviews were worthless to the rating.
        //
        // Matched on EMAIL, not user id, deliberately. `auth:sanctum` authenticates User (the
        // `users` table) while `commandes.user_id` is a FK to `clients` — different tables, so
        // comparing the two ids would quietly match the wrong person or nobody at all.
        $commandeId = $this->deliveredOrderIdForProduct(
            Auth::user()?->email,
            (int) $validated['product_id']
        );

        $review = Review::create([
            'user_id'     => Auth::id(),
            'product_id'  => $validated['product_id'],
            'stars'       => $validated['stars'] ?? 5,
            'comment'     => $validated['comment'],
            'publier'     => ($validated['stars'] ?? 5) >= 4 ? 1 : 0,
            // `verified` is left alone on purpose — it means "an admin confirmed this", and an
            // automatic order match is not that. scopeAttested accepts either signal, so a
            // commande_id is enough to make the review count toward the rating.
            'commande_id' => $commandeId,
        ]);

        return response()->json($review, 201);
    }

    /**
     * Id of a DELIVERED order placed by this email that actually contained this product, or null.
     * Newest first, so a repeat buyer's review attaches to their most recent purchase.
     */
    private function deliveredOrderIdForProduct(?string $email, int $productId): ?int
    {
        $email = is_string($email) ? trim($email) : '';
        if ($email === '') {
            return null;
        }

        try {
            return Commande::query()
                ->whereIn('etat', \App\Services\PointsService::DELIVERED_STATUSES)
                ->where(fn ($q) => $q->where('email', $email)->orWhere('livraison_email', $email))
                ->whereHas('details', fn ($d) => $d->where('produit_id', $productId))
                ->orderByDesc('id')
                ->value('id');
        } catch (\Throwable $e) {
            // Never let attestation lookup break a customer's submission — an unattested review
            // is still a review worth keeping.
            Log::warning('Review attestation lookup failed', [
                'product_id' => $productId,
                'error'      => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function seoPage(string $name)
    {
        $page = SeoPage::where('page', $name)->first();

        if (! $page) {
            return response()->json(['error' => 'Page SEO introuvable'], 404);
        }

        return $page;
    }
}
