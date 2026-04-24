<?php

namespace App\Filament\Resources\ClientResource\Pages;

use App\Filament\Resources\ClientResource;
use App\Services\WebAccessInviteService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditClient extends EditRecord
{
    protected static string $resource = ClientResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('createWebAccess')
                ->label('Créer accès web')
                ->icon('heroicon-o-globe-alt')
                ->color('success')
                ->visible(fn (): bool => ! $this->record->user_id && filter_var($this->record->email, FILTER_VALIDATE_EMAIL))
                ->requiresConfirmation()
                ->modalHeading('Créer un compte web pour ce client ?')
                ->modalDescription('Un e-mail avec un lien pour choisir un mot de passe sera envoyé (boutique protein.tn).')
                ->action(function (WebAccessInviteService $invite): void {
                    try {
                        $invite->invite($this->record->fresh());
                        Notification::make()
                            ->title('Accès web créé')
                            ->body('E-mail de réinitialisation envoyé au client.')
                            ->success()
                            ->send();
                        $this->record->refresh();
                        $this->refreshFormData(['user_id']);
                    } catch (\Throwable $e) {
                        Notification::make()
                            ->title('Impossible de créer l’accès')
                            ->body($e->getMessage())
                            ->danger()
                            ->send();
                    }
                }),
            Actions\DeleteAction::make(),
        ];
    }
}
