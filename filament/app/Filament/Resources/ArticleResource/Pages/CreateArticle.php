<?php

namespace App\Filament\Resources\ArticleResource\Pages;

use App\Filament\Resources\ArticleResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use Filament\Support\Enums\Width;

class CreateArticle extends CreateRecord
{
    protected static string $resource = ArticleResource::class;

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        return ArticleResource::mergeDescriptionEditorFormData($data);
    }

    public function getMaxContentWidth(): Width | string | null
    {
        return Width::Full;
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('preview')
                ->label('Aperçu')
                ->icon('heroicon-o-eye')
                ->color('info')
                ->url(function (): string {
                    $slug = trim((string) ($this->form->getRawState()['slug'] ?? ''));
                    if ($slug === '') {
                        return ArticleResource::BLOG_PUBLIC_BASE_URL;
                    }

                    return rtrim(ArticleResource::BLOG_PUBLIC_BASE_URL, '/') . '/' . $slug;
                })
                ->openUrlInNewTab()
                ->disabled(fn (): bool => trim((string) ($this->form->getRawState()['slug'] ?? '')) === ''),
        ];
    }

    // After creating, redirect to the edit page (continue editing workflow)
    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('edit', ['record' => $this->getRecord()]);
    }

    protected function getCreatedNotificationTitle(): ?string
    {
        return 'Article créé avec succès';
    }
}
