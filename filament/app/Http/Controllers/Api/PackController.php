<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\PackDiscountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PackController extends Controller
{
    /**
     * POST /api/pack/quote  (PUBLIC)
     *
     * Server-computes a pack (bundle) tier quote from REAL product prices.
     * The client never supplies prices or amounts — everything is derived
     * server-side via Product::getEffectiveUnitPrice() and PackDiscountService.
     * Unknown / absent products are skipped; an empty cart returns zeros.
     */
    public function quote(Request $request, PackDiscountService $packDiscount): JsonResponse
    {
        $request->validate([
            'panier'                => ['required', 'array'],
            'panier.*.produit_id'   => ['required', 'integer'],
            'panier.*.quantite'     => ['required', 'integer', 'min:1'],
        ]);

        $panier = $request->input('panier', []);

        $ids = array_values(array_unique(array_filter(array_map(
            static fn ($row) => (int) ($row['produit_id'] ?? 0),
            $panier
        ))));

        $products = empty($ids)
            ? collect()
            : Product::whereIn('id', $ids)->get()->keyBy('id');

        $items = [];
        $subtotal = 0.0;

        foreach ($panier as $row) {
            $produitId = (int) ($row['produit_id'] ?? 0);
            $quantite = (int) ($row['quantite'] ?? 0);
            $product = $products->get($produitId);

            if (! $product || $quantite < 1) {
                continue; // fail-safe: skip unknown/absent products
            }

            $unit = (float) $product->getEffectiveUnitPrice();
            $lineTotal = round($unit * $quantite, 3);
            $subtotal += $lineTotal;

            $items[] = [
                'produit_id'    => $produitId,
                'designation'   => (string) ($product->designation_fr ?? ''),
                'prix_unitaire' => round($unit, 3),
                'quantite'      => $quantite,
                'line_total'    => $lineTotal,
            ];
        }

        $subtotal = round($subtotal, 3);
        $percent = $packDiscount->percentForSubtotal($subtotal);
        $discountAmount = $packDiscount->amountForSubtotal($subtotal);
        $total = round($subtotal - $discountAmount, 3);

        return response()->json([
            'subtotal'         => $subtotal,
            'discount_percent' => $percent,
            'discount_amount'  => $discountAmount,
            'total'            => $total,
            'tier_label'       => $packDiscount->label($percent),
            'next_tier'        => $packDiscount->nextTier($subtotal),
            'items'            => $items,
        ]);
    }
}
