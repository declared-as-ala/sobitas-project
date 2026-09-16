<?php

namespace App\Filament\Affilie\Widgets;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Models\AffilieTransaction;
use App\Models\Commande;
use App\Services\AffilieTransactionService;
use App\Services\PointsService;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Carbon;

/**
 * The first thing an affiliate sees. It answers, in the order they ask them: what can I be paid
 * right now, what is confirmed, what is still coming, how am I doing this month, and what have I
 * sold overall.
 *
 * ── THE THREE MONEY STATES ARE DIFFERENT NUMBERS AND ALL MATTER ─────────────────────────────
 *  • PAYABLE — current_balance minus commission on orders the courier has not yet remitted
 *    (AffilieTransactionService::payableBalance). This is the honest "you can be paid this".
 *  • SOLDE — current_balance: confirmed and cumulated, held part included.
 *  • EN ATTENTE — pending commission rows: earned on paper, absent from the balance until the
 *    parcel is delivered, because in a cash-on-delivery business the money does not exist yet.
 *
 * ── EVERY NUMBER COMES FROM THE LEDGER, NOT A RECOMPUTATION ─────────────────────────────────
 * Sums read the rows themselves rather than recalculating spreads from order lines. A recompute
 * would answer with today's prix_affilie, so a repricing would silently rewrite last week's gains.
 */
class AffilieBalanceWidget extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $affilie = auth()->user()?->affilie?->fresh();
        if (! $affilie) {
            return [];
        }

        $balance = (float) ($affilie->current_balance ?? 0);
        $earned  = (float) ($affilie->total_earned ?? 0);
        $paid    = (float) ($affilie->total_paid ?? 0);

        // Promised but not yet earned: the parcel is still travelling.
        $pending = (float) AffilieTransaction::query()
            ->where('affilie_id', $affilie->id)
            ->where('type', AffilieTransactionType::Commission)
            ->where('status', AffilieTransactionStatus::Pending)
            ->sum('amount');

        $service = app(AffilieTransactionService::class);
        $payable = $service->payableBalance($affilie);
        // Confirmed money the courier still holds (COD not remitted): the gap balance - payable.
        $held = max(0.0, round($balance - $payable, 3));

        // Six-month confirmed-earnings series → sparklines + this month's figure.
        $series    = $this->monthlyEarnings((int) $affilie->id, 6);
        $thisMonth = (float) (end($series) ?: 0.0);

        $orders          = Commande::query()->where('affilie_id', $affilie->id);
        $ordersTotal     = (clone $orders)->count();
        $ordersDelivered = (clone $orders)->whereIn('etat', PointsService::DELIVERED_STATUSES)->count();
        $ordersOpen      = max(0, $ordersTotal - $ordersDelivered);
        $ordersThisMonth = (clone $orders)->where('created_at', '>=', Carbon::now()->startOfMonth())->count();

        return [
            Stat::make('Payable maintenant', $this->money($payable))
                ->description($held > 0 ? $this->money($held) . ' en attente de remise du transporteur' : 'Prêt pour le prochain versement')
                ->descriptionIcon('heroicon-m-banknotes')
                ->color($payable > 0 ? 'success' : 'gray')
                ->chart($series),

            Stat::make('Solde confirmé', $this->money($balance))
                ->description($balance < 0 ? 'À régulariser sur vos prochains gains' : 'Total confirmé et cumulé')
                ->descriptionIcon($balance < 0 ? 'heroicon-m-exclamation-triangle' : 'heroicon-m-wallet')
                ->color($balance < 0 ? 'danger' : ($balance > 0 ? 'success' : 'gray')),

            Stat::make('En attente de livraison', $this->money($pending))
                ->description('Sera confirmé après livraison')
                ->descriptionIcon('heroicon-m-truck')
                ->color($pending > 0 ? 'warning' : 'gray'),

            Stat::make('Gagné ce mois', $this->money($thisMonth))
                ->description($ordersThisMonth . ' commande(s) ce mois-ci')
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->color('primary')
                ->chart($series),

            Stat::make('Mes commandes', (string) $ordersTotal)
                ->description($ordersDelivered . ' livrée(s) · ' . $ordersOpen . ' en cours')
                ->descriptionIcon('heroicon-m-shopping-bag')
                ->color('info'),

            Stat::make('Total gagné', $this->money($earned))
                ->description('Déjà versé : ' . $this->money($paid))
                ->descriptionIcon('heroicon-m-trophy')
                ->color('gray'),
        ];
    }

    /**
     * Confirmed + paid commission, bucketed by month, for the last $monthsBack months (oldest
     * first). Drives both the sparklines and the "this month" figure so a single query serves both.
     *
     * @return array<int, float>
     */
    private function monthlyEarnings(int $affilieId, int $monthsBack): array
    {
        $start = Carbon::now()->startOfMonth()->subMonths($monthsBack - 1);

        $buckets = [];
        for ($i = 0; $i < $monthsBack; $i++) {
            $buckets[(clone $start)->addMonths($i)->format('Y-m')] = 0.0;
        }

        $rows = AffilieTransaction::query()
            ->where('affilie_id', $affilieId)
            ->where('type', AffilieTransactionType::Commission)
            ->whereIn('status', [AffilieTransactionStatus::Confirmed, AffilieTransactionStatus::Paid])
            ->where('created_at', '>=', $start)
            ->get(['amount', 'created_at']);

        foreach ($rows as $row) {
            $key = Carbon::parse($row->created_at)->format('Y-m');
            if (array_key_exists($key, $buckets)) {
                $buckets[$key] += (float) $row->amount;
            }
        }

        return array_map(fn ($v) => round($v, 3), array_values($buckets));
    }

    /** TND is three decimals everywhere in this codebase; the ledger stores decimal(14,3). */
    private function money(float $amount): string
    {
        return number_format($amount, 3, '.', ' ') . ' DT';
    }
}
