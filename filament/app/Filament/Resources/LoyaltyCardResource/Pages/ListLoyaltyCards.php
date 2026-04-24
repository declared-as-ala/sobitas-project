<?php

namespace App\Filament\Resources\LoyaltyCardResource\Pages;

use App\Filament\Resources\LoyaltyCardResource;
use App\Models\Client;
use App\Services\LoyaltyService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;

class ListLoyaltyCards extends ListRecords
{
    protected static string $resource = LoyaltyCardResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('issue_card')
                ->label('Émettre une carte')
                ->icon('heroicon-o-plus-circle')
                ->form([
                    \Filament\Forms\Components\Select::make('client_id')
                        ->label('Client')
                        ->options(
                            Client::orderBy('name')->pluck('name', 'id')
                                ->filter(fn ($name, $id) => ! \App\Models\LoyaltyCard::where('client_id', $id)->exists())
                        )
                        ->searchable()
                        ->required(),
                ])
                ->action(function (array $data) {
                    $client = Client::find($data['client_id']);
                    if ($client) {
                        app(LoyaltyService::class)->getOrCreateCard($client);
                        Notification::make()->title('Carte créée avec succès')->success()->send();
                    }
                }),
        ];
    }
}
