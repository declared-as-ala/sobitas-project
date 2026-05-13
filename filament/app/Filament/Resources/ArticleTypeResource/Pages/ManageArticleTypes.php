<?php

namespace App\Filament\Resources\ArticleTypeResource\Pages;

use App\Filament\Resources\ArticleTypeResource;
use Filament\Actions;
use Filament\Resources\Pages\ManageRecords;

class ManageArticleTypes extends ManageRecords
{
    protected static string $resource = ArticleTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()
                ->label('Ajouter un type')
                ->slideOver(),
        ];
    }
}
