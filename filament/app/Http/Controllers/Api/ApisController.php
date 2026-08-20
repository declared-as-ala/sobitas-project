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
use App\Mail\ContactAcknowledgementMail;
use App\Mail\ContactMessageMail;
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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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
    /*
     * Exactly what the sitemap reads, and nothing else. Requested with ?fields=index.
     *
     * Derived by reading util/sitemapSources.ts rather than guessed: it uses `slug` and
     * `sousCategorie` to build the canonical URL, `publier` and `seo_robots_index` to decide whether
     * to emit it at all, `brand_id` and the subcategory to record which listing pages are non-empty,
     * `id` for the sitemap's stable id-band chunking, `cover` for the image entry, and
     * updated_at/created_at for lastModified. That is the whole list.
     *
     * `designation_fr` is present only because normalizeCollectionImages and the shared response
     * shape expect a titled row; dropping it saves little and risks an empty <title> if this
     * projection is ever reused for a listing.
     */
    private const PRODUCT_INDEX = [
        'id', 'slug', 'designation_fr', 'cover', 'brand_id', 'sous_categorie_id',
        'publier', 'seo_robots_index', 'updated_at', 'created_at',
    ];

    private const PRODUCT_LISTING = [
        'id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller', 'note',
        'alt_cover', 'description_cover', 'prix', 'pack', 'promo', 'promo_expiration_date',
        'qte', 'rupture', 'force_out_of_stock', 'low_stock_threshold',
        'brand_id', 'sous_categorie_id',
        /*
         * meta_title, meta_description, seo_title and seo_description ARE DELIBERATELY ABSENT.
         *
         * They were 407 of the 920 bytes each product costs — 44% of the payload — and NOTHING
         * reads them from this endpoint. Verified by grep across the whole frontend: the shop grid
         * and ProductCard never touch them, and the only documented consumer of this projection,
         * the sitemap builder, reads exactly three fields (seo_robots_index, updated_at,
         * created_at). Product pages get their own meta from /product_details, a different
         * projection entirely.
         *
         * The cost was not theoretical. /shop embeds the WHOLE catalogue in its RSC payload because
         * ShopPageClient filters client-side, so at 3,087 products the page transferred 4.87 MB of
         * HTML — ten times the homepage. On the mobile connections that are most of this site's
         * traffic that is a page which appears to hang, which is what the owner reported as the
         * site being down. These four columns alone were ~1.26 MB of it.
         *
         * This does not fix the architecture — the whole-catalogue walk is still the real problem
         * and still needs server-side pagination — but it removes a quarter of the weight for the
         * cost of four strings nobody was reading.
         */
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

    /**
     * Put products a customer can actually buy at the top of every listing.
     *
     * ── WHY THIS IS A PRIMARY SORT AND NOT A FILTER ──────────────────────────────────────────
     * 170+ of the catalogue is out of stock at any time, and until now nothing separated those
     * rows from the rest — so `latest('created_at')` on a freshly imported catalogue could fill an
     * entire first page with items that cannot be sold. That is the worst possible use of the only
     * screen most visitors ever see.
     *
     * They are ORDERED DOWN, never removed. An out-of-stock product page still ranks, still earns
     * links, and still converts later; hiding it from the grid would orphan URLs Google has already
     * indexed and lose the "Rupture" signal the card is designed to show. Sorting keeps everything
     * reachable and simply stops the dead stock from taking the fold.
     *
     * ── WHY BOTH COLUMNS ─────────────────────────────────────────────────────────────────────
     * `rupture` is the derived flag and Product::saving() keeps it true whenever force_out_of_stock
     * is set or qte hits zero — so on paper it is sufficient. In practice the model's own docblock
     * warns that admin document pages mutate `qte` through raw query-builder decrement()/increment()
     * calls that BYPASS that hook and leave `rupture` stale, which is why recalculateRupture()
     * exists at all. Testing force_out_of_stock as well costs nothing and means a hard override is
     * honoured even against a stale flag. It is also exactly what the frontend's cartStock.ts does,
     * so the grid order and the card's own badge can never disagree.
     *
     * Applied BEFORE the caller's own orderBy, so availability is the primary key and price/recency
     * order within each group rather than across them.
     */
    private function orderAvailableFirst($query)
    {
        return $query->orderByRaw('(COALESCE(force_out_of_stock, 0) = 1 OR COALESCE(rupture, 0) = 1) ASC');
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
        /*
         * ── ?fields=index — THE SITEMAP'S PROJECTION, AND WHY IT IS WORTH A BRANCH ───────────
         *
         * util/sitemapSources.ts walks this endpoint across the whole catalogue and reads exactly
         * NINE fields per row: id, slug, publier, brand_id, cover, updated_at, created_at,
         * seo_robots_index and the sousCategorie relation. It reads no price, no stock, no rating
         * and no hover image.
         *
         * The default projection below gives it all of those anyway, and two of them are not columns
         * at all — withCount and withAvg are correlated subqueries against `reviews`, evaluated per
         * row. Over 10,669 products that is ~21,000 subqueries per full walk, plus an eager load of
         * externalCatalogSource and a PHP pass over every row in attachHoverImages(), to produce
         * fields the sitemap discards.
         *
         * That walk is not hypothetical load. The php-fpm log during today's outage showed this
         * endpoint being hit with per_page=100&page=N from page 2 to page 56 inside three seconds,
         * ~40 workers deep, with customer requests queued behind them until the proxy gave up at 60s.
         *
         * per_page rises to 500 for this projection only: 22 requests instead of 107, each one a
         * plain indexed scan. crawlPaginated reads the HONOURED per_page back off page 1, so if this
         * ever gets clamped the crawl adjusts rather than silently truncating.
         *
         * Implies light: brands and categories are not sent either.
         */
        $indexOnly = $request->get('fields') === 'index';

        $query = Product::where('publier', 1)
            ->with('sousCategorie:id,slug,designation_fr,categorie_id')
            ->select($indexOnly ? self::PRODUCT_INDEX : self::PRODUCT_LISTING);

        if (! $indexOnly) {
            $query->with('externalCatalogSource:id,product_id,source_gallery_images')
                ->withCount(['reviews as review_count' => fn ($q) => $q->attested()])
                ->withAvg(['reviews as rating_value' => fn ($q) => $q->attested()], 'stars');
        }

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

        /*
         * ── THE FILTERS SERVER-SIDE PAGINATION NEEDS ─────────────────────────────────────────
         * /shop currently loads the WHOLE catalogue and filters in the browser, which is why the
         * page shipped 4.87 MB. It cannot paginate on the server until the server can express every
         * filter the UI offers — otherwise picking a second brand would silently return the wrong
         * page rather than a wider one.
         *
         * Auditing ShopPageClient, the gap is four, not the eight it first appears:
         *   brands[]        multi-select; `brand_id` above only ever matched one
         *   subcategories[] multi-select over rayon SLUGS, which is what the UI actually holds
         *   flavors[]       matched against the `aromes` relation the card already eager-loads
         *   in_stock        the "disponible uniquement" toggle
         * `types` and `goals` are deliberately NOT here: ShopPageClient gates both behind
         * `isCreatineCategory`, so they are a creatine-only refinement rather than a shop filter,
         * and adding a general API surface for them would invent a contract the UI never had.
         *
         * Every one is comma-separated and ADDITIVE-OR within itself, AND across the group — the
         * same semantics the client-side code has today, so switching over cannot change results.
         * Each is skipped entirely when absent, so existing callers are untouched.
         */
        $csv = static fn (string $key): array => array_values(array_filter(
            array_map('trim', explode(',', (string) $request->get($key, ''))),
            static fn ($v) => $v !== ''
        ));

        if ($brands = $csv('brands')) {
            // Cast: ids arrive as strings from the query string and a loose whereIn against an
            // integer column makes MySQL fall back to a full scan on some collations.
            $query->whereIn('brand_id', array_map('intval', $brands));
        }

        if ($subcategories = $csv('subcategories')) {
            // Slugs, not ids. The UI's filter state holds slugs (they are what appears in the URL),
            // so resolving here keeps the shareable link readable instead of a list of numbers.
            $query->whereIn(
                'sous_categorie_id',
                SousCategory::whereIn('slug', $subcategories)->select('id')
            );
        }

        /*
         * TOP-LEVEL categories, by slug. `subcategories` above is the rayon; this is the aisle.
         *
         * This is the filter that was missing when the four above shipped, and its absence is why
         * /shop could not go server-side: ShopPageClient's `selectedCategories` holds TOP category
         * slugs ('proteines', 'creatine'), never subcategory slugs, so a server-side shop had no way
         * to express the one filter the sidebar uses most. Products hang off sous_categorie_id only,
         * so the aisle has to be resolved down through its rayons — two nested subqueries rather
         * than joins, for the same reason as above: a join would multiply rows and inflate the
         * paginator's total().
         */
        if ($categorySlugs = $csv('categories')) {
            $query->whereIn(
                'sous_categorie_id',
                SousCategory::whereIn(
                    'categorie_id',
                    Categ::whereIn('slug', $categorySlugs)->select('id')
                )->select('id')
            );
        }

        if ($flavors = $csv('flavors')) {
            // whereHas, not a join: a product with three matching aromas must appear ONCE. A join
            // would return it three times and quietly inflate both the page and the total count.
            $query->whereHas('aromes', fn ($q) => $q->whereIn('designation_fr', $flavors));
        }

        if ($request->boolean('in_stock')) {
            // Same expression as orderAvailableFirst() and the frontend's cartStock.ts, so the
            // filter and the badge can never disagree about what "available" means.
            $query->whereRaw('(COALESCE(force_out_of_stock, 0) = 0 AND COALESCE(rupture, 0) = 0)');
        }
        if ($request->filled('min_price')) {
            $query->where('prix', '>=', (float) $request->get('min_price'));
        }
        if ($request->filled('max_price')) {
            $query->where('prix', '<=', (float) $request->get('max_price'));
        }

        $this->orderAvailableFirst($query);

        /*
         * ── THE SORT VOCABULARY IS THE UI'S, NOT A SECOND ONE ────────────────────────────────
         * The dropdown in ShopPageClient offers five orders: popularity, price-asc, price-desc,
         * newest, best-sellers. This branch understood two of them, and it spelt those two with an
         * underscore while the UI writes a hyphen — so once /shop sends its own sort value, four of
         * the five would silently fall through to "newest" and the shopper would pick "Prix :
         * croissant" and get the newest products. A sort that quietly does something else is worse
         * than one that errors, because the page still looks right.
         *
         * Normalising the separator means both spellings work and no existing caller breaks.
         * `popularity` and `best-sellers` reproduce the exact expressions the client-side engine
         * used (best_seller * 2 + new_product, and best_seller desc), so switching /shop over cannot
         * reorder a grid a shopper has already learned.
         */
        $sort = str_replace('-', '_', strtolower(trim((string) $request->get('sort', ''))));
        if ($sort === 'price_asc') {
            $query->orderBy('prix');
        } elseif ($sort === 'price_desc') {
            $query->orderByDesc('prix');
        } elseif ($sort === 'best_sellers') {
            $query->orderByRaw('COALESCE(best_seller, 0) DESC')->latest('created_at');
        } elseif ($sort === 'popularity') {
            $query->orderByRaw('(COALESCE(best_seller, 0) * 2 + COALESCE(new_product, 0)) DESC')
                ->latest('created_at');
        } else {
            // 'newest' and anything unrecognised.
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
        // 500 for the index projection (22 requests instead of 107 over 10,669 products), the
        // usual 100 ceiling otherwise. crawlPaginated reads the honoured per_page back off
        // page 1, so a future clamp adjusts the crawl rather than truncating it silently.
        $perPage = $indexOnly
            ? min(max(1, (int) $request->query('per_page', 500)), 500)
            : $this->resolvePerPage($request, 24);
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
        /*
         * ── ?light=1 DROPS THE TWO SETS THAT DOMINATE THIS RESPONSE ──────────────────────────
         *
         * Measured against production on 13/08/2026, at per_page=12:
         *
         *     products     12,011 bytes   (12 rows — what the caller asked for)
         *     brands       56,111 bytes   (566 rows — 4.7x the products)
         *     categories      761 bytes
         *
         * The brand list is a FIXED cost paid on every single request, and the iHerb import took it
         * from 84 brands to 566. Two callers pay it for nothing:
         *
         *   • The sitemap crawler walks ~107 pages of this endpoint and reads only `products`. That
         *     is roughly 6 MB of brand JSON built, encoded and transferred per sitemap rebuild —
         *     on the endpoint whose worker-pool saturation took admin.protein.tn down with 504s.
         *   • /shop already receives the full brand list from getAllBrands(), and its facet counts
         *     from /api/shop_facets. `productsData.brands` is used only as a fallback lookup behind
         *     that same list, so it is pure duplication.
         *
         * Opt-in rather than a changed default: /offres and the category fallback clients still read
         * `brands` off this response, and silently emptying it for them would blank their filter
         * rails with a 200 on every request — the exact class of invisible failure this endpoint has
         * already produced twice.
         */
        // fields=index implies light — the sitemap reads neither set.
        $light = $indexOnly || $request->boolean('light');

        $brands = $light
            ? collect()
            : Brand::whereIn(
                'id',
                Product::where('publier', 1)->whereNotNull('brand_id')->select('brand_id')
            )->select('id', 'designation_fr', 'slug', 'logo', 'alt_cover')->get();

        $categories = $light ? collect() : Categ::select('id', 'slug', 'designation_fr', 'cover')->get();

        $this->normalizeCollectionImages($products, 'cover');
        $this->normalizeCollectionImages($brands, 'logo');
        $this->normalizeCollectionImages($categories, 'cover');

        // No hover image on the index projection: externalCatalogSource was never eager-loaded
        // for it, so this would run its normalise loop over every row to attach null.
        if (! $indexOnly) {
            $this->attachHoverImages($products);
        }

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
     * Everything the shop's filter sidebar needs to describe the WHOLE catalogue in one small call.
     *
     * ── WHY THIS HAS TO EXIST BEFORE /shop CAN PAGINATE ON THE SERVER ────────────────────────
     * The sidebar is not a view of the current page — it is a view of the catalogue. Price slider
     * bounds, the flavour list, and the counts beside each checkbox all answered "across everything
     * published" because ShopPageClient was handed everything published. The moment the server
     * sends 24 products instead, every one of those becomes a description of those 24: the price
     * slider would collapse to the range of one page and then filter the page by its own bounds, the
     * flavour list would show whichever three aromas happened to land, and the counts would read 24.
     *
     * That is the failure mode that makes a half-finished server-side migration worse than no
     * migration: the grid is correct and the sidebar lies about it, with a 200 on both.
     *
     * So the facets are computed separately, over the full published set, and cached. Four aggregate
     * queries — no product rows cross the wire, which is the whole point: the payload is a couple of
     * KB against the 3.35 MB the shop used to ship to derive the same numbers in the browser.
     *
     * Cached for 10 minutes. Facets move when the catalogue does (an import, a price edit), never
     * per request, and a slightly stale count beside a checkbox costs nothing while recomputing
     * four GROUP BYs over ~10,700 rows on every shop render costs a great deal.
     */
    public function shopFacets(Request $request): JsonResponse
    {
        $payload = Cache::remember('shop:facets:v1', 600, static function (): array {
            // Price bounds. `prix` is the list price; promo prices are lower but the slider is a
            // coarse instrument and the client already filters on the effective price within the
            // range, so widening the bounds here would only ever show an empty band at the bottom.
            $bounds = Product::where('publier', 1)
                ->whereNotNull('prix')
                ->where('prix', '>', 0)
                ->selectRaw('MIN(prix) as min_price, MAX(prix) as max_price')
                ->first();

            /*
             * ── THE SLIDER NEEDS THE 99th PERCENTILE, NOT THE MAXIMUM ────────────────────────
             *
             * Measured: min 11 DT, max 40 000 DT. A slider spanning that is unusable — a shopper
             * looking in the 50-150 DT band, which is most of them, is aiming at the first 0.4% of
             * the track, and one outlier item is what put it there.
             *
             * p99 is the reported ceiling instead. Nothing becomes unreachable, because the
             * frontend treats "handle at maximum" as NO upper bound rather than as `max_price=p99`
             * — so an untouched slider still shows the 40 000 DT item, and dragging down filters as
             * expected. The only thing lost is the ability to set a ceiling BETWEEN p99 and the
             * true max, which is a range nobody shops in.
             *
             * OFFSET rather than a window function: it is one indexed scan on `prix`, and it does
             * not depend on the MySQL version the VPS happens to be running.
             */
            $priced = Product::where('publier', 1)->whereNotNull('prix')->where('prix', '>', 0)->count();
            $p99 = null;
            if ($priced > 0) {
                $offset = max(0, (int) floor($priced * 0.99) - 1);
                $p99 = Product::where('publier', 1)
                    ->whereNotNull('prix')
                    ->where('prix', '>', 0)
                    ->orderBy('prix')
                    ->offset($offset)
                    ->limit(1)
                    ->value('prix');
            }

            // Counts per TOP category. Joined rather than eager-loaded because the answer is one
            // integer per aisle — pulling 10,700 rows into PHP to count them is what the frontend
            // was doing and what this endpoint exists to stop.
            $categoryCounts = Product::query()
                ->join('sous_categories', 'products.sous_categorie_id', '=', 'sous_categories.id')
                ->join('categs', 'sous_categories.categorie_id', '=', 'categs.id')
                ->where('products.publier', 1)
                ->groupBy('categs.slug')
                ->selectRaw('categs.slug as slug, COUNT(*) as total')
                ->pluck('total', 'slug');

            $brandCounts = Product::where('publier', 1)
                ->whereNotNull('brand_id')
                ->groupBy('brand_id')
                ->selectRaw('brand_id, COUNT(*) as total')
                ->pluck('total', 'brand_id');

            /*
             * ── THE SIDEBAR'S BRAND LIST, THREE COLUMNS WIDE ─────────────────────────────────
             *
             * /shop used to build this from getAllBrands(), and that cost far more than it looked:
             *
             *   • ~100 KB in the page, because /api/all_brands returns id, logo, designation_fr,
             *     alt_cover, updated_at AND created_at for 589 brands. Two of those are timestamps
             *     that nothing on a filter checkbox has ever rendered.
             *   • SIX sequential API calls per render, because getAllBrands() walks the paginated
             *     endpoint 100 rows at a time. On the busiest page on the site, against the origin
             *     whose worker pool ran out earlier today.
             *
             * A checkbox needs an id and a name. It is already getting its count from `brand_counts`
             * beside this, so shipping it from here costs one query and no extra round trip.
             *
             * whereIn on the published set, not every row in `brands`: 23 of the 589 have no
             * published product, and a filter offering a value that can only ever return zero
             * results is a dead end the shopper has to discover by clicking it.
             */
            $brands = Brand::whereIn(
                'id',
                Product::where('publier', 1)->whereNotNull('brand_id')->select('brand_id')
            )
                ->orderBy('designation_fr')
                ->get(['id', 'designation_fr', 'slug'])
                ->map(static fn ($b) => [
                    'id' => (int) $b->id,
                    'designation_fr' => (string) $b->designation_fr,
                    'slug' => (string) $b->slug,
                ])
                ->values();

            // Only aromas that are actually ON a published product. The `aromas` table carries
            // historical entries no current product uses, and a filter offering a value that can
            // only ever return zero results is a bug the shopper has to discover by clicking it.
            $flavors = Aroma::whereIn(
                'id',
                DB::table('product_aromas')
                    ->join('products', 'product_aromas.product_id', '=', 'products.id')
                    ->where('products.publier', 1)
                    ->select('product_aromas.aroma_id')
            )
                ->whereNotNull('designation_fr')
                ->orderBy('designation_fr')
                ->pluck('designation_fr')
                ->unique()
                ->values();

            // Rayons, with their aisle, so the sidebar can group them without a second call.
            $subcategories = SousCategory::query()
                ->select('id', 'designation_fr', 'slug', 'categorie_id')
                ->orderBy('designation_fr')
                ->get()
                ->map(static fn ($s) => [
                    'id' => (int) $s->id,
                    'name' => (string) $s->designation_fr,
                    'slug' => (string) $s->slug,
                    'categoryId' => $s->categorie_id === null ? null : (int) $s->categorie_id,
                ])
                ->values();

            return [
                'price' => [
                    'min' => (int) floor((float) ($bounds->min_price ?? 0)),
                    // The TRUE maximum, kept for reference and for anything that needs the real
                    // ceiling. It is deliberately NOT what the slider spans — see p99 below.
                    'max' => (int) ceil((float) ($bounds->max_price ?? 1000)),
                    // What the slider should span. Falls back to the true max when the catalogue is
                    // too small for a percentile to mean anything.
                    'p99' => (int) ceil((float) ($p99 ?? $bounds->max_price ?? 1000)),
                ],
                'flavors' => $flavors,
                'brands' => $brands,
                'category_counts' => $categoryCounts,
                'brand_counts' => $brandCounts,
                'subcategories' => $subcategories,
                'total_published' => Product::where('publier', 1)->count(),
            ];
        });

        return response()->json($payload);
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
            ->orderByRaw('(COALESCE(force_out_of_stock, 0) = 1 OR COALESCE(rupture, 0) = 1) ASC')
            ->latest('created_at')
            ->paginate($perPage);

        $products = $productsPaginator->getCollection();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())
            ->select('id', 'designation_fr', 'logo')
            ->orderBy('designation_fr')
            ->get();

        $this->normalizePaginatorImages($productsPaginator, 'cover');
        $this->attachHoverImages($productsPaginator);
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
            ->orderByRaw('(COALESCE(force_out_of_stock, 0) = 1 OR COALESCE(rupture, 0) = 1) ASC')
            ->latest('created_at')
            ->paginate($perPage);

        $brandsPaginator = Brand::select('id', 'designation_fr', 'logo')
            ->orderBy('designation_fr')
            ->paginate($perPage);

        $this->normalizePaginatorImages($productsPaginator, 'cover');
        $this->attachHoverImages($productsPaginator);
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

        /*
         * ── THE TWENTY-SECOND QUERY ──────────────────────────────────────────────────────────
         *
         * This used to read:
         *
         *     ->where(function ($query) use ($sous_category) {
         *         $query->where('sous_categorie_id', $sous_category->id)
         *             ->orWhereHas('sousCategories', fn ($q) => $q->where('sous_categories.id', ...));
         *     })
         *
         * `orWhereHas` compiles to `... OR EXISTS (SELECT * FROM sous_categories INNER JOIN
         * product_sous_category ON ... WHERE products.id = product_sous_category.product_id AND
         * sous_categories.id = ?)`. The OR makes the index on `products.sous_categorie_id`
         * unusable, so MySQL scans `products` and evaluates that correlated subquery ONCE PER ROW.
         *
         * The cost is therefore a function of the TABLE, not of the answer. Measured against the
         * live API on 15/08/2026, which is what makes that not a theory:
         *
         *     productsBySubCategoryId/zma            (≈5 products)    20.8 s
         *     productsBySubCategoryId/whey-isolate                    23.1 s
         *     productsBySubCategoryId/vitamines                       33.9 s
         *     productsByCategoryId/proteines  (paginated, 100 rows)    3.9 s
         *     all_products?per_page=24                                 3.6 s
         *     searchProduct/BCAA   (three LIKE '%x%' + limit 50)        2.5 s
         *
         * A subcategory with five products cost twenty seconds while an unindexed triple-wildcard
         * LIKE over the same table cost two and a half. The table is fine; the shape was not.
         *
         * ── WHY THIS IS THE MOST EXPENSIVE BUG ON THE PROPERTY ───────────────────────────────
         * EVERY category and subcategory page calls this, through
         * `fetchCategoryOrSubCategory` in the storefront, and those pages currently answer
         * `Cache-Control: private, no-cache, no-store` with `cf-cache-status: DYNAMIC` — so the
         * call is not absorbed by a CDN. A cold /vitamines did not respond inside 120 seconds.
         *
         * Googlebot does not wait, and it does not punish only the URL that timed out: repeated
         * timeouts make it crawl the whole HOST less. "Crawled – currently not indexed" is 867
         * pages on this property, and a listing that cannot be fetched cannot be indexed no matter
         * how good its content is.
         *
         * ── THE REPLACEMENT ─────────────────────────────────────────────────────────────────
         * Read the pivot directly — one indexed lookup on `product_sous_category.sous_category_id`,
         * which the create migration indexes both on its own and as half of the composite unique —
         * and hand the ids to `whereIn`, which lands on the PRIMARY KEY. Two indexed reads instead
         * of one scan. Identical rows in identical order: the OR is preserved exactly, the legacy
         * column is still honoured, and nothing about the response shape changes.
         */
        $pivotProductIds = DB::table('product_sous_category')
            ->where('sous_category_id', $sous_category->id)
            ->pluck('product_id')
            ->all();

        $products = Product::where('publier', 1)
            ->where(function ($query) use ($sous_category, $pivotProductIds) {
                // Legacy single subcategory — still authoritative for rows never back-filled.
                $query->where('sous_categorie_id', $sous_category->id);

                // Guarded: `whereIn` with an empty list compiles to `0 = 1`, which is harmless
                // beside an OR but pointless, and it reads as though it could exclude something.
                if ($pivotProductIds !== []) {
                    $query->orWhereIn('id', $pivotProductIds);
                }
            })
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
            ->with(['aromes:id,designation_fr', 'tags:id,designation_fr', 'sousCategories:id,slug,designation_fr,categorie_id', 'sousCategorie:id,slug,designation_fr,categorie_id', 'externalCatalogSource:id,product_id,source_gallery_images'])
            ->orderByRaw('(COALESCE(force_out_of_stock, 0) = 1 OR COALESCE(rupture, 0) = 1) ASC')
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
            // Search results are capped at 50, so ordering is not cosmetic here: without this an
            // out-of-stock match can occupy a slot that an available product never gets.
            ->orderByRaw('(COALESCE(force_out_of_stock, 0) = 1 OR COALESCE(rupture, 0) = 1) ASC')
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
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr', 'sousCategorie:id,slug,designation_fr,categorie_id', 'externalCatalogSource:id,product_id,source_gallery_images');

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

    /**
     * ── AN ARTICLE IS NOT A PRODUCT, AND THIS ENDPOINT SPENT A DAY RETURNING 500 BECAUSE OF IT ──
     *
     * f0d7da4e added `externalCatalogSource:id,product_id,source_gallery_images` to every endpoint
     * that renders a product card, so the hover image would stop being null. The edit was applied by
     * matching on the eager-load string rather than on the model, and Article has no such relation —
     * it is defined on Product alone. Eloquent answers an unknown relation with
     * RelationNotFoundException, which is a 500, which is what every one of the 224 article URLs
     * served from that deploy until it was measured here.
     *
     * It went unnoticed for a day because nothing looked. `/blog` and `/blog/category/{slug}` both
     * return 200 — they use allArticles(), which was untouched — so the blog looked alive from the
     * outside while every article inside it was down. And check-hover-endpoints.mjs, added in the
     * same commit precisely so this class of bug would stop recurring, walks the PRODUCT card
     * endpoints; it had no reason to fetch an article and so it passed.
     *
     * The cost is the reason this note is long. The blog is 43,400 impressions a month, 38% of
     * everything Google shows for this site, and `/blog/whey-protein-en-tunisie` at position 11.2 is
     * the best-placed URL the site owns. Serving Google a 500 on those is worse than serving a thin
     * page: repeated 5xx is how a URL leaves the index.
     *
     * The guard that would actually have caught it is not another product check — it is asserting
     * 200 on ONE LIVE URL OF EVERY ROUTE TYPE after each deploy. That is scripts/check-routes.mjs,
     * and it now runs on every frontend and backend deploy.
     */
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

    /**
     * /contact — persist the enquiry AND actually deliver it.
     *
     * ── WHAT THIS USED TO DO ────────────────────────────────────────────────────────────────
     * Validate three fields, Contact::create(), and return "Votre message envoyé avec succès".
     * No mail. Every message the form has ever taken has been sitting in the `contacts` table
     * waiting for somebody to open Filament and look — while the visitor was told, in those
     * words, that it had been sent. Owner, 20/08/2026: *"make it fully functional, it really
     * works and sends emails."*
     *
     * The infrastructure was already here and already proven: mail.default is 'smtp', seven
     * Mailables exist, and CommandeController sends an admin copy and a customer copy of every
     * order this exact way. This endpoint was simply never wired to it.
     *
     * ── ORDER OF OPERATIONS, AND WHY IT IS THIS ORDER ───────────────────────────────────────
     * PERSIST FIRST, then mail, with mail wrapped so it can never fail the request. A customer
     * enquiry that was typed once and lost because an SMTP handshake timed out is the worst
     * outcome available here; a stored row with no notification is recoverable, and the Filament
     * ContactResource is where it is recovered from. Same shape as the order flow, same reason.
     *
     * ── SPAM ────────────────────────────────────────────────────────────────────────────────
     * This is a public, unauthenticated endpoint that now sends two emails per call, so it is
     * exactly the shape a spammer looks for. Two cheap defences, neither of which a real visitor
     * ever meets:
     *
     *   HONEYPOT   `company` is rendered hidden and off-screen by the form and left empty by a
     *              human. Anything that fills it gets 200 and success — a bot told it failed
     *              retries with the field blank, and a bot told it succeeded goes away. Nothing
     *              is stored and nothing is sent.
     *   THROTTLE   6 per minute per IP, applied in routes/api.php. Enough for a person who mis-taps
     *              submit, far below what makes this useful as a relay.
     *
     * `phone` and `subject` are accepted and stored ONLY when the columns exist. The `contacts`
     * table currently has name/email/message and nothing else, and this endpoint has to keep
     * working on a server where the migration that adds them has not run yet — the alternative is
     * a mass-assignment error on a form that is the site's only contact channel.
     */
    public function sendContact(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'    => ['required', 'string', 'max:255'],
            'email'   => ['required', 'email', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
            'phone'   => ['nullable', 'string', 'max:40'],
            'subject' => ['nullable', 'string', 'max:150'],
            'company' => ['nullable', 'string', 'max:255'],
        ]);

        // Honeypot. Answer exactly as if it worked — see the docblock.
        if (filled($request->input('company'))) {
            return response()->json(['success' => 'Votre message a bien été envoyé']);
        }

        $attributes = [
            'name'    => $validated['name'],
            'email'   => $validated['email'],
            'message' => $validated['message'],
        ];

        foreach (['phone', 'subject'] as $optional) {
            if (filled($validated[$optional] ?? null) && Schema::hasColumn('contacts', $optional)) {
                $attributes[$optional] = $validated[$optional];
            }
        }

        $contact = Contact::create($attributes);

        // The Mailable reads these whether or not they were persisted, so the admin copy carries
        // the phone number even on a server that has not run the migration yet.
        $contact->setAttribute('phone', $validated['phone'] ?? null);
        $contact->setAttribute('subject', $validated['subject'] ?? null);

        try {
            $adminEmailsRaw = config('mail.admin_emails', config('mail.username', 'contact@protein.tn'));
            $adminEmails = is_array($adminEmailsRaw)
                ? array_filter(array_map('trim', $adminEmailsRaw))
                : array_filter(array_map('trim', explode(',', (string) $adminEmailsRaw)));

            foreach ($adminEmails as $adminEmail) {
                Mail::to($adminEmail)->send(new ContactMessageMail($contact));
            }
        } catch (\Exception $e) {
            Log::error('Failed to send contact notification', [
                'contact_id' => $contact->id,
                'error'      => $e->getMessage(),
            ]);
        }

        // Separate try/catch on purpose: the visitor's receipt failing must not suppress the
        // admin copy, and vice versa. One shared block would let the first throw skip the second.
        try {
            Mail::to($contact->email)->send(new ContactAcknowledgementMail($contact));
        } catch (\Exception $e) {
            Log::error('Failed to send contact acknowledgement', [
                'contact_id' => $contact->id,
                'error'      => $e->getMessage(),
            ]);
        }

        return response()->json(['success' => 'Votre message a bien été envoyé']);
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
            ->with('sousCategorie:id,slug,designation_fr,categorie_id', 'brand:id,designation_fr,logo', 'externalCatalogSource:id,product_id,source_gallery_images')
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
                ->with('sousCategorie:id,slug,designation_fr,categorie_id', 'brand:id,designation_fr,logo', 'externalCatalogSource:id,product_id,source_gallery_images')
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
