<?php

namespace App\Filament\Pages;

use App\Models\Client;
use App\Models\LoyaltyCard;
use App\Services\LoyaltyService;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Support\Enums\FontWeight;
use Illuminate\Contracts\Support\Htmlable;

class ScannerFidelitePage extends Page
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-qr-code';

    protected static ?string $navigationLabel = 'Scanner fidélité';

    protected static ?string $title = 'Scanner Fidélité';

    protected static string | \UnitEnum | null $navigationGroup = 'Clients';

    protected static ?int $navigationSort = 3;
    protected string $view = 'filament.pages.scanner-fidelite';

    // ── Scan state ──────────────────────────────────────────────────────────────
    public string $scannedCode  = '';
    public bool   $cardNotFound = false;
    public ?int   $cardId       = null;
    public ?array $cardData     = null;

    // ── Client search / assignment ───────────────────────────────────────────────
    public string  $clientSearch      = '';
    public array   $clientResults     = [];
    public ?int    $selectedClientId  = null;
    public bool    $showNewClientForm = false;
    public string  $newClientName     = '';
    public string  $newClientPhone    = '';
    public string  $newClientAdresse  = '';

    // ── History ─────────────────────────────────────────────────────────────────
    public array $recentTransactions = [];

    // ── Scan ────────────────────────────────────────────────────────────────────

    public function scanCard(): void
    {
        $code = trim($this->scannedCode);
        $this->scannedCode        = '';
        $this->cardNotFound       = false;
        $this->cardData           = null;
        $this->cardId             = null;
        $this->recentTransactions = [];
        $this->resetAssignment();

        if ($code === '') return;

        $card = app(LoyaltyService::class)->findCardByScanCode($code);

        if (! $card) {
            $this->cardNotFound = true;
            return;
        }

        $card->load(['client', 'batch']);
        $this->cardId   = $card->id;
        $this->cardData = $this->buildCardData($card);

        if ($card->client_id && $card->client) {
            $this->recentTransactions = $card->client
                ->loyaltyTransactions()
                ->with('ticket:id,numero')
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn ($t) => [
                    'type'          => $t->type->label(),
                    'color'         => $t->type->color(),
                    'points'        => $t->points,
                    'balance_after' => $t->balance_after,
                    'description'   => $t->description ?? '',
                    'ticket'        => $t->ticket?->numero ?? null,
                    'date'          => $t->created_at->format('d/m/Y H:i'),
                ])->toArray();
        }
    }

    // ── Client search ────────────────────────────────────────────────────────────

    public function updatedClientSearch(): void
    {
        $q = trim($this->clientSearch);
        if (strlen($q) < 2) {
            $this->clientResults = [];
            return;
        }

        $this->clientResults = Client::query()
            ->where('name', 'like', "%{$q}%")
            ->orWhere('phone_1', 'like', "%{$q}%")
            ->limit(8)
            ->get(['id', 'name', 'phone_1'])
            ->map(fn ($c) => [
                'id'    => $c->id,
                'label' => $c->name . ($c->phone_1 ? ' — ' . $c->phone_1 : ''),
            ])->toArray();
    }

    public function selectClient(int $id): void
    {
        $this->selectedClientId = $id;
        $c = Client::find($id);
        $this->clientSearch  = $c ? ($c->name . ($c->phone_1 ? ' — ' . $c->phone_1 : '')) : '';
        $this->clientResults = [];
    }

    // ── Assignment ───────────────────────────────────────────────────────────────

    public function assignCard(): void
    {
        if (! $this->cardId || ! $this->selectedClientId) {
            Notification::make()->title('Sélectionnez un client d\'abord.')->warning()->send();
            return;
        }

        $card   = LoyaltyCard::find($this->cardId);
        $client = Client::find($this->selectedClientId);

        if (! $card || ! $client) return;

        try {
            app(LoyaltyService::class)->assignCard($card, $client);
            $card->load(['client', 'batch']);
            $this->cardData           = $this->buildCardData($card);
            $this->recentTransactions = [];
            $this->resetAssignment();

            Notification::make()
                ->title("Carte {$card->card_number} assignée à {$client->name}.")
                ->success()
                ->send();
        } catch (\Throwable $e) {
            Notification::make()->title('Erreur')->body($e->getMessage())->danger()->send();
        }
    }

    public function createAndAssign(): void
    {
        $name = trim($this->newClientName);
        if (! $name) {
            Notification::make()->title('Le nom du client est obligatoire.')->warning()->send();
            return;
        }

        if (! $this->cardId) return;

        $card = LoyaltyCard::find($this->cardId);
        if (! $card) return;

        try {
            $client = Client::create([
                'name'    => $name,
                'phone_1' => trim($this->newClientPhone) ?: null,
                'adresse' => trim($this->newClientAdresse) ?: null,
            ]);

            app(LoyaltyService::class)->assignCard($card, $client);
            $card->load(['client', 'batch']);
            $this->cardData           = $this->buildCardData($card);
            $this->recentTransactions = [];
            $this->resetAssignment();

            Notification::make()->title('Client créé et carte assignée.')->success()->send();
        } catch (\Throwable $e) {
            Notification::make()->title('Erreur')->body($e->getMessage())->danger()->send();
        }
    }

    // ── Card actions ─────────────────────────────────────────────────────────────

    public function markLost(): void
    {
        if (! $this->cardId) return;
        $card = LoyaltyCard::find($this->cardId);
        if (! $card) return;

        try {
            app(LoyaltyService::class)->markCardLost($card, 'Déclaré perdu depuis le scanner fidélité.');
            $card->load(['client', 'batch']);
            $this->cardData = $this->buildCardData($card);
            Notification::make()->title('Carte marquée comme perdue.')->warning()->send();
        } catch (\Throwable $e) {
            Notification::make()->title('Erreur')->body($e->getMessage())->danger()->send();
        }
    }

    public function clearScan(): void
    {
        $this->cardId             = null;
        $this->cardData           = null;
        $this->cardNotFound       = false;
        $this->scannedCode        = '';
        $this->recentTransactions = [];
        $this->resetAssignment();
    }

    // ── URL helper ───────────────────────────────────────────────────────────────

    public function getPosUrl(): string
    {
        if ($this->cardData && $this->cardData['client_id']) {
            return TicketPosPage::getUrl(['client_id' => $this->cardData['client_id']]);
        }

        return TicketPosPage::getUrl();
    }

    // ── Internal ─────────────────────────────────────────────────────────────────

    protected function buildCardData(LoyaltyCard $card): array
    {
        $svc     = app(LoyaltyService::class);
        $balance = $card->client?->loyalty_points_balance ?? 0;

        return [
            'id'           => $card->id,
            'card_number'  => $card->card_number,
            'status'       => $card->status->value,
            'status_label' => $card->status->label(),
            'status_color' => $card->status->color(),
            'is_assigned'  => ! is_null($card->client_id),
            'is_usable'    => $card->isUsable(),
            'is_available' => $card->isAssignable(),
            'client_id'    => $card->client_id,
            'client_name'  => $card->client?->name ?? null,
            'client_phone' => $card->client?->phone_1 ?? null,
            'balance'      => $balance,
            'balance_dt'   => number_format($svc->pointsToDiscount($balance), 3, '.', ' '),
            'batch_name'   => $card->batch?->name ?? null,
        ];
    }

    protected function resetAssignment(): void
    {
        $this->clientSearch      = '';
        $this->clientResults     = [];
        $this->selectedClientId  = null;
        $this->showNewClientForm = false;
        $this->newClientName     = '';
        $this->newClientPhone    = '';
        $this->newClientAdresse  = '';
    }
}
