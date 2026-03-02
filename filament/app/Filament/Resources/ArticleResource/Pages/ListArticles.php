<?php

namespace App\Filament\Resources\ArticleResource\Pages;

use App\Filament\Resources\ArticleResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListArticles extends ListRecords
{
    protected static string $resource = ArticleResource::class;

    public function getBreadcrumbs(): array
    {
        return [
            ArticleResource::getUrl('index') => 'Articles',
            null => 'Liste',
        ];
    }

    public function getTitle(): string
    {
        return 'Articles';
    }

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }
}
