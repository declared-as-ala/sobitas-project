<?php

namespace App\Filament\Resources\ArticleResource\Pages;

use App\Filament\Resources\ArticleResource;
use App\Filament\Support\ArticleDescriptionHtml;
use Filament\Actions;
use Illuminate\Support\Facades\Schema;
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
        // FIELD_HTML_STAGING is dehydrated(false), so read it from raw state — otherwise HTML-mode saves wipe `description`.
        $raw = $this->form->getRawState();
        $data[ArticleDescriptionHtml::FIELD_HTML_STAGING] = (string) ($raw[ArticleDescriptionHtml::FIELD_HTML_STAGING] ?? '');

        if (! array_key_exists(ArticleDescriptionHtml::FIELD_EDITOR_MODE, $data)
            && array_key_exists(ArticleDescriptionHtml::FIELD_EDITOR_MODE, $raw)) {
            $data[ArticleDescriptionHtml::FIELD_EDITOR_MODE] = $raw[ArticleDescriptionHtml::FIELD_EDITOR_MODE];
        }

        $data = ArticleResource::mergeDescriptionEditorFormData($data);

        if (Schema::hasColumn('articles', 'related_shop_category_slugs')) {
            $raw = $this->form->getRawState();
            $rows = $raw['related_shop_slugs_repeater'] ?? [];
            $slugs = [];
            foreach ((array) $rows as $row) {
                if (is_array($row) && isset($row['slug'])) {
                    $s = trim((string) $row['slug']);
                    if ($s !== '') {
                        $slugs[] = $s;
                    }
                }
            }
            $data['related_shop_category_slugs'] = array_values(array_unique($slugs));
        }

        return $data;
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
