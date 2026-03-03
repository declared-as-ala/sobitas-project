<?php

namespace App\Observers;

use App\Filament\Resources\CommandeResource;
use App\Models\Commande;
use App\Models\User;
use Filament\Notifications\Actions\Action as NotificationAction;
use Filament\Notifications\Notification;

class CommandeObserver
{
    /**
     * Notify all panel users when a new commande is created.
     */
    public function created(Commande $commande): void
    {
        $recipients = User::all();
        if ($recipients->isEmpty()) {
            return;
        }

        $url = CommandeResource::getUrl('edit', ['record' => $commande]);
        $title = 'Nouvelle commande';
        $body = 'Commande #' . ($commande->numero ?? $commande->id) . ' – ' . trim(($commande->nom ?? '') . ' ' . ($commande->prenom ?? ''));

        foreach ($recipients as $user) {
            Notification::make()
                ->title($title)
                ->body($body)
                ->success()
                ->actions([
                    NotificationAction::make('open')
                        ->label('Ouvrir')
                        ->url($url),
                ])
                ->sendToDatabase($user);
        }
    }
}
