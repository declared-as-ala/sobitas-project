<?php

namespace App\Filament\Resources\ArticleResource\Pages;

use App\Filament\Resources\ArticleResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Enums\Width;

class EditArticle extends EditRecord
{
    protected static string $resource = ArticleResource::class;

    // Use the full page width — editorial workspace needs maximum horizontal space
    public function getMaxContentWidth(): Width | string | null
    {
        return Width::Full;
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('view_list')
                ->label('Retour à la liste')
                ->icon('heroicon-o-arrow-left')
                ->color('gray')
                ->url(ArticleResource::getUrl('index')),

            Actions\DeleteAction::make()
                ->label('Supprimer')
                ->color('danger'),
        ];
    }

    protected function getSavedNotificationTitle(): ?string
    {
        return 'Article enregistré';
    }
}
