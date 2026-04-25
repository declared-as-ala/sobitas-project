<?php

namespace App\Filament\Resources\ClientResource\Pages;

use App\Filament\Resources\ClientResource;
use App\Jobs\SendSmsJob;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;

class CreateClient extends CreateRecord
{
    protected static string $resource = ClientResource::class;

    protected function afterCreate(): void
    {
        $client = $this->record;

        if ($client->sms && $client->phone_1) {
            $message = 'Bienvenue chez Sobitas ! Merci de nous faire confiance. Découvrez nos produits sur protein.tn';

            SendSmsJob::dispatch($client->phone_1, $message);

            Notification::make()
                ->title('SMS de bienvenue envoyé')
                ->body("Un SMS de bienvenue a été mis en file d'attente pour {$client->name}.")
                ->success()
                ->send();
        }
    }
}
