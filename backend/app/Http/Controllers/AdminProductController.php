<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Product;
use App\Models\SousCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()->with(['brand', 'sousCategorie']);
        $filters = $this->normalizeFilters($request);

        if ($filters['search']) {
            $query->where(function ($builder) use ($filters) {
                $builder->where('designation_fr', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('slug', 'like', '%' . $filters['search'] . '%');
            });
        }

        if ($filters['brand_id']) {
            $query->where('brand_id', $filters['brand_id']);
        }

        if ($filters['sous_categorie_id']) {
            $query->where('sous_categorie_id', $filters['sous_categorie_id']);
        }

        if ($filters['status'] === 'published') {
            $query->where('publier', true);
        } elseif ($filters['status'] === 'draft') {
            $query->where('publier', false);
        }

        if ($filters['stock'] === 'in') {
            $query->where('qte', '>', 0);
        } elseif ($filters['stock'] === 'out') {
            $query->where(function ($builder) {
                $builder->where('qte', '<=', 0)->orWhere('rupture', true);
            });
        }

        if ($filters['sort'] === 'price_asc') {
            $query->orderBy('prix');
        } elseif ($filters['sort'] === 'price_desc') {
            $query->orderByDesc('prix');
        } else {
            $query->latest('id');
        }

        return view('admin.products', [
            'products' => $query->paginate($filters['per_page'])->withQueryString(),
            'brands' => Brand::orderBy('designation_fr')->get(),
            'sousCategories' => SousCategory::orderBy('designation_fr')->get(),
            'filters' => $filters,
            'stats' => [
                'total' => Product::count(),
                'in_stock' => Product::where('qte', '>', 0)->count(),
                'rupture' => Product::where('rupture', true)->count(),
                'published' => Product::where('publier', true)->count(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request);

        $data['slug'] = $this->buildSlug($data['slug'] ?? null, $data['designation_fr']);
        $this->normalizeBooleans($request, $data);
        $this->handleCoverUpload($request, $data);

        Product::create($data);

        return redirect()
            ->route('admin.products.index')
            ->with(['message' => 'Produit créé avec succès', 'alert-type' => 'success']);
    }

    public function edit(int $id)
    {
        return view('admin.products', [
            'product' => Product::findOrFail($id),
            'products' => Product::with(['brand', 'sousCategorie'])
                ->latest('id')
                ->get(),
            'brands' => Brand::orderBy('designation_fr')->get(),
            'sousCategories' => SousCategory::orderBy('designation_fr')->get(),
        ]);
    }

    public function update(Request $request, int $id)
    {
        $product = Product::findOrFail($id);
        $data = $this->validatePayload($request, $product->id);

        $data['slug'] = $this->buildSlug($data['slug'] ?? null, $data['designation_fr']);
        $this->normalizeBooleans($request, $data);
        $this->handleCoverUpload($request, $data, $product->cover);

        $product->update($data);

        return redirect()
            ->route('admin.products.index')
            ->with(['message' => 'Produit mis à jour', 'alert-type' => 'success']);
    }

    public function destroy(int $id)
    {
        $product = Product::findOrFail($id);

        if ($product->cover) {
            Storage::disk('public')->delete($product->cover);
        }

        $product->delete();

        return redirect()
            ->route('admin.products.index')
            ->with(['message' => 'Produit supprimé', 'alert-type' => 'success']);
    }

    private function validatePayload(Request $request, ?int $productId = null): array
    {
        return $request->validate([
            'designation_fr' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('products', 'slug')->ignore($productId),
            ],
            'description' => ['nullable', 'string'],
            'cover' => ['nullable', 'image', 'max:2048'],
            'alt_cover' => ['nullable', 'string', 'max:255'],
            'description_cover' => ['nullable', 'string', 'max:255'],
            'prix' => ['required', 'numeric', 'min:0'],
            'promo' => ['nullable', 'numeric', 'min:0'],
            'promo_expiration_date' => ['nullable', 'date'],
            'qte' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'sous_categorie_id' => ['nullable', 'exists:sous_categories,id'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:255'],
            'new_product' => ['nullable', 'boolean'],
            'best_seller' => ['nullable', 'boolean'],
            'pack' => ['nullable', 'boolean'],
            'publier' => ['nullable', 'boolean'],
            'rupture' => ['nullable', 'boolean'],
        ]);
    }

    private function buildSlug(?string $slug, string $name): string
    {
        return $slug && trim($slug) !== '' ? Str::slug($slug) : Str::slug($name);
    }

    private function normalizeFilters(Request $request): array
    {
        $perPage = (int) $request->get('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        return [
            'search' => trim((string) $request->get('search', '')),
            'brand_id' => $request->get('brand_id'),
            'sous_categorie_id' => $request->get('sous_categorie_id'),
            'status' => $request->get('status', 'all'),
            'stock' => $request->get('stock', 'all'),
            'sort' => $request->get('sort', 'latest'),
            'per_page' => $perPage,
        ];
    }

    private function normalizeBooleans(Request $request, array &$data): void
    {
        $data['new_product'] = $request->boolean('new_product');
        $data['best_seller'] = $request->boolean('best_seller');
        $data['pack'] = $request->boolean('pack');
        $data['publier'] = $request->boolean('publier');
        $data['rupture'] = $request->boolean('rupture');
    }

    private function handleCoverUpload(Request $request, array &$data, ?string $existingCover = null): void
    {
        if (! $request->hasFile('cover')) {
            return;
        }

        if ($existingCover) {
            Storage::disk('public')->delete($existingCover);
        }

        $data['cover'] = $request->file('cover')->store('products', 'public');
    }
}
