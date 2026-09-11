<?php

namespace App\Filament\Affilie\Widgets;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Models\AffilieTransaction;
use App\Models\Commande;
use App\Models\Ticket;
use App\Services\PointsService;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

/**
 * The first thing an affiliate sees. It answers three questions, in the order they ask them:
 * what am I owed, what is still coming, and what have I sold.
 *
 * ── WHY THIS WIDGET CHANGED ─────────────────────────────────────────────────────────────────
 * It predates affiliates being able to create orders. It counted "Tickets boutique" — POS sales
 * made with their code, which is the boutique flow — and said nothing at all about the orders they
 * now enter themselves. An affiliate who had placed ten orders that week opened their dashboard
 * and saw a zero.
 *
 * ── THE TWO BALANCES ARE DIFFERENT NUMBERS AND BOTH MATTER ──────────────────────────────────
 * `current_balance` counts confirmed and paid rows only. A commission on an order that has shipped
 * but not yet been delivered is a PENDING row: real, promised, and deliberately absent from the
 * balance, because in a cash-on-delivery business the money does not exist until the parcel does.
 *
 * Showing only the balance makes the shop look like it is not counting their work. Showing them
 * added together would be a promise the shop has not made. So they are two stats, and the wording
 * says which is which: "Disponible" against "Sera versé après livraison".
 *
 * ── EVERY NUMBER COMES FROM THE LEDGER, NOT A RECOMPUTATION ─────────────────────────────────
 * The pending total sums the rows themselves rather than recalculating spreads from order lines.
 * A recomputation would answer with today's `prix_affilie` — so an administrator repricing a
 * product would silently rewrite what the affiliate believes they earned last week.
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
        $earned = (float) ($affilie->total_earned ?? 0);
        $paid = (float) ($affilie->total_paid ?? 0);

        // Promised but not yet earned: the parcel is still travelling.
        $pending = (float) AffilieTransaction::query()
            ->where('affilie_id', $affilie->id)
            ->where('type', AffilieTransactionType::Commission)
            ->where('status', AffilieTransactionStatus::Pending)
            ->sum('amount');

        $orders = Commande::query()->where('affilie_id', $affilie->id);

        $ordersTotal = (clone $orders)->count();
        $ordersDelivered = (clone $orders)
            ->whereIn('etat', PointsService::DELIVERED_STATUSES)
            ->count();
        $ordersOpen = $ordersTotal - $ordersDelivered;

        // Boutique tickets are a different channel and are only worth a tile to affiliates who
        // actually have any — a permanent zero teaches an affiliate to ignore the row it sits in.
        $ticketsSold = Ticket::query()
            ->where('affilie_id', $affilie->id)
            ->where('type', Ticket::TYPE_TICKET_CAISSE)
            ->count();

        $stats = [
            Stat::make('Solde actuel', $this->money($balance))
                ->description($balance < 0 ? 'À régulariser sur vos prochains gains' : 'Disponible au prochain versement')
                ->color($balance < 0 ? 'danger' : 'success'),

            Stat::make('En attente', $this->money($pending))
                ->description('Sera versé après livraison')
                ->color($pending > 0 ? 'warning' : 'gray'),

            Stat::make('Mes commandes', (string) $ordersTotal)
                ->description($ordersDelivered.' livrée(s) · '.$ordersOpen.' en cours'),

            Stat::make('Total gagné', $this->money($earned))
                ->description('Depuis le début'),

            Stat::make('Total payé', $this->money($paid))
                ->description('Versements reçus'),
        ];

        if ($ticketsSold > 0) {
            $stats[] = Stat::make('Tickets boutique', (string) $ticketsSold)
                ->description('Ventes en magasin avec votre code');
        }

        return $stats;
    }

    /** TND is three decimals everywhere in this codebase; the ledger stores decimal(14,3). */
    private function money(float $amount): string
    {
        return number_format($amount, 3, '.', ' ').' DT';
    }
}
