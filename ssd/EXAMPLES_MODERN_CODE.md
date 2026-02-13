# Modern Code Examples
## Before & After Comparisons

---

## Example 1: Modernized Product Model

### ❌ Before (Current)
```php
<?php
namespace App;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    public function sous_categorie(){
        return $this->belongsTo(SousCategory::class , 'sous_categorie_id' , 'id');
    }

    public function tags(){
        return $this->belongsToMany(Tag::class , 'product_tags');
    }

    public function aromes(){
        return $this->belongsToMany(Aroma::class , 'product_aromas');
    }
    
    public function reviews(){
        return $this->hasMany(Review::class )->where('publier' , 1);
    }
}
```

### ✅ After (Modernized)
```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Product extends Model
{
    protected $fillable = [
        'designation_fr',
        'slug',
        'cover',
        'prix',
        'qte',
        'publier',
        'new_product',
        'best_seller',
        'pack',
        'promo',
        'promo_expiration_date',
        'sous_categorie_id',
        'brand_id',
    ];

    protected $casts = [
        'publier' => 'boolean',
        'new_product' => 'boolean',
        'best_seller' => 'boolean',
        'pack' => 'boolean',
        'prix' => 'decimal:2',
        'promo' => 'decimal:2',
        'promo_expiration_date' => 'datetime',
    ];

    // Query Scopes
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('publier', true);
    }

    public function scopeNewProducts(Builder $query): Builder
    {
        return $query->where('new_product', true);
    }

    public function scopeBestSellers(Builder $query): Builder
    {
        return $query->where('best_seller', true);
    }

    public function scopePacks(Builder $query): Builder
    {
        return $query->where('pack', true);
    }

    public function scopeWithActivePromo(Builder $query): Builder
    {
        return $query->whereNotNull('promo')
            ->whereDate('promo_expiration_date', '>', now());
    }

    public function scopeWithReviewCount(Builder $query): Builder
    {
        return $query->withCount(['reviews' => fn($q) => $q->where('publier', true)]);
    }

    // Relationships with type hints
    public function sous_categorie(): BelongsTo
    {
        return $this->belongsTo(SousCategory::class, 'sous_categorie_id', 'id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'product_tags');
    }

    public function aromes(): BelongsToMany
    {
        return $this->belongsToMany(Aroma::class, 'product_aromas');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class)->where('publier', true);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id', 'id');
    }

    // Accessors & Mutators
    public function getIsOnSaleAttribute(): bool
    {
        return $this->promo !== null 
            && $this->promo_expiration_date 
            && $this->promo_expiration_date->isFuture();
    }

    public function getFinalPriceAttribute(): float
    {
        return $this->is_on_sale ? $this->promo : $this->prix;
    }
}
```

---

## Example 2: Modernized API Controller

### ❌ Before (Current)
```php
public function accueil(){
    $new_product =  Product::where('new_product', 1)->where('publier', 1)
        ->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')
        ->withCount(['reviews' => function ($query) {
            $query->where('publier', 1);
        }])->latest('created_at')->limit(8)->get();
    
    $packs = Product::where('pack', 1)->where('publier', 1)
        ->select('id','slug','designation_fr','cover','new_product','best_seller','note', 'alt_cover' , 'description_cover' , 'prix','pack' , 'promo' , 'promo_expiration_date')
        ->withCount(['reviews' => function ($query) {
            $query->where('publier', 1);
        }])->latest('created_at')->limit(4)->get();
    
    // ... more repeated code
    return [ 'categories' =>  $categories,'last_articles'=> $last_articles , 'ventes_flash'=> $ventes_flash ,'new_product' => $new_product, 'packs' => $packs, 'best_sellers' => $best_sellers];
}
```

