<?php

namespace App\Filament\Resources\ArticleResource\Pages;

use App\Filament\Resources\ArticleResource;
use Filament\Resources\Pages\CreateRecord;
use Filament\Support\Enums\Width;

class CreateArticle extends CreateRecord
{
    protected static string $resource = ArticleResource::class;

    // Use the full page width — editorial workspace needs maximum horizontal space
    public function getMaxContentWidth(): Width | string | null
    {
        return Width::Full;
    }

    // After creating, go to the edit page (standard editorial workflow)
    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('edit', ['record' => $this->getRecord()]);
    }

    protected function getCreatedNotificationTitle(): ?string
    {
        return 'Article créé avec succès';
    }
}
