<?php

namespace App\Filament\Partner\Widgets;

use App\Models\Ticket;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class PartnerBalanceWidget extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $partner = auth()->user()?->partner?->fresh();
        if (! $partner) {
            return [];
        }

        $balance = (float) ($partner->current_balance ?? 0);
        $earned = (float) ($partner->total_earned ?? 0);
        $paid = (float) ($partner->total_paid ?? 0);
        $sales = Ticket::query()
            ->where('partner_id', $partner->id)
            ->where('type', Ticket::TYPE_TICKET_CAISSE)
            ->count();

        return [
            Stat::make('Solde actuel', number_format($balance, 3, '.', ' ') . ' DT')
                ->description('Disponible'),
            Stat::make('Total gagné', number_format($earned, 3, '.', ' ') . ' DT')
                ->description('Commissions nettes'),
            Stat::make('Total payé', number_format($paid, 3, '.', ' ') . ' DT')
                ->description('Paiements reçus'),
            Stat::make('Tickets boutique', (string) $sales)
                ->description('Avec votre code'),
        ];
    }
}
