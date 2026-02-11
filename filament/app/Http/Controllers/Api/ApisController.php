<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendOrderEmailJob;
use App\Models\Annonce;
use App\Models\Aroma;
use App\Models\Article;
use App\Models\Brand;
use App\Models\Categ;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Contact;
use App\Models\Coordinate;
use App\Models\Faq;
use App\Models\Newsletter;
use App\Models\Product;
use App\Models\Redirection;
use App\Models\Review;
use App\Models\SeoPage;
use App\Models\Service;
use App\Models\Slide;
use App\Models\SousCategory;
use App\Models\Tag;
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
    ];

    // Article list columns — exclude description_fr (can be huge HTML)
    private const ARTICLE_LIST_COLUMNS = [
        'id', 'slug', 'designation_fr', 'cover', 'publier', 'created_at',
        'meta_title', 'meta_description',
    ];

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

    private function productListQuery()
    {
        return Product::where('publier', 1)
            ->select(self::PRODUCT_LIST_COLUMNS)
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

        return compact('new_product', 'packs', 'last_articles', 'ventes_flash', 'best_sellers');
    }

    // ── Endpoints ───────────────────────────────────────

    public function accueil(Request $request): array
    {
        $perPage = $this->resolvePerPage($request);
        $data = $this->buildHomeData();

        $categories = Categ::select('id', 'cover', 'slug', 'designation_fr')
            ->with(['sousCategories' => fn ($q) => $q->select('id', 'slug', 'designation_fr', 'categorie_id')])
            ->orderBy('id')
            ->paginate($perPage);

        $data['categories'] = $categories->items();
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

        $categories = Categ::select('id', 'cover', 'slug', 'designation_fr')
            ->with(['sousCategories' => fn ($q) => $q->select('id', 'slug', 'designation_fr', 'categorie_id')])
            ->orderBy('id')
            ->paginate($perPage);

        return $this->paginatedResponse($categories);
    }

    public function slides(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $slides = Slide::select('id', 'cover', 'title', 'link', 'publier')
            ->orderBy('id')
            ->paginate($perPage);

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

    public function productDetails(string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)
            ->where('publier', 1)
            ->with([
                'sousCategorie:id,designation_fr,slug,categorie_id',
                'sousCategorie.categorie:id,designation_fr,slug',
                'tags:id,designation_fr',
                'aromes:id,designation_fr',
                'reviews' => fn ($q) => $q->where('publier', 1)->with('user:id,name,avatar')->latest()->limit(20),
            ])
            ->first();

        if (! $product) {
            return response()->json(['error' => 'Produit introuvable'], 404);
        }

        return response()->json($product);
    }

    /**
     * All products — used for shop page with client-side filtering.
     * OPTIMIZED: Reduced queries, removed unnecessary pagination, optimized serialization.
     */
    public function allProducts(Request $request): JsonResponse
    {
        $perPage = $this->resolvePerPage($request);

        // ── Optimized: Single query with eager loading ──
        $productsPaginator = Product::where('publier', 1)
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
            ->with(['aromes:id,designation_fr', 'tags:id,designation_fr'])
            ->latest('created_at')
            ->paginate($perPage);

        $products = $productsPaginator->getCollection();
        
        // ── Optimized: Get unique IDs in single pass ──
        $brandIds = $products->pluck('brand_id')->filter()->unique()->values();
        $sousCategoryIds = $products->pluck('sous_categorie_id')->filter()->unique()->values();

        // ── Optimized: Load brands and categories in parallel (if possible) ──
        $brands = $brandIds->isNotEmpty()
            ? Brand::whereIn('id', $brandIds)
                ->select('id', 'designation_fr', 'logo')
                ->orderBy('designation_fr')
                ->get()
            : collect();

        // ── Optimized: Get category IDs more efficiently ──
        $categoryIds = $sousCategoryIds->isNotEmpty()
            ? SousCategory::whereIn('id', $sousCategoryIds)
                ->select('categorie_id')
                ->distinct()
                ->pluck('categorie_id')
                ->filter()
                ->values()
            : collect();

        // ── Optimized: Categories don't need pagination (just for filtering) ──
        $categories = $categoryIds->isNotEmpty()
            ? Categ::whereIn('id', $categoryIds)
                ->select('id', 'designation_fr', 'slug')
                ->orderBy('designation_fr')
                ->get()
            : collect();

        // ── CRITICAL FIX: Return JsonResponse directly (faster serialization) ──
        // Laravel's response()->json() is optimized for JSON serialization
        // This avoids the overhead of array-to-JSON conversion in middleware
        return response()->json([
            'products'   => $productsPaginator->items(),
            'brands'     => $brands->values()->all(),
            'categories' => $categories->values()->all(),
            'products_meta'   => $this->paginationMeta($productsPaginator),
            'products_links'  => $this->paginationLinks($productsPaginator),
        ]);
    }

    /**
     * Products by category — FIXED: added column selection + limit.
     */
    public function productsByCategoryId(Request $request, string $slug): JsonResponse
    {
        $perPage = $this->resolvePerPage($request);

        $category = Categ::where('slug', $slug)->select('id', 'slug', 'designation_fr', 'cover')->first();

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

        return response()->json(array_merge(
            [
                'category'        => $category,
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
     * Products by subcategory — FIXED: added column selection + limit.
     */
    public function productsBySubCategoryId(Request $request, string $slug): JsonResponse
    {
        $perPage = $this->resolvePerPage($request);

        $sous_category = SousCategory::where('slug', $slug)
            ->select('id', 'slug', 'designation_fr', 'categorie_id')
            ->first();

        if (! $sous_category) {
            return response()->json(['error' => 'Sous-catégorie introuvable'], 404);
        }

        $productsPaginator = Product::where('sous_categorie_id', $sous_category->id)
            ->where('publier', 1)
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr')
            ->latest('created_at')
            ->paginate($perPage);

        $products = $productsPaginator->getCollection();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())
            ->select('id', 'designation_fr', 'logo')
            ->orderBy('designation_fr')
            ->get();

        $sousCategoriesPaginator = SousCategory::where('categorie_id', $sous_category->categorie_id)
            ->select('id', 'slug', 'designation_fr', 'categorie_id')
            ->orderBy('designation_fr')
            ->paginate($perPage);

        return response()->json(array_merge(
            [
                'sous_category'   => $sous_category,
                'products'        => $productsPaginator->items(),
                'brands'          => $brands,
                'sous_categories' => $sousCategoriesPaginator->items(),
            ],
            $this->paginatedKeyedResponse($productsPaginator, 'products'),
            $this->paginatedKeyedResponse($sousCategoriesPaginator, 'sous_categories')
        ));
    }

    public function searchProduct(string $text): array
    {
        $text = mb_substr(trim($text), 0, 100);

        if (mb_strlen($text) < 2) {
            return ['products' => [], 'brands' => []];
        }

        $products = Product::where('designation_fr', 'LIKE', "%{$text}%")
            ->where('publier', 1)
            ->select(self::PRODUCT_FULL_LIST_COLUMNS)
            ->with('aromes:id,designation_fr', 'tags:id,designation_fr')
            ->limit(50)
            ->get();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())
            ->select('id', 'designation_fr', 'logo')
            ->get();

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

        return compact('products', 'brands');
    }

    /**
     * All articles — FIXED: select columns (was SELECT * including huge HTML), add limit.
     */
    public function allArticles(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $articles = Article::where('publier', 1)
            ->select(self::ARTICLE_LIST_COLUMNS)
            ->latest('created_at')
            ->paginate($perPage);

        return $this->paginatedResponse($articles);
    }

    public function articleDetails(string $slug): JsonResponse
    {
        $article = Article::where('slug', $slug)->where('publier', 1)->first();

        if (! $article) {
            return response()->json(['error' => 'Article introuvable'], 404);
        }

        return response()->json($article);
    }

    public function latestArticles()
    {
        return Article::where('publier', 1)
            ->latest('created_at')
            ->select('id', 'slug', 'designation_fr', 'cover', 'created_at')
            ->limit(4)
            ->get();
    }

    public function allBrands(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $brands = Brand::select('id', 'logo', 'designation_fr', 'alt_cover')
            ->orderBy('designation_fr')
            ->paginate($perPage);

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
        return Annonce::select('id', 'cover', 'title', 'link', 'publier')->first();
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

            $pages = \Illuminate\Support\Facades\DB::table('pages')
                ->select('id', 'title', 'slug')
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
            $page = \Illuminate\Support\Facades\DB::table('pages')->where('slug', $slug)->first();

            if (! $page) {
                return response()->json(['error' => 'Page introuvable'], 404);
            }

            return $page;
        } catch (\Exception $e) {
            return response()->json(['error' => 'Page introuvable'], 404);
        }
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
            ->where('rupture', 1)
            ->select(self::PRODUCT_LIST_COLUMNS)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', 1)])
            ->limit(4)
            ->get();

        if ($products->count() < 4) {
            $existingIds = $products->pluck('id');

            $extra = Product::where('publier', 1)
                ->where('rupture', 1)
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
