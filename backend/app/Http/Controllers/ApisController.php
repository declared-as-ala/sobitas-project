<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Http\Requests\NewsletterRequest;
use App\Models\Annonce;
use App\Models\Article;
use App\Models\Aroma;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Contact;
use App\Models\Coordinate;
use App\Models\Faq;
use App\Models\Newsletter;
use App\Models\Page;
use App\Models\Product;
use App\Models\Redirection;
use App\Models\Review;
use App\Models\SeoPage;
use App\Models\SousCategory;
use App\Models\Service;
use App\Models\Slide;
use App\Models\Tag;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApisController extends Controller
{
    /**
     * Standard product select fields used across multiple endpoints.
     */
    private const PRODUCT_SELECT = [
        'id', 'slug', 'designation_fr', 'cover', 'new_product',
        'best_seller', 'note', 'alt_cover', 'description_cover',
        'prix', 'pack', 'promo', 'promo_expiration_date',
    ];

    /**
     * Homepage data: categories, new products, packs, flash sales, best sellers, articles.
     */
    public function accueil(): array
    {
        $newProducts = Product::where('new_product', true)
            ->where('publier', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->latest('created_at')
            ->limit(8)
            ->get();

        $packs = Product::where('pack', true)
            ->where('publier', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->latest('created_at')
            ->limit(4)
            ->get();

        $lastArticles = Article::where('publier', true)
            ->latest('created_at')
            ->select('id', 'slug', 'designation_fr', 'cover', 'created_at')
            ->limit(4)
            ->get();

        $ventesFlash = Product::whereNotNull('promo')
            ->where('publier', true)
            ->whereDate('promo_expiration_date', '>', Carbon::now())
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->get();

        $categories = Category::select('id', 'cover', 'slug', 'designation_fr')
            ->with(['sous_categories:id,slug,designation_fr,categorie_id'])
            ->get();

        $bestSellers = Product::where('best_seller', true)
            ->where('publier', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->latest('created_at')
            ->limit(4)
            ->get();

        return [
            'categories' => $categories,
            'last_articles' => $lastArticles,
            'ventes_flash' => $ventesFlash,
            'new_product' => $newProducts,
            'packs' => $packs,
            'best_sellers' => $bestSellers,
        ];
    }

    /**
     * Home page data (without categories).
     */
    public function home(): array
    {
        $newProducts = Product::where('new_product', true)
            ->where('publier', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->latest('created_at')
            ->limit(8)
            ->get();

        $packs = Product::where('pack', true)
            ->where('publier', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->latest('created_at')
            ->limit(4)
            ->get();

        $lastArticles = Article::where('publier', true)
            ->latest('created_at')
            ->select('id', 'slug', 'designation_fr', 'cover', 'created_at')
            ->limit(4)
            ->get();

        $ventesFlash = Product::whereNotNull('promo')
            ->where('publier', true)
            ->whereDate('promo_expiration_date', '>', Carbon::now())
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->get();

        $bestSellers = Product::where('best_seller', true)
            ->where('publier', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->latest('created_at')
            ->limit(4)
            ->get();

        return [
            'last_articles' => $lastArticles,
            'ventes_flash' => $ventesFlash,
            'new_product' => $newProducts,
            'packs' => $packs,
            'best_sellers' => $bestSellers,
        ];
    }

    /**
     * All categories with subcategories.
     */
    public function categories()
    {
        return Category::select('id', 'cover', 'slug', 'designation_fr')
            ->with(['sous_categories:id,slug,designation_fr,categorie_id'])
            ->get();
    }

    /**
     * All slides ordered by ID.
     */
    public function slides()
    {
        return Slide::orderBy('id')->get();
    }

    /**
     * Get site coordinates/contact info.
     */
    public function coordonnees()
    {
        return Coordinate::first();
    }

    /**
     * Latest products, packs, and best sellers.
     */
    public function latestProducts(): array
    {
        $newProducts = Product::where('new_product', true)
            ->where('publier', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->latest('created_at')
            ->limit(8)
            ->get();

        $packs = Product::where('pack', true)
            ->where('publier', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->latest('created_at')
            ->limit(4)
            ->get();

        $bestSellers = Product::where('best_seller', true)
            ->where('publier', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->latest('created_at')
            ->limit(4)
            ->get();

        return [
            'new_product' => $newProducts,
            'packs' => $packs,
            'best_sellers' => $bestSellers,
        ];
    }

    /**
     * Latest packs.
     */
    public function latestPacks()
    {
        return Product::where('pack', true)
            ->where('publier', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->latest('created_at')
            ->limit(4)
            ->get();
    }

    /**
     * Product details by slug.
     */
    public function productDetails(string $slug)
    {
        return Product::where('slug', $slug)
            ->where('publier', true)
            ->with([
                'sous_categorie.category',
                'tags',
                'aromes',
                'reviews.user:id,name',
            ])
            ->first();
    }

    /**
     * All published products with brands and categories.
     */
    public function allProducts(Request $request): array
    {
        $perPage = (int) $request->get('per_page', 20);
        $perPage = in_array($perPage, [12, 20, 40, 60], true) ? $perPage : 20;

        $query = Product::where('publier', true)
            ->with(['aromes', 'tags']);

        if ($search = trim((string) $request->get('search', ''))) {
            $query->where(function ($builder) use ($search) {
                $builder->where('designation_fr', 'like', '%' . $search . '%')
                    ->orWhere('slug', 'like', '%' . $search . '%');
            });
        }

        if ($brandId = $request->get('brand_id')) {
            $query->where('brand_id', $brandId);
        }

        if ($request->filled('min_price')) {
            $query->where('prix', '>=', (float) $request->get('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('prix', '<=', (float) $request->get('max_price'));
        }

        if ($sort = $request->get('sort')) {
            if ($sort === 'price_asc') {
                $query->orderBy('prix');
            } elseif ($sort === 'price_desc') {
                $query->orderByDesc('prix');
            } else {
                $query->latest('created_at');
            }
        } else {
            $query->latest('created_at');
        }

        $products = $query->paginate($perPage)->withQueryString();
        $brands = Brand::select('id', 'logo', 'designation_fr', 'alt_cover')->get();
        $categories = Category::select('id', 'slug', 'designation_fr', 'cover')->get();

        return [
            'products' => $products,
            'brands' => $brands,
            'categories' => $categories,
        ];
    }

    /**
     * Products by category slug.
     */
    public function productsByCategoryId(string $slug): JsonResponse|array
    {
        $category = Category::where('slug', $slug)->first();

        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        $sousCategories = SousCategory::where('categorie_id', $category->id)->get();

        $products = Product::where('publier', true)
            ->whereIn('sous_categorie_id', $sousCategories->pluck('id'))
            ->with(['aromes', 'tags'])
            ->get();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())->get();

        return [
            'category' => $category,
            'sous_categories' => $sousCategories,
            'products' => $products,
            'brands' => $brands,
        ];
    }

    /**
     * Products by brand ID.
     */
    public function productsByBrandId(int $brand_id): array
    {
        $brand = Brand::find($brand_id);
        $categories = Category::all();
        $products = Product::where('brand_id', $brand_id)
            ->where('publier', true)
            ->with(['aromes', 'tags'])
            ->get();
        $brands = Brand::all();

        return [
            'categories' => $categories,
            'products' => $products,
            'brands' => $brands,
            'brand' => $brand,
        ];
    }

    /**
     * Products by subcategory slug.
     */
    public function productsBySubCategoryId(string $slug): array
    {
        $sousCategory = SousCategory::where('slug', $slug)->first();

        $products = Product::where('sous_categorie_id', $sousCategory?->id)
            ->where('publier', true)
            ->with(['aromes', 'tags'])
            ->get();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())->get();

        $sousCategories = SousCategory::where('categorie_id', $sousCategory?->categorie_id)->get();

        return [
            'sous_category' => $sousCategory,
            'products' => $products,
            'brands' => $brands,
            'sous_categories' => $sousCategories,
        ];
    }

    /**
     * Search products by text.
     */
    public function searchProduct(string $text): array
    {
        $products = Product::where('designation_fr', 'LIKE', '%' . $text . '%')
            ->where('publier', true)
            ->with(['aromes', 'tags'])
            ->get();

        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())->get();

        return ['products' => $products, 'brands' => $brands];
    }

    /**
     * Search products by subcategory slug and text.
     */
    public function searchProductBySubCategoryText(string $slug, string $text): array
    {
        $sousCategory = SousCategory::where('slug', $slug)->first();

        $query = Product::where('publier', true)
            ->where('designation_fr', 'LIKE', '%' . $text . '%')
            ->with(['aromes', 'tags']);

        if ($sousCategory) {
            $query->where('sous_categorie_id', $sousCategory->id);
        }

        $products = $query->get();
        $brands = Brand::whereIn('id', $products->pluck('brand_id')->unique()->filter())->get();

        return ['products' => $products, 'brands' => $brands];
    }

    /**
     * All published articles.
     */
    public function allArticles()
    {
        return Article::where('publier', true)->get();
    }

    /**
     * Article details by slug.
     */
    public function articleDetails(string $slug)
    {
        return Article::where('slug', $slug)->where('publier', true)->first();
    }

    /**
     * Latest 4 articles.
     */
    public function latestArticles()
    {
        return Article::where('publier', true)
            ->latest('created_at')
            ->select('id', 'slug', 'designation_fr', 'cover', 'created_at')
            ->limit(4)
            ->get();
    }

    /**
     * All brands.
     */
    public function allBrands()
    {
        return Brand::select('id', 'logo', 'designation_fr', 'alt_cover')->get();
    }

    /**
     * All aromas.
     */
    public function aromes()
    {
        return Aroma::all();
    }

    /**
     * All tags.
     */
    public function tags()
    {
        return Tag::all();
    }

    /**
     * All published packs.
     */
    public function packs()
    {
        return Product::where('pack', true)
            ->where('publier', true)
            ->latest('created_at')
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->get();
    }

    /**
     * Flash sales (products with active promo).
     */
    public function flash()
    {
        return Product::whereNotNull('promo')
            ->where('publier', true)
            ->whereDate('promo_expiration_date', '>', Carbon::now())
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->get();
    }

    /**
     * Get media/annonce data.
     */
    public function media()
    {
        return Annonce::first();
    }

    /**
     * Subscribe to newsletter.
     */
    public function newsLetter(NewsletterRequest $request): array
    {
        Newsletter::create(['email' => $request->validated()['email']]);

        return ['success' => 'Merci de vous inscrire!'];
    }

    /**
     * Send a contact message.
     */
    public function sendContact(ContactRequest $request): array
    {
        Contact::create($request->validated());

        return ['success' => 'Votre message envoyé avec succès'];
    }

    /**
     * All services.
     */
    public function services()
    {
        return Service::all();
    }

    /**
     * All FAQs.
     */
    public function faqs()
    {
        return Faq::all();
    }

    /**
     * All pages (id, title only).
     */
    public function pages()
    {
        return Page::select('id', 'title')->get();
    }

    /**
     * Get page by slug.
     */
    public function getPageBySlug(string $slug)
    {
        return Page::where('slug', $slug)->first();
    }

    /**
     * Get similar products by subcategory.
     */
    public function similar_products(int $sous_categorie_id): array
    {
        $sousCategory = SousCategory::find($sous_categorie_id);

        if (!$sousCategory) {
            return ['products' => collect()];
        }

        $products = Product::where('sous_categorie_id', $sousCategory->id)
            ->where('publier', true)
            ->where('rupture', true)
            ->select(self::PRODUCT_SELECT)
            ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
            ->limit(4)
            ->get();

        // If less than 4, fill from same category
        if ($products->count() < 4) {
            $categId = $sousCategory->categorie_id;
            $existingIds = $products->pluck('id');

            $moreProducts = Product::where('publier', true)
                ->where('rupture', true)
                ->whereNotIn('id', $existingIds)
                ->whereHas('sous_categorie', fn ($q) => $q->where('categorie_id', $categId))
                ->withCount(['reviews' => fn ($q) => $q->where('publier', true)])
                ->limit(4 - $products->count())
                ->get();

            $products = $products->merge($moreProducts);
        }

        return ['products' => $products];
    }

    /**
     * All redirections.
     */
    public function redirections()
    {
        return Redirection::all();
    }

    /**
     * Add a product review (authenticated).
     */
    public function add_review(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'stars' => 'nullable|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $stars = $request->stars ?? 5;

        $review = Review::create([
            'user_id' => Auth::id(),
            'product_id' => $request->product_id,
            'stars' => $stars,
            'comment' => $request->comment,
            'publier' => $stars >= 4,
        ]);

        return $review;
    }

    /**
     * Get SEO page by name.
     */
    public function seoPage(string $name)
    {
        return SeoPage::where('page', $name)->first();
    }
}
