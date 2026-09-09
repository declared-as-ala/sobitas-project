<?php

namespace App\Filament\Affilie\Pages;

use App\Filament\Affilie\Widgets\AffilieBalanceWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class AffilieDashboard extends BaseDashboard
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-home';

    protected static ?string $navigationLabel = 'Tableau de bord';

    protected static ?int $navigationSort = -20;

    protected static ?string $title = 'Espace affilié';

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
