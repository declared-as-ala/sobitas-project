<?php

namespace App\Filament\Pages;

use App\Jobs\SendSmsJob;
use App\Models\Client;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class SendSms extends Page
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-chat-bubble-left-right';

    protected static ?string $navigationLabel = 'Envoyer SMS';

    protected static ?string $title = 'Envoyer SMS';

    protected static string | \UnitEnum | null $navigationGroup = 'Marketing';

    protected static ?int $navigationSort = 10;

    protected string $view = 'filament.pages.send-sms';

    public ?string $smsMessage = '';

    public ?string $sendTo = 'all';

    public ?array $selectedClients = [];

    public function mount(): void
    {
        //
    }

    protected function getFormSchema(): array
    {
        return [
            Forms\Components\Select::make('sendTo')
                ->label('Envoyer à')
                ->options([
                    'all'      => 'Tous les clients (abonnés SMS)',
                    'specific' => 'Clients spécifiques',
                ])
                ->default('all')
                ->live()
                ->required(),

            Forms\Components\Select::make('selectedClients')
                ->label('Sélectionner les clients')
                ->multiple()
                ->searchable()
                ->getSearchResultsUsing(function (string $search): array {
                    return Client::where('name', 'LIKE', "%{$search}%")
                        ->orWhere('phone_1', 'LIKE', "%{$search}%")
                        ->limit(50)
                        ->pluck('name', 'id')
                        ->toArray();
                })
                ->getOptionLabelsUsing(function (array $values): array {
                    return Client::whereIn('id', $values)->pluck('name', 'id')->toArray();
                })
                ->visible(fn (Forms\Get $get) => $get('sendTo') === 'specific')
                ->required(fn (Forms\Get $get) => $get('sendTo') === 'specific'),

            Forms\Components\Textarea::make('smsMessage')
                ->label('Message SMS')
                ->required()
                ->maxLength(160)
                ->rows(4)
                ->helperText('Maximum 160 caractères'),
        ];
    }

    public function send(): void
    {
        $this->validate([
            'smsMessage' => 'required|string|max:160',
        ]);

        $count = 0;

        if ($this->sendTo === 'all') {
            // Fetch only the fields needed, chunked for memory efficiency
            Client::where('sms', 1)
                ->whereNotNull('phone_1')
                ->select('id', 'phone_1')
                ->chunk(100, function ($clients) use (&$count) {
                    foreach ($clients as $client) {
                        SendSmsJob::dispatch($client->phone_1, $this->smsMessage);
                        $count++;
                    }
                });
        } else {
            // Batch fetch selected clients instead of N+1 find()
            $clients = Client::whereIn('id', $this->selectedClients)
                ->whereNotNull('phone_1')
                ->select('id', 'phone_1')
                ->get();

            foreach ($clients as $client) {
                SendSmsJob::dispatch($client->phone_1, $this->smsMessage);
                $count++;
            }
        }

        Notification::make()
            ->title("SMS en file d'attente")
            ->body("{$count} SMS ont été mis en file d'attente pour envoi.")
            ->success()
            ->send();

        $this->reset(['smsMessage', 'selectedClients']);
    }
}
