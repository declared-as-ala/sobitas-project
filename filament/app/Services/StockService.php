<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

class StockService
{
    /**
     * Record a stock movement and optionally update product qte.
     * Use adjustStock() for manual admin adjustments (updates qte + records movement).
     */
    public function recordMovement(
        int $productId,
        string $movementType,
        int $qtyChange,
        ?string $reason = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $userId = null,
        ?string $note = null
    ): StockMovement {
        return DB::transaction(function () use ($productId, $movementType, $qtyChange, $reason, $referenceType, $referenceId, $userId, $note) {
            $product = Product::lockForUpdate()->findOrFail($productId);
            $qtyBefore = (int) $product->qte;
            $qtyAfter = max(0, $qtyBefore + $qtyChange);

            $product->update(['qte' => $qtyAfter]);

            return StockMovement::create([
                'product_id' => $productId,
                'movement_type' => $movementType,
                'qty_before' => $qtyBefore,
                'qty_change' => $qtyChange,
                'qty_after' => $qtyAfter,
                'reason' => $reason ?? $movementType,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'user_id' => $userId ?? auth()->id(),
                'note' => $note,
            ]);
        });
    }

    /**
     * Manual adjustment: set product qte to a new value and record movement.
     */
    public function adjustStock(
        int $productId,
        int $newQty,
        string $reason = StockMovement::REASON_MANUAL_CORRECTION,
        ?string $note = null,
        ?int $userId = null
    ): StockMovement {
        $newQty = max(0, $newQty);
        $product = Product::findOrFail($productId);
        $qtyBefore = (int) $product->qte;
        $qtyChange = $newQty - $qtyBefore;

        if ($qtyChange === 0) {
            return StockMovement::create([
                'product_id' => $productId,
                'movement_type' => StockMovement::TYPE_ADJUSTMENT,
                'qty_before' => $qtyBefore,
                'qty_change' => 0,
                'qty_after' => $qtyBefore,
                'reason' => $reason,
                'reference_type' => StockMovement::REFERENCE_ADMIN_MANUAL,
                'reference_id' => null,
                'user_id' => $userId ?? auth()->id(),
                'note' => $note ?? 'Aucun changement de quantité',
            ]);
        }

        $type = $qtyChange > 0 ? StockMovement::TYPE_ENTRY : StockMovement::TYPE_EXIT;
        return $this->recordMovement(
            $productId,
            $type,
            $qtyChange,
            $reason,
            StockMovement::REFERENCE_ADMIN_MANUAL,
            null,
            $userId,
            $note
        );
    }

    /**
     * Dashboard metrics (cached 60s in controller/widget).
     */
    public function getDashboardMetrics(): array
    {
        $products = Product::query()->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN qte > 0 AND (rupture = 1 OR rupture IS NULL) THEN 1 ELSE 0 END) as in_stock,
            SUM(CASE WHEN qte <= 0 OR rupture = 0 THEN 1 ELSE 0 END) as out_of_stock,
            SUM(CASE WHEN qte > 0 AND qte < 10 THEN 1 ELSE 0 END) as low_stock,
            SUM(CASE WHEN (qte > 0 AND rupture = 0) OR (qte <= 0 AND rupture = 1) THEN 1 ELSE 0 END) as inconsistent
        ")->first();

        $valueQuery = Product::query()
            ->where('qte', '>', 0)
            ->selectRaw('COALESCE(SUM(qte * COALESCE(prix_ht, prix, 0)), 0) as total_value');
        $totalValue = (float) $valueQuery->value('total_value');

        return [
            'total_products' => (int) ($products->total ?? 0),
            'in_stock' => (int) ($products->in_stock ?? 0),
            'out_of_stock' => (int) ($products->out_of_stock ?? 0),
            'low_stock' => (int) ($products->low_stock ?? 0),
            'inconsistent' => (int) ($products->inconsistent ?? 0),
            'total_stock_value' => round($totalValue, 2),
        ];
    }

    /**
     * Sales velocity: total qty sold per product in last N days (from commande_details + commandes).
     */
    public function getSalesVelocity(int $days = 30): array
    {
        $since = now()->subDays($days);
        return DB::table('commande_details')
            ->join('commandes', 'commandes.id', '=', 'commande_details.commande_id')
            ->where('commandes.created_at', '>=', $since)
            ->whereNotIn('commandes.etat', ['annuler'])
            ->selectRaw('commande_details.produit_id as product_id, SUM(commande_details.qte) as total_sold')
            ->groupBy('commande_details.produit_id')
            ->pluck('total_sold', 'product_id')
            ->toArray();
    }
}
