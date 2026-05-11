<?php

namespace App\Filament\Resources\ArticleResource\Pages;

use App\Filament\Resources\ArticleResource;
use App\Filament\Support\ArticleDescriptionHtml;
use App\Models\Article;
use Filament\Actions;
use Illuminate\Support\Facades\Schema;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Enums\Width;

class EditArticle extends EditRecord
{
    protected static string $resource = ArticleResource::class;

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['_slug_auto_source'] = $data['designation_fr'] ?? '';
        $rawDescription = $data['description'] ?? null;
        $data[ArticleDescriptionHtml::FIELD_HTML_STAGING] = is_string($rawDescription)
            ? $rawDescription
            : (is_array($rawDescription) ? ArticleDescriptionHtml::toStoredHtml($rawDescription) : '');
        $data[ArticleDescriptionHtml::FIELD_EDITOR_MODE] = ArticleDescriptionHtml::MODE_VISUAL;

        if (array_key_exists('description', $data)) {
            $data['description'] = Article::prepareDescriptionForRichEditorForm($data['description']);
        }

        if (Schema::hasColumn('articles', 'related_shop_category_slugs')) {
            $slugs = $data['related_shop_category_slugs'] ?? [];
            $list = is_array($slugs) ? $slugs : [];
            if ($list !== [] && isset($list[0]) && is_string($list[0])) {
                $data['related_shop_slugs_repeater'] = array_map(static fn (string $s): array => ['slug' => $s], $list);
            } else {
                $data['related_shop_slugs_repeater'] = [];
            }
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeSave(array $data): array
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
            // Back to list
            Actions\Action::make('back')
                ->label('Retour')
                ->icon('heroicon-o-arrow-left')
                ->color('gray')
                ->url(ArticleResource::getUrl('index')),

            // Quick "set as draft" — flips publier without going through the full save
            Actions\Action::make('set_draft')
                ->label('Brouillon')
                ->icon('heroicon-o-archive-box')
                ->color('gray')
                ->action(function (): void {
                    $this->record->update(['publier' => false]);
                    $this->refreshFormData(['publier']);
                    Notification::make()
                        ->title('Enregistré comme brouillon')
                        ->body('L\'article n\'est plus visible sur le site.')
                        ->success()
                        ->send();
                }),

            // Preview on public site (uses current form slug when possible)
            Actions\Action::make('preview')
                ->label('Aperçu')
                ->icon('heroicon-o-eye')
                ->color('info')
                ->url(function (): string {
                    $slug = trim((string) ($this->form->getRawState()['slug'] ?? $this->record->slug ?? ''));
                    if ($slug === '') {
                        return ArticleResource::BLOG_PUBLIC_BASE_URL;
                    }

                    return rtrim(ArticleResource::BLOG_PUBLIC_BASE_URL, '/') . '/' . $slug;
                })
                ->openUrlInNewTab(),

            // Danger: delete
            Actions\DeleteAction::make()
                ->label('Supprimer')
                ->color('danger'),
        ];
    }

    protected function getSavedNotificationTitle(): ?string
    {
        return 'Article enregistré avec succès';
    }
}
