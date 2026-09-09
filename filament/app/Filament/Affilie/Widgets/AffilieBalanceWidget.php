<?php

namespace App\Filament\Affilie\Widgets;

use App\Models\Ticket;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

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
        $sales = Ticket::query()
            ->where('affilie_id', $affilie->id)
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
