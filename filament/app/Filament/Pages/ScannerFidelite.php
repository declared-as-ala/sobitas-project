<?php

namespace App\Filament\Pages;

use App\Models\Client;
use App\Models\LoyaltyCard;
use App\Models\LoyaltyPointTransaction;
use App\Models\Ticket;
use App\Services\LoyaltyService;
use Filament\Pages\Page;

class ScannerFidelite extends Page
{
    protected static ?string $navigationLabel = 'Scanner fidélité';

    protected static ?string $title = 'Scanner fidélité';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-qr-code';

    protected static string|\UnitEnum|null $navigationGroup = 'Fidélité';

    protected static ?int $navigationSort = 0;

    protected static ?string $slug = 'scanner-fidelite';

    protected string $view = 'filament.pages.scanner-fidelite';

    public string $scan = '';

    /** @var array<string, mixed>|null */
    public ?array $result = null;

    public function mount(): void
    {
        parent::mount();

        $clientId = request()->query('client');
        if ($clientId !== null && $clientId !== '' && ctype_digit((string) $clientId)) {
            $this->scan = (string) (int) $clientId;
            $this->search();
        }
    }

    public function search(): void
    {
        $q = trim($this->scan);
        $this->result = null;

        if ($q === '') {
            return;
        }

        $svc = app(LoyaltyService::class);

        $card = null;
        if (strlen($q) >= 32) {
            $card = LoyaltyCard::with('client')->where('qr_token', $q)->first();
        }
        if (! $card && preg_match('/^[A-Z0-9\-]+$/i', $q)) {
            $card = LoyaltyCard::with('client')->where('card_number', $q)->first();
        }
        if (! $card && ctype_digit($q)) {
            $card = LoyaltyCard::with('client')->where('client_id', (int) $q)->first();
        }
        if (! $card) {
            $client = Client::query()
                ->where('phone_1', 'like', '%' . $q . '%')
                ->orWhere('name', 'like', '%' . $q . '%')
                ->orWhere('email', 'like', '%' . $q . '%')
                ->first();
            if ($client) {
                $card = LoyaltyCard::with('client')->where('client_id', $client->id)->first();
            }
        }

        if (! $card || ! $card->client) {
            $this->result = ['error' => 'Aucune carte ou client trouvé pour cette recherche.'];

            return;
        }

        $client = $card->client;
        $points = $svc->getBalance((int) $client->id);
        $value  = $svc->getMonetaryValue((int) $client->id);

        $recentTickets = Ticket::query()
            ->where('client_id', $client->id)
            ->orderByDesc('id')
            ->limit(5)
            ->get(['id', 'numero', 'prix_ttc', 'created_at']);

        $recentTx = LoyaltyPointTransaction::query()
            ->where('client_id', $client->id)
            ->orderByDesc('id')
            ->limit(8)
            ->get(['id', 'type', 'points', 'description', 'created_at']);

        $this->result = [
            'client_id'    => $client->id,
            'client_name'  => $client->full_name ?? $client->name ?? ('Client #' . $client->id),
            'phone'        => $client->phone_1,
            'email'        => $client->email,
            'card_number'  => $card->card_number,
            'card_status'  => $card->status?->value ?? (string) $card->status,
            'points'       => $points,
            'value_dt'     => $value,
            'tickets'      => $recentTickets->map(fn ($t) => [
                'numero' => $t->numero,
                'total'  => $t->prix_ttc,
                'date'   => $t->created_at?->format('d/m/Y H:i'),
            ])->all(),
            'transactions' => $recentTx->map(fn ($x) => [
                'type'  => is_object($x->type) ? $x->type->value : $x->type,
                'pts'   => $x->points,
                'desc'  => $x->description,
                'date'  => $x->created_at?->format('d/m/Y H:i'),
            ])->all(),
        ];
    }
}