### ✅ After (Modernized)
```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ArticleResource;
use App\Models\Product;
use App\Models\Categ;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class HomeController extends Controller
{
    public function index(): JsonResponse
    {
        $data = Cache::remember('homepage_data', 3600, function () {
            return [
                'categories' => CategoryResource::collection($this->getCategories()),
                'new_products' => ProductResource::collection($this->getNewProducts()),
                'packs' => ProductResource::collection($this->getPacks()),
                'best_sellers' => ProductResource::collection($this->getBestSellers()),
                'flash_sales' => ProductResource::collection($this->getFlashSales()),
                'latest_articles' => ArticleResource::collection($this->getLatestArticles()),
            ];
        });

        return response()->json($data);
    }

    private function getCategories()
    {
        return Categ::select('id', 'cover', 'slug', 'designation_fr')
            ->with(['sous_categories:id,slug,designation_fr,categorie_id'])
            ->get();
    }

    private function getNewProducts()
    {
        return Product::published()
            ->newProducts()
            ->withReviewCount()
            ->select('id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller', 'note', 'alt_cover', 'description_cover', 'prix', 'pack', 'promo', 'promo_expiration_date')
            ->latest('created_at')
            ->limit(8)
            ->get();
    }

    private function getPacks()
    {
        return Product::published()
            ->packs()
            ->withReviewCount()
            ->select('id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller', 'note', 'alt_cover', 'description_cover', 'prix', 'pack', 'promo', 'promo_expiration_date')
            ->latest('created_at')
            ->limit(4)
            ->get();
    }

    private function getBestSellers()
    {
        return Product::published()
            ->bestSellers()
            ->withReviewCount()
            ->select('id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller', 'note', 'alt_cover', 'description_cover', 'prix', 'pack', 'promo', 'promo_expiration_date')
            ->latest('created_at')
            ->limit(4)
            ->get();
    }

    private function getFlashSales()
    {
        return Product::published()
            ->withActivePromo()
            ->withReviewCount()
            ->select('id', 'slug', 'designation_fr', 'cover', 'new_product', 'best_seller', 'note', 'alt_cover', 'description_cover', 'prix', 'pack', 'promo', 'promo_expiration_date')
            ->get();
    }

    private function getLatestArticles()
    {
        return Article::where('publier', true)
            ->select('id', 'slug', 'designation_fr', 'cover', 'created_at')
            ->latest('created_at')
            ->limit(4)
            ->get();
    }
}
```

---

## Example 3: Form Request & Service

### ❌ Before (Current)
```php
public function storeFacture(Request $request)
{
    $new_facture = new Commande();
    $new_facture->nom = @$request->nom;
    $new_facture->prenom = @$request->prenom;
    $new_facture->email = @$request->email;
    // ... no validation, using @ to suppress errors
}
```

### ✅ After (Modernized)

**Form Request:**
```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommandeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Or add proper authorization logic
    }

    public function rules(): array
    {
        return [
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'pays' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'ville' => ['nullable', 'string', 'max:100'],
            'code_postale' => ['nullable', 'string', 'max:20'],
            'adresse1' => ['required', 'string', 'max:255'],
            'adresse2' => ['nullable', 'string', 'max:255'],
            'livraison' => ['nullable', 'boolean'],
            'frais_livraison' => ['nullable', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
            'livraison_nom' => ['nullable', 'string', 'max:255'],
            'livraison_prenom' => ['nullable', 'string', 'max:255'],
            'livraison_email' => ['nullable', 'email', 'max:255'],
            'livraison_phone' => ['nullable', 'string', 'max:20'],
            'livraison_region' => ['nullable', 'string', 'max:100'],
            'livraison_ville' => ['nullable', 'string', 'max:100'],
            'livraison_code_postale' => ['nullable', 'string', 'max:20'],
            'livraison_adresse1' => ['nullable', 'string', 'max:255'],
            'livraison_adresse2' => ['nullable', 'string', 'max:255'],
            'nb_achat' => ['required', 'integer', 'min:1'],
            'produit_id_*' => ['required', 'exists:products,id'],
            'qte*' => ['required', 'integer', 'min:1'],
            'prix_unitaire*' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'nom.required' => 'Le nom est obligatoire',
            'email.required' => 'L\'email est obligatoire',
            'email.email' => 'L\'email doit être valide',
            // ... more custom messages
        ];
    }
}
```

