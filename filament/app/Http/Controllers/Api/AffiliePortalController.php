<?php

namespace App\Http\Controllers\Api;

use App\Enums\AffiliePayoutStatus;
use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Http\Controllers\Controller;
use App\Models\Affilie;
use App\Models\AffiliePayout;
use App\Models\AffilieTransaction;
use App\Models\Commande;
use App\Services\AffilieTransactionService;
use App\Services\PointsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * The read side of the /affiliate portal (protein.tn/affiliate/*). Every route here is behind
 * `auth:sanctum` + the `affilie` gate, so $request already carries an APPROVED Affilie. All figures
 * are read from the same ledger/services the Filament widgets use — never recomputed from order
 * lines, so the API and the panel can never disagree about the money.
 */
class AffiliePortalController extends Controller
{
    private function affilie(Request $request): Affilie
    {
        $affilie = $request->attributes->get('affilie');

        return $affilie instanceof Affilie ? $affilie : $request->user()->affilie()->firstOrFail();
    }

    /** GET /affilie/me — identity + status, used by the frontend affiliate guard. */
    public function me(Request $request): JsonResponse
    {
        $a = $this->affilie($request)->fresh();

        return response()->json([
            'id'           => (int) $a->id,
            'name'         => (string) ($a->name ?? ''),
            'status'       => $a->status?->value,
            'type'         => $a->type?->value,
            'reference'    => $a->reference,
            'subdomain'    => $a->subdomain,
            'is_affiliate' => true,
        ]);
    }

    /** GET /affilie/dashboard — balances, this-month, orders, a 6-month chart and referral handles. */
    public function dashboard(Request $request): JsonResponse
    {
        $a = $this->affilie($request)->fresh();

        $balance = (float) ($a->current_balance ?? 0);
        $earned  = (float) ($a->total_earned ?? 0);
        $paid    = (float) ($a->total_paid ?? 0);
        $payable = app(AffilieTransactionService::class)->payableBalance($a);
        $held    = max(0.0, round($balance - $payable, 3));

        // "En attente de livraison" = pending commissions still in flight. A commission whose order
        // has since been cancelled/returned must NEVER show here, even if its row was left Pending by
        // a cancel path that bypassed the observer (bulk/raw update, import). This defensive exclusion
        // makes the figure self-heal: the standard cancel already flips the row to Cancelled, and this
        // guarantees a cancelled order can never inflate "pending" regardless. Ticket commissions
        // (no commande_id) are unaffected — whereNotExists keeps them counted.
        $pending = (float) AffilieTransaction::query()
            ->where('affilie_transactions.affilie_id', $a->id)
            ->where('type', AffilieTransactionType::Commission)
            ->where('status', AffilieTransactionStatus::Pending)
            ->whereNotExists(fn ($q) => $q
                ->selectRaw('1')
                ->from('commandes')
                ->whereColumn('commandes.id', 'affilie_transactions.commande_id')
                ->whereIn('commandes.etat', PointsService::CANCELLED_STATUSES))
            ->sum('amount');

        $orders          = Commande::query()->where('affilie_id', $a->id);
        $ordersTotal     = (clone $orders)->count();
        $ordersDelivered = (clone $orders)->whereIn('etat', PointsService::DELIVERED_STATUSES)->count();
        $ordersOpen      = max(0, $ordersTotal - $ordersDelivered);
        $ordersThisMonth = (clone $orders)->where('created_at', '>=', Carbon::now()->startOfMonth())->count();

        [$labels, $confirmedSeries, $pendingSeries, $thisMonthEarnings] = $this->monthlyEarnings((int) $a->id, 6);

        $code = null;
        try {
            $code = $a->codes()->orderByDesc('id')->value('code') ?: null;
        } catch (\Throwable) {
            $code = null;
        }
        $sub  = trim((string) ($a->subdomain ?? ''));
        $link = $sub !== '' ? 'https://'.$sub.'.protein.tn' : null;

        return response()->json([
            'balances' => [
                'payable'   => $payable,
                'held'      => $held,
                'confirmed' => round($balance, 3),
                'pending'   => round($pending, 3),
                'earned'    => round($earned, 3),
                'paid'      => round($paid, 3),
            ],
            'this_month' => [
                'earnings' => $thisMonthEarnings,
                'orders'   => $ordersThisMonth,
            ],
            'orders' => [
                'total'     => $ordersTotal,
                'delivered' => $ordersDelivered,
                'open'      => $ordersOpen,
            ],
            'chart' => [
                'labels'    => $labels,
                'confirmed' => $confirmedSeries,
                'pending'   => $pendingSeries,
            ],
            'referral' => [
                'link'      => $link,
                'code'      => $code,
                'reference' => $a->reference,
            ],
            'next_payout' => $this->nextFridayLabel(),
        ]);
    }

    /** GET /affilie/commissions — the commission ledger (commission + adjustments), newest first. */
    public function commissions(Request $request): JsonResponse
    {
        $a       = $this->affilie($request);
        $perPage = min(50, max(5, (int) $request->query('per_page', 20)));

        // Qualify affilie_id: the $rows query leftJoins `commandes`, which ALSO has an affilie_id
        // column, so an unqualified filter is an ambiguous-column SQL error (1052) → 500 → the
        // "Impossible de charger vos commissions" banner. The qualified column is valid with or
        // without the join, so the summary sums below (which clone $base un-joined) still work.
        $base = AffilieTransaction::query()
            ->where('affilie_transactions.affilie_id', $a->id)
            ->whereIn('type', [
                AffilieTransactionType::Commission,
                AffilieTransactionType::Adjustment,
                AffilieTransactionType::Reversal,
            ]);

        $rows = (clone $base)
            ->leftJoin('commandes', 'commandes.id', '=', 'affilie_transactions.commande_id')
            ->orderByDesc('affilie_transactions.id')
            ->paginate($perPage, ['affilie_transactions.*', 'commandes.numero as commande_numero']);

        $sum = fn (AffilieTransactionStatus $s): float => round((float) (clone $base)->where('status', $s)->sum('amount'), 3);

        return response()->json([
            'summary' => [
                'pending'   => $sum(AffilieTransactionStatus::Pending),
                'confirmed' => $sum(AffilieTransactionStatus::Confirmed),
                'paid'      => $sum(AffilieTransactionStatus::Paid),
            ],
            'data' => collect($rows->items())->map(function (AffilieTransaction $t): array {
                [$label, $tone] = $this->txStatusMeta($t->status);

                return [
                    'id'           => (int) $t->id,
                    'type'         => $t->type?->value,
                    'type_label'   => $this->txTypeLabel($t->type),
                    'amount'       => round((float) $t->amount, 3),
                    'status'       => $t->status?->value,
                    'status_label' => $label,
                    'status_tone'  => $tone,
                    'description'  => (string) ($t->description ?? ''),
                    'commande'     => $t->getAttribute('commande_numero') ?: null,
                    'created_at'   => optional($t->created_at)->toIso8601String(),
                ];
            })->all(),
            'meta' => $this->pageMeta($rows),
        ]);
    }

    /** GET /affilie/payments — the affiliate's payout history (AffiliePayout), newest first. */
    public function payments(Request $request): JsonResponse
    {
        $a       = $this->affilie($request);
        $perPage = min(50, max(5, (int) $request->query('per_page', 20)));

        $base = AffiliePayout::query()->where('affilie_id', $a->id);
        $rows = (clone $base)->orderByDesc('id')->paginate($perPage);

        $sum = fn (AffiliePayoutStatus $s): float => round((float) (clone $base)->where('status', $s)->sum('amount'), 3);

        return response()->json([
            'summary' => [
                'paid'    => $sum(AffiliePayoutStatus::Paid),
                'pending' => $sum(AffiliePayoutStatus::Pending),
            ],
            'data' => collect($rows->items())->map(function (AffiliePayout $p): array {
                [$label, $tone] = $this->payoutStatusMeta($p->status);

                return [
                    'id'           => (int) $p->id,
                    'amount'       => round((float) $p->amount, 3),
                    'status'       => $p->status?->value,
                    'status_label' => $label,
                    'status_tone'  => $tone,
                    'reference'    => $p->payment_reference ?: null,
                    'paid_at'      => optional($p->paid_at)->toIso8601String(),
                    'created_at'   => optional($p->created_at)->toIso8601String(),
                ];
            })->all(),
            'meta' => $this->pageMeta($rows),
        ]);
    }

    /** GET /affilie/profile — contact fields (editable) + payout/status fields (view-only). */
    public function profile(Request $request): JsonResponse
    {
        return response()->json($this->profilePayload($this->affilie($request)->fresh()));
    }

    /**
     * PUT /affilie/profile — the affiliate edits their OWN contact details only.
     *
     * The whitelist is deliberate and short: name/business/email/phone/address/city. Payout details
     * (payment_method, bank_name, rib_or_iban, payout_notes) are shown but NOT writable here — they
     * stay admin-managed so a compromised or mistaken portal session cannot redirect a payout. Nor
     * are status, commission_rate or the balances ever touched from the portal.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $a = $this->affilie($request);

        $data = $request->validate([
            'name'          => ['nullable', 'string', 'max:191'],
            'business_name' => ['nullable', 'string', 'max:191'],
            'email'         => ['nullable', 'email', 'max:191'],
            'phone'         => ['nullable', 'string', 'max:32'],
            'address'       => ['nullable', 'string', 'max:500'],
            'city'          => ['nullable', 'string', 'max:191'],
        ]);

        $a->fill($data);
        $a->save();

        return response()->json($this->profilePayload($a->fresh()));
    }

    /** @return array<string, mixed> */
    private function profilePayload(Affilie $a): array
    {
        return [
            // Editable (contact)
            'name'          => $a->name,
            'business_name' => $a->business_name,
            'email'         => $a->email,
            'phone'         => $a->phone,
            'address'       => $a->address,
            'city'          => $a->city,
            // View-only (admin-managed)
            'reference'      => $a->reference,
            'type'           => $a->type?->value,
            'status'         => $a->status?->value,
            'payment_method' => $a->payment_method,
            'bank_name'      => $a->bank_name,
            'rib_or_iban'    => $a->rib_or_iban,
        ];
    }

    /** @return array{label:string, tone:string} as a positional [label, tone]. */
    private function txStatusMeta(?AffilieTransactionStatus $s): array
    {
        return match ($s) {
            AffilieTransactionStatus::Pending   => ['En attente', 'warn'],
            AffilieTransactionStatus::Confirmed => ['Confirmée', 'info'],
            AffilieTransactionStatus::Paid      => ['Payée', 'ok'],
            AffilieTransactionStatus::Cancelled => ['Annulée', 'destructive'],
            default                             => ['—', 'neutral'],
        };
    }

    private function txTypeLabel(?AffilieTransactionType $t): string
    {
        return match ($t) {
            AffilieTransactionType::Commission => 'Commission',
            AffilieTransactionType::Adjustment => 'Ajustement',
            AffilieTransactionType::Reversal   => 'Annulation',
            AffilieTransactionType::Payment    => 'Paiement',
            default                            => '—',
        };
    }

    private function payoutStatusMeta(?AffiliePayoutStatus $s): array
    {
        return match ($s) {
            AffiliePayoutStatus::Pending   => ['En attente', 'warn'],
            AffiliePayoutStatus::Paid      => ['Payé', 'ok'],
            AffiliePayoutStatus::Cancelled => ['Annulé', 'destructive'],
            default                        => ['—', 'neutral'],
        };
    }

    /** @param \Illuminate\Pagination\LengthAwarePaginator<mixed> $p */
    private function pageMeta($p): array
    {
        return [
            'current_page' => $p->currentPage(),
            'last_page'    => $p->lastPage(),
            'per_page'     => $p->perPage(),
            'total'        => $p->total(),
        ];
    }

    /**
     * Confirmed vs pending commission per month for the last $monthsBack months (oldest first).
     *
     * @return array{0: list<string>, 1: list<float>, 2: list<float>, 3: float} labels, confirmed[], pending[], thisMonthConfirmed
     */
    private function monthlyEarnings(int $affilieId, int $monthsBack): array
    {
        $start = Carbon::now()->startOfMonth()->subMonths($monthsBack - 1);

        $confirmed = [];
        $pending   = [];
        $labels    = [];
        for ($i = 0; $i < $monthsBack; $i++) {
            $m = (clone $start)->addMonths($i);
            $labels[] = ucfirst($m->locale('fr')->isoFormat('MMM'));
            $confirmed[$m->format('Y-m')] = 0.0;
            $pending[$m->format('Y-m')]   = 0.0;
        }

        $rows = AffilieTransaction::query()
            ->where('affilie_id', $affilieId)
            ->where('type', AffilieTransactionType::Commission)
            ->where('created_at', '>=', $start)
            ->get(['amount', 'status', 'created_at']);

        foreach ($rows as $row) {
            $key    = Carbon::parse($row->created_at)->format('Y-m');
            $status = $row->status instanceof AffilieTransactionStatus
                ? $row->status
                : AffilieTransactionStatus::tryFrom((string) $row->status);

            if ($status === AffilieTransactionStatus::Pending) {
                if (array_key_exists($key, $pending)) {
                    $pending[$key] += (float) $row->amount;
                }
            } elseif (in_array($status, [AffilieTransactionStatus::Confirmed, AffilieTransactionStatus::Paid], true)) {
                if (array_key_exists($key, $confirmed)) {
                    $confirmed[$key] += (float) $row->amount;
                }
            }
        }

        $confirmedVals = array_map(fn ($v) => round($v, 3), array_values($confirmed));
        $pendingVals   = array_map(fn ($v) => round($v, 3), array_values($pending));
        $thisMonth     = (float) (end($confirmedVals) ?: 0.0);

        return [$labels, $confirmedVals, $pendingVals, $thisMonth];
    }

    private function nextFridayLabel(): string
    {
        $now    = Carbon::now();
        $friday = $now->isFriday() ? Carbon::today() : $now->copy()->next(Carbon::FRIDAY);

        return $friday->format('d/m');
    }
}
