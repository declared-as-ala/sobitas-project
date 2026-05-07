<?php

namespace App\Filament\Partner\Pages;

use App\Filament\Partner\Widgets\PartnerBalanceWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class PartnerDashboard extends BaseDashboard
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-home';

    protected static ?string $navigationLabel = 'Tableau de bord';

    protected static ?int $navigationSort = -20;

    protected static ?string $title = 'Espace partenaire';

    public function getWidgets(): array
    {
        return [
            PartnerBalanceWidget::class,
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
