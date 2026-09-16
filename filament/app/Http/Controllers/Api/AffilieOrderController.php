<?php

namespace App\Http\Controllers\Api;

use App\Enums\AffilieTransactionType;
use App\Filament\Affilie\Resources\AffilieCommandeResource;
use App\Filament\Support\ImagePath;
use App\Http\Controllers\Controller;
use App\Models\Affilie;
use App\Models\Commande;
use App\Models\Product;
use App\Services\Affilie\AffilieOrderException;
use App\Services\Affilie\AffilieOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * The affiliate order desk of the /affiliate portal (protein.tn/affiliate/orders).
 *
 * Product search and the orders list are reads; POST is the ONE money-critical write, and it does
 * not reimplement anything — it hands off to App\Services\Affilie\AffilieOrderService, the single
 * home shared with the Filament CreateAffilieCommande page (stock, self-dealing, pending commission).
 * The service throws AffilieOrderException; this controller is the storefront-API translator of it,
 * mapping {field,line} onto a 422 the create form can pin to the right input.
 *
 * Every route is behind `auth:sanctum` + the `affilie` gate, so $request already carries an APPROVED
 * Affilie — the acting affiliate is resolved from that, NEVER from request input.
 */
class AffilieOrderController extends Controller
{
    /** Filament colour name → a storefront design-system tone the badge component understands. */
    private const STATUS_TONE = [
        'warning' => 'warn',
        'success' => 'ok',
        'danger'  => 'destructive',
        'info'    => 'info',
        'primary' => 'brand',
        'gray'    => 'neutral',
    ];

    private function affilie(Request $request): Affilie
    {
        $affilie = $request->attributes->get('affilie');

        return $affilie instanceof Affilie ? $affilie : $request->user()->affilie()->firstOrFail();
    }

    /**
     * GET /affilie/products?q= — the sellable catalogue for the create-order picker.
     *
     * Same query and payload shape as CreateAffilieCommande::searchAffilieProducts(): only products
     * with a real prix_affilie (affiliateProductQuery fails closed on null/0), in-stock first, each
     * carrying a resolved image URL, the affiliate base (the floor) and the suggested selling price.
     */
    public function products(Request $request): JsonResponse
    {
        $affilie = $this->affilie($request);
        $term    = trim((string) $request->query('q', ''));

        $products = AffilieCommandeResource::affiliateProductQuery()
            ->when($term !== '', function ($query) use ($term): void {
                $like = '%'.$term.'%';
                $query->where(fn ($q) => $q->where('designation_fr', 'like', $like)->orWhere('code_product', 'like', $like));
            })
            ->orderByRaw('CASE WHEN qte > 0 THEN 0 ELSE 1 END') // in-stock first
            ->orderBy('designation_fr')
            ->limit(24)
            ->get();

        return response()->json([
            'data' => $products->map(fn (Product $p): array => $this->productPayload($p, $affilie))->all(),
        ]);
    }

