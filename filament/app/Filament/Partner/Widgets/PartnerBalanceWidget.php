<?php

namespace App\Filament\Partner\Widgets;

use App\Models\Ticket;
use App\Services\PartnerCommissionService;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class PartnerBalanceWidget extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $partner = auth()->user()?->partner;
        if (! $partner) {
            return [];
        }

        $balance = app(PartnerCommissionService::class)->getAvailableBalance($partner);
        $sales = Ticket::query()
            ->where('partner_id', $partner->id)
            ->where('type', Ticket::TYPE_TICKET_CAISSE)
            ->count();

        return [
            Stat::make('Solde disponible', number_format($balance, 3, '.', ' ') . ' DT')
                ->description('Après commissions, paiements et ajustements'),
            Stat::make('Tickets boutique', (string) $sales)
                ->description('Attribués à votre compte'),
        ];
    }
}
