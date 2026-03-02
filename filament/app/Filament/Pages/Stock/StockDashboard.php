<?php

namespace App\Filament\Pages\Stock;

use Filament\Pages\Page;

class StockDashboard extends Page
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-squares-2x2';

    protected static ?string $navigationLabel = 'Tableau de bord stock';

    protected static ?string $title = 'Gestion de stock — Tableau de bord';

    protected static string | \UnitEnum | null $navigationGroup = 'Gestion de stock';

    protected static ?int $navigationSort = 1;

    protected string $view = 'filament.pages.stock.stock-dashboard';

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'stock';
    }

    }
