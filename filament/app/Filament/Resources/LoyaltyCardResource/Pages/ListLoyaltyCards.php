<?php

namespace App\Filament\Resources\LoyaltyCardResource\Pages;

use App\Filament\Resources\LoyaltyCardResource;
use App\Models\Client;
use App\Models\LoyaltyCard;
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
                            Client::query()
                                ->orderBy('name')
                                ->orderBy('id')
                                ->get()
                                ->filter(fn (Client $c) => ! LoyaltyCard::where('client_id', $c->id)->exists())
                                ->mapWithKeys(fn (Client $c): array => [$c->id => $c->full_name])
                                ->all()
                        )
                        ->getSearchResultsUsing(function (string $search): array {
                            return Client::query()
                                ->whereDoesntHave('loyaltyCard')
                                ->where(function ($q) use ($search) {
                                    $q->where('name', 'like', "%{$search}%")
                                        ->orWhere('email', 'like', "%{$search}%")
                                        ->orWhere('phone_1', 'like', "%{$search}%")
                                        ->orWhere('id', $search);
                                })
                                ->orderBy('name')
                                ->limit(50)
                                ->get()
                                ->mapWithKeys(fn (Client $c): array => [$c->id => $c->full_name])
                                ->all();
                        })
                        ->getOptionLabelUsing(function ($value): string {
                            if ($value === null || $value === '') {
                                return '';
                            }

                            return Client::find($value)?->full_name ?? 'Client #' . $value;
                        })
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