    /**
     * GET /affilie/orders — the affiliate's own orders, newest first, paginated.
     *
     * `commission` is the recorded promise from the ledger (the AffilieTransaction written at
     * creation), summed per order — never recomputed from lines, so it matches the dashboard.
     */
    public function orders(Request $request): JsonResponse
    {
        $affilie = $this->affilie($request);
        $perPage = min(50, max(5, (int) $request->query('per_page', 20)));

        $orders = Commande::query()
            ->where('affilie_id', $affilie->id)
            ->withCount('details as items_count')
            ->withSum(
                ['affilieTransactions as commission_sum' => fn ($q) => $q->where('type', AffilieTransactionType::Commission)],
                'amount'
            )
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'data' => collect($orders->items())->map(function (Commande $o): array {
                $etat = (string) ($o->etat ?? Commande::STATUS_NEW);

                return [
                    'id'           => (int) $o->id,
                    'numero'       => (string) ($o->numero ?? ('#'.$o->id)),
                    'created_at'   => optional($o->created_at)->toIso8601String(),
                    'status'       => $etat,
                    'status_label' => Commande::getStatusLabel($etat),
                    'status_tone'  => self::STATUS_TONE[Commande::getStatusColor($etat)] ?? 'neutral',
                    'customer'     => trim((string) ($o->livraison_nom ?? $o->nom ?? '')) ?: null,
                    'phone'        => $o->livraison_phone ?? $o->phone ?? null,
                    'ville'        => $o->livraison_ville ?? $o->ville ?? null,
                    'items_count'  => (int) ($o->items_count ?? 0),
                    'total'        => round((float) ($o->prix_ttc ?? 0), 3),
                    'commission'   => round((float) ($o->commission_sum ?? 0), 3),
                ];
            })->all(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page'    => $orders->lastPage(),
                'per_page'     => $orders->perPage(),
                'total'        => $orders->total(),
            ],
        ]);
    }

    /**
     * POST /affilie/orders — create an order for the affiliate's customer.
     *
     * Thin translator over AffilieOrderService::create(). The shape is validated here for a clean
     * 422 on obvious mistakes; the service is the authority on stock, self-dealing, the price floor
     * and the commission — and its AffilieOrderException carries the field/line to pin the error.
     */
    public function store(Request $request, AffilieOrderService $service): JsonResponse
    {
        $affilie = $this->affilie($request);

        $data = $request->validate([
            'lines'                 => ['required', 'array', 'min:1'],
            'lines.*.produit_id'    => ['required', 'integer', 'min:1'],
            'lines.*.qte'           => ['required', 'integer', 'min:1'],
            'lines.*.prix_unitaire' => ['required', 'numeric', 'min:0'],
            'customer'              => ['required', 'array'],
            'customer.nom'          => ['nullable', 'string', 'max:191'],
            'customer.phone'        => ['required', 'string', 'max:32'],
            'customer.email'        => ['nullable', 'email', 'max:191'],
            'customer.region'       => ['nullable', 'string', 'max:191'],
            'customer.ville'        => ['nullable', 'string', 'max:191'],
            'customer.adresse1'     => ['nullable', 'string', 'max:500'],
            'customer.code_postale' => ['nullable', 'string', 'max:20'],
            'customer.note'         => ['nullable', 'string', 'max:1000'],
            'shipping'              => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            $commande = $service->create(
                $affilie,
                $data['lines'],
                $data['customer'],
                (float) ($data['shipping'] ?? 0),
                $request->user()?->id,
            );
        } catch (AffilieOrderException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'field'   => $e->field,
                'line'    => $e->lineKey,
            ], 422);
        }

        $commission = (float) $commande->affilieTransactions()
            ->where('type', AffilieTransactionType::Commission)
            ->sum('amount');

        return response()->json([
            'id'         => (int) $commande->id,
            'numero'     => (string) ($commande->numero ?? ('#'.$commande->id)),
            'status'     => (string) $commande->etat,
            'total'      => round((float) $commande->prix_ttc, 3),
            'commission' => round($commission, 3),
        ], 201);
    }

    /** @return array{id:int,name:string,image:?string,base:float,suggested:float,stock:int,code:string} */
    private function productPayload(Product $p, ?Affilie $affilie): array
    {
        $base = (float) $p->affiliateBasePrice();
        $rel  = ImagePath::normalizeExisting($p->cover);
        $img  = $rel === null
            ? null
            : (ImagePath::isExternal($rel) ? $rel : Storage::disk('public')->url($rel));

        return [
            'id'        => (int) $p->id,
            'name'      => (string) ($p->designation_fr ?? ('Produit #'.$p->id)),
            'image'     => $img,
            'base'      => round($base, 3),
            'suggested' => $affilie ? round((float) $affilie->suggestedSellingPrice($p), 3) : round($base, 3),
            'stock'     => (int) ($p->qte ?? 0),
            'code'      => (string) ($p->code_product ?? ''),
        ];
    }
}
