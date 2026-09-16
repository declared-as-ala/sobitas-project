<?php

namespace App\Http\Controllers\Api;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Http\Controllers\Controller;
use App\Models\Affilie;
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

        $pending = (float) AffilieTransaction::query()
            ->where('affilie_id', $a->id)
            ->where('type', AffilieTransactionType::Commission)
            ->where('status', AffilieTransactionStatus::Pending)
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
