<?php

namespace App\Filament\Resources\SousCategoryResource\Pages;

use App\Filament\Resources\SousCategoryResource;
use App\Filament\Widgets\SousCategoryStatsWidget;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListSousCategories extends ListRecords
{
    protected static string $resource = SousCategoryResource::class;

    public function getHeading(): string
    {
        return 'Sous-catégories';
    }

    public function getSubheading(): ?string
    {
        return 'Structurez le catalogue : créez et gérez les sous-catégories par famille de produits.';
    }

    protected function getHeaderWidgets(): array
    {
        return [
            SousCategoryStatsWidget::class,
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()
                ->label('Nouvelle sous-catégorie')
                ->icon('heroicon-o-plus'),
        ];
    }
}