**Service:**
```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CommandeService
{
    public function createCommande(array $data): Commande
    {
        return DB::transaction(function () use ($data) {
            // Generate commande number
            $numero = $this->generateCommandeNumber();
            
            // Create commande
            $commande = Commande::create([
                'nom' => $data['nom'],
                'prenom' => $data['prenom'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'pays' => $data['pays'] ?? null,
                'region' => $data['region'] ?? null,
                'ville' => $data['ville'] ?? null,
                'code_postale' => $data['code_postale'] ?? null,
                'adresse1' => $data['adresse1'],
                'adresse2' => $data['adresse2'] ?? null,
                'livraison' => $data['livraison'] ?? false,
                'frais_livraison' => $data['frais_livraison'] ?? 0,
                'note' => $data['note'] ?? null,
                'livraison_nom' => $data['livraison_nom'] ?? null,
                'livraison_prenom' => $data['livraison_prenom'] ?? null,
                'livraison_email' => $data['livraison_email'] ?? null,
                'livraison_phone' => $data['livraison_phone'] ?? null,
                'livraison_region' => $data['livraison_region'] ?? null,
                'livraison_ville' => $data['livraison_ville'] ?? null,
                'livraison_code_postale' => $data['livraison_code_postale'] ?? null,
                'livraison_adresse1' => $data['livraison_adresse1'] ?? null,
                'livraison_adresse2' => $data['livraison_adresse2'] ?? null,
                'etat' => 'nouvelle_commande',
                'numero' => $numero,
            ]);

            // Create commande details
            $this->createCommandeDetails($commande, $data);

            // Calculate and update totals
            $this->calculateTotals($commande);

            return $commande->fresh();
        });
    }

    private function generateCommandeNumber(): string
    {
        $year = date('Y');
        $count = Commande::whereYear('created_at', $year)->count() + 1;
        return $year . '/' . str_pad((string)$count, 4, '0', STR_PAD_LEFT);
    }

    private function createCommandeDetails(Commande $commande, array $data): void
    {
        $nbAchat = $data['nb_achat'] ?? 0;
        
        for ($i = 1; $i <= $nbAchat; $i++) {
            $produitId = $data["produit_id_{$i}"] ?? null;
            $qte = $data["qte{$i}"] ?? 0;
            $prixUnitaire = $data["prix_unitaire{$i}"] ?? 0;

            if (!$produitId || !$qte) {
                continue;
            }

            $produit = Product::findOrFail($produitId);
            $prixHt = $qte * $prixUnitaire;

            CommandeDetail::create([
                'commande_id' => $commande->id,
                'produit_id' => $produitId,
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ht' => $prixHt,
                'prix_ttc' => $prixHt,
            ]);

            // Update product quantity
            $produit->decrement('qte', $qte);
        }
    }

    private function calculateTotals(Commande $commande): void
    {
        $totals = CommandeDetail::where('commande_id', $commande->id)
            ->selectRaw('SUM(prix_ht) as total_ht, SUM(prix_ttc) as total_ttc')
            ->first();

        $commande->update([
            'prix_ht' => $totals->total_ht ?? 0,
            'prix_ttc' => ($totals->total_ttc ?? 0) + ($commande->frais_livraison ?? 0),
        ]);
    }
}
```

**Controller:**
```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommandeRequest;
use App\Services\CommandeService;
use Illuminate\Http\RedirectResponse;

class AdminCommandeController extends Controller
{
    public function __construct(
        private readonly CommandeService $commandeService
    ) {}

    public function store(StoreCommandeRequest $request): RedirectResponse
    {
        $commande = $this->commandeService->createCommande($request->validated());

        return redirect()
            ->route('voyager.imprimer_commande', $commande->id)
            ->with('success', 'Commande créée avec succès');
    }
}
```

---

## Example 4: API Resource

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->designation_fr,
            'cover' => $this->cover,
            'price' => (float) $this->prix,
            'final_price' => (float) $this->final_price,
            'is_on_sale' => $this->is_on_sale,
            'is_new' => $this->new_product,
            'is_best_seller' => $this->best_seller,
            'is_pack' => $this->pack,
            'rating' => (float) $this->note,
            'reviews_count' => $this->reviews_count ?? 0,
            'category' => new CategoryResource($this->whenLoaded('sous_categorie')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'aromas' => AromaResource::collection($this->whenLoaded('aromes')),
        ];
    }
}
```

---

These examples show the transformation from 2018-style code to modern Laravel 11 best practices!
