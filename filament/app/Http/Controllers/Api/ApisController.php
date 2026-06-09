<?php

namespace App\Http\Controllers\Api;

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

class ApisController extends Controller
{
    private const DEFAULT_PER_PAGE = 20;
    private const MAX_PER_PAGE = 100;

    // ── Product select columns (DRY — never SELECT *) ──
    private const PRODUCT_LIST_COLUMNS = [
        'id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller',
        'note', 'alt_cover', 'description_cover', 'prix', 'pack', 'promo',
        'promo_expiration_date', 'sous_categorie_id', 'brand_id',
    ];

    // Columns for product list with relations (includes FKs for filtering)
    private const PRODUCT_FULL_LIST_COLUMNS = [
        'id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller',
        'note', 'alt_cover', 'description_cover', 'prix', 'prix_ht', 'pack', 'promo',
        'promo_expiration_date', 'sous_categorie_id', 'brand_id', 'qte', 'rupture',
        'meta_title', 'meta_description', 'seo_title', 'seo_description',
    ];

    /** Same as backend ApisController::PRODUCT_LISTING — used for /api/all_products (no pagination). */
    private const PRODUCT_LISTING = [
        'id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller', 'note',
        'alt_cover', 'description_cover', 'prix', 'pack', 'promo', 'promo_expiration_date',
        'qte', 'rupture', 'brand_id', 'sous_categorie_id', 'meta_title', 'meta_description', 'seo_title', 'seo_description',
    ];

    // Article list columns — exclude description_fr (can be huge HTML); blog_type only if migrated
    private function articleListSelectColumns(): array
    {
        $base = ['id', 'slug', 'designation_fr', 'cover', 'publier', 'created_at'];
        $base = ['id', 'slug', 'designation_fr', 'cover', 'publier', 'meta_title', 'meta_description_fr', 'seo_title', 'seo_description', 'created_at'];
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
        $frontendBase = rtrim((string) config('app.frontend_url', config('app.url')), '/');
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

    private function productListQuery()
    {
        return Product::where('publier', 1)
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
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
            ])
            ->with(['sousCategories' => fn ($q) => $q->select(
                'id', 'sort_order', 'slug', 'designation_fr', 'categorie_id',
                'sitemap_include', 'sitemap_priority', 'sitemap_changefreq', 'robots_index', 'seo_enabled',
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
            ])
            ->with(['sousCategories' => fn ($q) => $q->select(
                'id', 'sort_order', 'slug', 'designation_fr', 'categorie_id',
                'sitemap_include', 'sitemap_priority', 'sitemap_changefreq', 'robots_index', 'seo_enabled',
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
        $slides = Slide::orderBy('id')->paginate($perPage);

        $libraryPaths = $slides->getCollection()
            ->pluck('image')
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

            return [
                'id'           => $slide->id,
                'cover'        => $norm,
                'title'        => $title,
                'link'         => $link,
                'type'         => $slide->type ?? 'web',
                'image_media'  => $norm ? ($libraryByPath[$norm] ?? null) : null,
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
        $query = Product::where('publier', 1)->select(self::PRODUCT_LISTING);

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

        $products = $query->get();
        $brandIds = $products->pluck('brand_id')->filter()->unique()->values()->all();
        $brands = Brand::whereIn('id', $brandIds)->get();
        $categories = Categ::select('id', 'slug', 'designation_fr', 'cover')->get();

        $this->normalizeCollectionImages($products, 'cover');
        $this->normalizeCollectionImages($brands, 'logo');
        $this->normalizeCollectionImages($categories, 'cover');

        return response()->json([
            'products'   => $products,
            'brands'     => $brands,
            'categories' => $categories,
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
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr')
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

        $frontendBase = (string) config('app.frontend_url', config('app.url'));

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
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr')
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

        $frontendBase = (string) config('app.frontend_url', config('app.url'));
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
            ->with(['aromes:id,designation_fr', 'tags:id,designation_fr', 'sousCategories:id,slug,designation_fr,categorie_id'])
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
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr')
            ->limit(50)
            ->get();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())
            ->select('id', 'designation_fr', 'logo')
            ->get();

        $this->normalizeCollectionImages($products, 'cover');
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
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr');

        if ($sous_category) {
            $query->where('sous_categorie_id', $sous_category->id);
        }

        $products = $query->limit(50)->get();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())
            ->select('id', 'designation_fr', 'logo')
            ->get();

        $this->normalizeCollectionImages($products, 'cover');
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

        $brands = Brand::select('id', 'logo', 'designation_fr', 'alt_cover')
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
                ->withCount(['reviews' => fn ($q) => $q->where('publier', 1)])
                ->limit(4 - $products->count())
                ->get();

            $products = $products->merge($extra);
        }

        return ['products' => $products];
    }

    /**
     * Redirections — FIXED: select columns + limit.
     */
    public function redirections()
    {
        return Redirection::select('id', 'old_url', 'new_url', 'status_code')
            ->limit(500)
            ->get();
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

        $review = Review::create([
            'user_id'    => Auth::id(),
            'product_id' => $validated['product_id'],
            'stars'      => $validated['stars'] ?? 5,
            'comment'    => $validated['comment'],
            'publier'    => ($validated['stars'] ?? 5) >= 4 ? 1 : 0,
        ]);

        return response()->json($review, 201);
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
