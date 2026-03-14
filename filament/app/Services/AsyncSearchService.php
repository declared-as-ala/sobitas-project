<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;

/**
 * Async Search Service: Optimized server-side search for product and client pickers
 * Uses async/searchable with server-side lookup instead of preloading all data
 */
class AsyncSearchService
{
    /**
     * Search products by barcode or designation with proper indexing
     * Returns only minimal fields to reduce payload size
     * Triggers on ENTER for barcode scans (not on every keystroke)
     */
    public static function searchProducts(string $search = '', int $limit = 20): array
    {
        if (mb_strlen($search) < 1) {
            return [];
        }

        // Search indexed columns only: barcode/code_product (if available) and designation_fr
        $results = Product::query()
            ->select(['id', 'designation_fr', 'code_product', 'prix', 'qte'])
            ->where(function ($q) use ($search) {
                $q->where('designation_fr', 'like', "%{$search}%")
                    ->orWhere('code_product', 'like', "%{$search}%");
                // Include barcode if column exists
                if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'barcode')) {
                    $q->orWhere('barcode', 'like', "%{$search}%");
                }
            })
            ->where('publier', true)
            ->limit($limit)
            ->get();

        return $results->map(fn (Product $p) => [
            'id' => $p->id,
            'label' => "{$p->designation_fr}" . ($p->code_product ? " ({$p->code_product})" : ''),
            'stock' => $p->qte,
        ])->all();
    }

    /**
     * Fast barcode lookup with exact match
     * Used for POS scans where barcode is scanned exactly
     */
    public static function searchProductByBarcode(string $barcode): ?Product
    {
        if (mb_strlen($barcode) < 3) {
            return null;
        }

        // Use exact match OR indexed partial match
        return Product::query()
            ->select(['id', 'designation_fr', 'code_product', 'prix', 'prix_ht', 'qte'])
            ->where(function ($q) use ($barcode) {
                // First try: exact barcode if column exists
                if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'barcode')) {
                    $q->where('barcode', $barcode);
                }
                // Fallback: code_product
                $q->orWhere('code_product', $barcode);
            })
            ->first();
    }

    /**
     * Search clients by name or phone (indexed)
     * Used for client picker in forms
     */
    public static function searchClients(string $search = '', int $limit = 20): array
    {
        if (mb_strlen($search) < 1) {
            return [];
        }

        $results = Client::query()
            ->select(['id', 'name', 'phone_1', 'email'])
            ->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone_1', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            })
            ->limit($limit)
            ->get();

        return $results->map(fn (Client $c) => [
            'id' => $c->id,
            'label' => "{$c->name} ({$c->phone_1})",
        ])->all();
    }

    /**
     * Get product details for form display (minimal fields)
     */
    public static function getProductDetails(int $productId): ?Product
    {
        return Product::query()
            ->select(['id', 'designation_fr', 'code_product', 'prix', 'prix_ht', 'qte'])
            ->find($productId);
    }

    /**
     * Get client details for form display (minimal fields)
     */
    public static function getClientDetails(int $clientId): ?Client
    {
        return Client::query()
            ->select(['id', 'name', 'phone_1', 'email', 'adresse', 'region', 'ville'])
            ->find($clientId);
    }
}
