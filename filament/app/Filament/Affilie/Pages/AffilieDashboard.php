<?php

namespace App\Filament\Affilie\Pages;

use App\Filament\Affilie\Widgets\AffilieBalanceWidget;
use Filament\Actions\Action;
use Filament\Pages\Dashboard as BaseDashboard;

class AffilieDashboard extends BaseDashboard
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-home';

    protected static ?string $navigationLabel = 'Tableau de bord';

    protected static ?int $navigationSort = -20;

    protected static ?string $title = 'Espace affilié';

    public function getSubheading(): string | \Illuminate\Contracts\Support\Htmlable | null
    {
        $name = auth()->user()?->affilie?->name ?? auth()->user()?->name ?? 'à vous';
        $now = \Illuminate\Support\Carbon::now();
        $payoutDate = ($now->isFriday()
            ? \Illuminate\Support\Carbon::today()
            : $now->next(\Carbon\CarbonInterface::FRIDAY))->format('d/m');

        return "Bonjour {$name} — prochain versement vendredi {$payoutDate}.";
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('creer_commande')
                ->label('Créer une commande')
                ->icon('heroicon-o-plus')
                ->url(\App\Filament\Affilie\Resources\AffilieCommandeResource::getUrl('create')),
            Action::make('mes_commissions')
                ->label('Mes commissions')
                ->color('gray')
                ->icon('heroicon-o-banknotes')
                ->url(\App\Filament\Affilie\Resources\AffilieLedgerReadResource::getUrl('index')),
            Action::make('mes_paiements')
                ->label('Mes paiements')
                ->color('gray')
                ->icon('heroicon-o-credit-card')
                ->url(\App\Filament\Affilie\Resources\AffiliePaymentReadResource::getUrl('index')),
        ];
    }

    public function getWidgets(): array
    {
        return [
            AffilieBalanceWidget::class,
        ];
    }

    public function getColumns(): int | array
    {
        return [
            'default' => 1,
            'md' => 2,
            'xl' => 2,
        ];
    }
}
