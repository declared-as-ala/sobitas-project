<?php

namespace App\Filament\Resources\ArticleResource\Pages;

use App\Filament\Resources\ArticleResource;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Enums\Width;

class EditArticle extends EditRecord
{
    protected static string $resource = ArticleResource::class;

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

            // Preview in new tab
            Actions\Action::make('preview')
                ->label('Aperçu')
                ->icon('heroicon-o-eye')
                ->color('info')
                ->url(fn (): string => '/blog/' . $this->record->slug)
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
