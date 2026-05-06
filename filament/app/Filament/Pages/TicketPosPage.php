<?php

namespace App\Filament\Pages;

use App\Models\Client;
use App\Models\Coordinate;
use App\Models\DetailsTicket;
use App\Models\LoyaltyCard;
use App\Models\Product;
use App\Models\Ticket;
use App\Services\LoyaltyService;
use App\Services\NumberSequenceService;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\Page;
use App\Filament\Resources\TicketResource;

class TicketPosPage extends Page
{
    protected static string $resource = TicketResource::class;
    protected static ?string $title = 'Tikets pages';
    protected static ?string $navigationLabel = 'Tikets pages';
    protected static string | \BackedEnum | null $navigationIcon = null;

    protected static bool $shouldRegisterNavigation = false;

    protected string $view = 'filament.pages.ticket-pos';

    // ── State ──────────────────────────────────────────────────────────────
    public ?int $ticketId = null;

    public ?int $client_id = null;

    public string $client_adresse = '';

    public string $client_phone = '';

    public string $barcode = '';

    /** @var array<int, array{produit_id: int|null, designation: string, qte: float, prix_unitaire: float}> */
    public array $lines = [];

    public float $remise = 0;

    public float $pourcentage_remise = 0;

    public float $prix_ht = 0;

    public float $prix_ttc = 0;

    // ── Loyalty state ───────────────────────────────────────────────────────
    public ?int    $loyalty_card_id        = null;
    public ?string $loyalty_card_number    = null;
    public int     $loyalty_balance        = 0;
    public string  $loyalty_balance_dt     = '0.000';
    public int     $loyalty_redeem_input   = 0;
    public string  $loyalty_redeem_dt      = '0.000';
    public int     $loyalty_points_earn    = 0;
    public string  $loyalty_points_earn_dt = '0.000';
    public bool    $loyalty_panel_visible  = false;

    // ── Computed ────────────────────────────────────────────────────────────
    public ?Coordinate $coordonnee = null;

    public ?Ticket $ticket = null;

    // ── Mount ───────────────────────────────────────────────────────────────
    public function mount(?int $ticketId = null): void
    {
        $clientIdFromQuery = request()->integer('client_id');

        $this->coordonnee = Coordinate::getCached();
        $this->ticketId   = $ticketId;

        if ($ticketId) {
            $this->ticket = Ticket::with(['details.product', 'client'])->findOrFail($ticketId);
            $this->client_id           = $this->ticket->client_id;
            $this->remise              = (float) ($this->ticket->remise ?? 0);
            $this->pourcentage_remise  = (float) ($this->ticket->pourcentage_remise ?? 0);
            $this->prix_ht             = (float) ($this->ticket->prix_ht ?? 0);
            $this->prix_ttc            = (float) ($this->ticket->prix_ttc ?? 0);

            if ($this->ticket->client) {
                $this->client_adresse = $this->ticket->client->adresse ?? '';
                $this->client_phone   = $this->ticket->client->phone_1 ?? '';
                $this->loadClientLoyalty($this->ticket->client);
            }

            $this->lines = $this->ticket->details->map(fn ($d) => [
                'produit_id'    => $d->produit_id,
                'designation'   => $d->product->designation_fr ?? '—',
                'qte'           => (float) $d->qte,
                'prix_unitaire' => (float) ($d->prix_unitaire ?? 0),
            ])->toArray();
        }

        // Pre-load client when redirected from Scanner Fidélité page
        if (! $ticketId && $clientIdFromQuery && $client = Client::find($clientIdFromQuery)) {
            $this->client_id      = $client->id;
            $this->client_adresse = $client->adresse ?? '';
            $this->client_phone   = $client->phone_1 ?? '';
            $this->loadClientLoyalty($client);
        }

        if (empty($this->lines)) {
            $this->lines = [];
        }
    }

    // ── Client change ────────────────────────────────────────────────────────
    public function updatedClientId($value): void
    {
        $this->clearLoyalty();

        if ($value && $client = Client::find($value)) {
            $this->client_adresse = $client->adresse ?? '';
            $this->client_phone   = $client->phone_1 ?? '';
            $this->loadClientLoyalty($client);
        } else {
            $this->client_adresse = '';
            $this->client_phone   = '';
            $this->clearLoyalty();
        }

        $this->dispatchTotalsRecalc();
    }

    // ── Loyalty helpers ───────────────────────────────────────────────────────

    protected function loadClientLoyalty(Client $client): void
    {
        $freshClient = $client->fresh();
        $card = $freshClient?->activeCard()->first();

        if (! $card) {
            $this->clearLoyalty();
            return;
        }

        $svc = app(LoyaltyService::class);

        $this->loyalty_card_id       = $card->id;
        $this->loyalty_card_number   = $card->card_number;
        $this->loyalty_balance       = (int) ($freshClient?->loyalty_points_balance ?? 0);
        $this->loyalty_balance_dt    = number_format($svc->pointsToDiscount($this->loyalty_balance), 3, '.', ' ');
        $this->loyalty_redeem_input  = 0;
        $this->loyalty_redeem_dt     = '0.000';
        $this->loyalty_panel_visible = true;

        $this->recalcLoyaltyEarn();
        $this->dispatchLoyaltyState();
    }

    protected function recalcLoyaltyEarn(): void
    {
        $svc    = app(LoyaltyService::class);
        $totals = $this->computeTicketTotals();
        $earn   = $svc->calculateEarnablePoints($totals['base_after_regular_discount'], $totals['loyalty_discount']);

        $this->loyalty_points_earn    = $earn;
        $this->loyalty_points_earn_dt = number_format($svc->pointsToDiscount($earn), 3, '.', ' ');
    }

    public function clearLoyalty(): void
    {
        $this->loyalty_card_id        = null;
        $this->loyalty_card_number    = null;
        $this->loyalty_balance        = 0;
        $this->loyalty_balance_dt     = '0.000';
        $this->loyalty_redeem_input   = 0;
        $this->loyalty_redeem_dt      = '0.000';
        $this->loyalty_points_earn    = 0;
        $this->loyalty_points_earn_dt = '0.000';
        $this->loyalty_panel_visible  = false;
        $this->dispatchLoyaltyState();
    }

    public function updatedLoyaltyRedeemInput(): void
    {
        $svc    = app(LoyaltyService::class);
        $points = max(0, (int) $this->loyalty_redeem_input);
        $totals = $this->computeTicketTotals();

        if ($points > $this->loyalty_balance) {
            $points = $this->loyalty_balance;
            $this->loyalty_redeem_input = $points;
        }

        $maxFromTicket = (int) floor($totals['base_after_regular_discount'] * LoyaltyService::POINTS_PER_DT_VALUE);
        if ($points > $maxFromTicket) {
            $points = $maxFromTicket;
            $this->loyalty_redeem_input = $points;
        }
        if ($points > 0 && $points < LoyaltyService::MIN_REDEEM_POINTS) {
            $points = 0;
            $this->loyalty_redeem_input = 0;
        }

        $this->loyalty_redeem_dt = number_format($svc->pointsToDiscount($points), 3, '.', ' ');
        $this->recalcLoyaltyEarn();
        $this->dispatchLoyaltyState();
        $this->dispatchTotalsRecalc();
    }

    public function setMaxRedeem(): void
    {
        $svc            = app(LoyaltyService::class);
        $totals         = $this->computeTicketTotals();
        $maxFromBalance = $this->loyalty_balance;
        $maxFromTicket  = (int) floor($totals['base_after_regular_discount'] * LoyaltyService::POINTS_PER_DT_VALUE);
        $max            = min($maxFromBalance, $maxFromTicket);
        if ($max > 0 && $max < LoyaltyService::MIN_REDEEM_POINTS) {
            $max = 0;
        }

        $this->loyalty_redeem_input = $max;
        $this->loyalty_redeem_dt    = number_format($svc->pointsToDiscount($max), 3, '.', ' ');
        $this->recalcLoyaltyEarn();
        $this->dispatchLoyaltyState();
        $this->dispatchTotalsRecalc();
    }

    // ── Dispatch loyalty state to JS (used because outer div is wire:ignore) ────
    protected function dispatchLoyaltyState(): void
    {
        $this->dispatch('loyalty-state-updated', [
            'panel_visible' => $this->loyalty_panel_visible,
            'card_number'   => $this->loyalty_card_number,
            'card_id'       => $this->loyalty_card_id,
            'balance'       => $this->loyalty_balance,
            'balance_dt'    => $this->loyalty_balance_dt,
            'redeem_input'  => $this->loyalty_redeem_input,
            'redeem_dt'     => $this->loyalty_redeem_dt,
            'earn'          => $this->loyalty_points_earn,
            'earn_dt'       => $this->loyalty_points_earn_dt,
        ]);
    }

    protected function dispatchTotalsRecalc(): void
    {
        $this->dispatch('loyalty-totals-recalc');
    }

    // ── Public entry point for loyalty barcode scan from JS ──────────────────
    public function scanLoyaltyCard(string $code): void
    {
        $found = $this->handleLoyaltyScan($code);

        // If a card was matched and a client loaded, also push client fields to JS
        if ($found && $this->client_id) {
            $this->dispatch('loyalty-client-synced', [
                'client_id'      => $this->client_id,
                'client_name'    => Client::find($this->client_id)?->name ?? '',
                'client_phone'   => $this->client_phone,
                'client_adresse' => $this->client_adresse,
            ]);
        }

        $this->dispatchLoyaltyState();
    }

    protected function handleLoyaltyScan(string $code): bool
    {
        $svc = app(LoyaltyService::class);

        if (!$svc->isLoyaltyBarcode($code)) {
            return false;
        }

        $card = $svc->findCardByToken($code);

        if (!$card) {
            Notification::make()
                ->title("Carte fidélité introuvable : {$code}")
                ->warning()
                ->send();
            return true;
        }

        if (!$card->isUsable()) {
            Notification::make()
                ->title("Carte {$card->card_number} non active ({$card->status->label()})")
                ->danger()
                ->send();
            return true;
        }

        if (!$card->client_id) {
            Notification::make()
                ->title("Carte {$card->card_number} non assignée à un client.")
                ->warning()
                ->send();
            return true;
        }

        $this->client_id      = $card->client_id;
        $this->client_adresse = $card->client->adresse ?? '';
        $this->client_phone   = $card->client->phone_1 ?? '';
        $this->loadClientLoyalty($card->client);

        return true;
    }

    // ── AJAX: get product label for select ───────────────────────────────────
    public function getProductOptions(string $search = ''): array
    {
        return Product::getSearchOptionsForFilament($search, 30);
    }

    public function searchProductsAJAX(string $search = ''): array
    {
        $products = Product::query()
            ->select('id', 'designation_fr', 'prix', 'promo', 'promo_expiration_date', 'qte', 'code_product')
            ->where('designation_fr', 'like', "%{$search}%")
            ->orWhere('code_product', 'like', "%{$search}%")
            ->limit(30)
            ->get();

        return $products->map(function ($p) {
            return [
                'id' => $p->id,
                'text' => $p->designation_fr . ' (' . ($p->qte ?? 0) . ') - ' . $p->code_product,
                'prix' => $p->getEffectiveUnitPrice(),
                'qte' => $p->qte,
            ];
        })->toArray();
    }

    public function searchProductByBarcode(string $code): ?array
    {
        $code = trim($code);
        if ($code === '') {
            return null;
        }

        // Auto-detect loyalty card barcode — consume and return early
        if ($this->handleLoyaltyScan($code)) {
            return null;
        }

        $product = Product::query()
            ->select('id', 'designation_fr', 'prix', 'promo', 'promo_expiration_date', 'qte', 'code_product')
            ->where('code_product', $code)
            ->orWhere('code_product', '0' . $code)
            ->first();

        if ($product) {
            return [
                'id' => $product->id,
                'designation' => $product->designation_fr,
                'prix_unitaire' => $product->getEffectiveUnitPrice(),
                'qte' => $product->qte,
            ];
        }

        return null;
    }

    // ── Save ─────────────────────────────────────────────────────────────────
    public function save(array $payload = [])
    {
        if (!empty($payload)) {
            $this->lines = $payload['lines'] ?? [];
            $this->client_id = !empty($payload['client_id']) ? (int) $payload['client_id'] : null;
            $this->remise = (float) ($payload['remise'] ?? 0);
            $this->pourcentage_remise = (float) ($payload['pourcentage_remise'] ?? 0);
            // Sync loyalty from JS payload if present
            if (isset($payload['loyalty_card_id']))     $this->loyalty_card_id    = (int) $payload['loyalty_card_id'] ?: null;
            if (isset($payload['loyalty_redeem_input'])) $this->loyalty_redeem_input = (int) $payload['loyalty_redeem_input'];
        }

        $totals = $this->computeTicketTotals();
        $total = $totals['total_ht'];
        $remiseAmount = $totals['regular_discount'];
        $loyaltyDiscount = $totals['loyalty_discount'];
        $net = $totals['final_paid_amount'];
        $this->prix_ttc = $net;

        $data = [
            'type'               => Ticket::TYPE_TICKET_CAISSE,
            'client_id'          => $this->client_id ?: null,
            'remise'             => $remiseAmount,
            'pourcentage_remise' => $this->pourcentage_remise,
            'prix_ht'            => $total,
            'prix_ttc'           => $net,
        ];

        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($data, $totals) {
                if ($this->ticketId) {
                    $ticket = Ticket::findOrFail($this->ticketId);
                    $ticket->update($data);
                    $ticket->details()->delete();
                } else {
                    $data['numero'] = app(NumberSequenceService::class)->nextTicket();
                    $ticket = Ticket::create($data);
                    $this->ticketId = $ticket->id;
                }

                $inserts = [];
                foreach ($this->lines as $row) {
                    if (empty($row['produit_id'])) {
                        continue;
                    }
                    $qte      = (float) ($row['qte'] ?? 1);
                    $pu       = (float) ($row['prix_unitaire'] ?? 0);
                    $lineTotal = $qte * $pu;
                    $inserts[] = [
                        'ticket_id'     => $ticket->id,
                        'produit_id'    => $row['produit_id'],
                        'designation_fr' => $row['designation'] ?? '',
                        'qte'           => $qte,
                        'prix_unitaire' => $pu,
                        'prix_ht'       => $lineTotal,
                        'prix_ttc'      => $lineTotal,
                    ];
                }
                if (!empty($inserts)) {
                    DetailsTicket::insert($inserts);
                }

                // Process loyalty (idempotent — guarded by loyalty_processed_at)
                if ($this->loyalty_card_id && $this->client_id) {
                    $loyaltyCard   = LoyaltyCard::find($this->loyalty_card_id);
                    $loyaltyClient = Client::find($this->client_id);

                    if ($loyaltyCard && $loyaltyClient && $loyaltyCard->isUsable()) {
                        app(LoyaltyService::class)->processTicketLoyalty(
                            $ticket,
                            $loyaltyClient,
                            $loyaltyCard,
                            (int) $this->loyalty_redeem_input,
                            (float) $totals['base_after_regular_discount']
                        );
                    }
                }
            });
        } catch (\Throwable $e) {
            Notification::make()
                ->title('Échec de l’enregistrement du ticket')
                ->body($e->getMessage())
                ->danger()
                ->send();
            $this->dispatch('ticket-save-failed', ['message' => $e->getMessage()]);
            return null;
        }

        Notification::make()
            ->title('Ticket enregistré — ouverture de l’impression.')
            ->success()
            ->send();

        $this->dispatch('ticket-saved', [
            'printUrl' => route('tickets.print', ['ticket' => $this->ticketId]),
            'posUrl'   => TicketPosPage::getUrl(['ticketId' => $this->ticketId]),
        ]);

        // Hard redirect fallback to guarantee Voyager-like flow even if JS event listeners fail.
        return $this->redirect(route('tickets.print', ['ticket' => $this->ticketId]), navigate: false);
    }

    public static function getUrl(array $parameters = [], bool $isAbsolute = true, ?string $panel = null, ?\Illuminate\Database\Eloquent\Model $tenant = null, bool $shouldGuessMissingParameters = false, ?string $configuration = null): string
    {
        return route('filament.admin.resources.tickets.pos', $parameters, $isAbsolute);
    }

    protected function computeTicketTotals(): array
    {
        $total = 0.0;
        foreach ($this->lines as $line) {
            if (! empty($line['produit_id'])) {
                $total += (float) ($line['qte'] ?? 0) * (float) ($line['prix_unitaire'] ?? 0);
            }
        }

        $manualDiscount = max(0.0, (float) $this->remise);
        $percent = max(0.0, min(100.0, (float) $this->pourcentage_remise));
        $percentDiscount = $percent > 0 ? $total * $percent / 100 : 0.0;
        $regularDiscount = $percent > 0 ? $percentDiscount : $manualDiscount;
        $regularDiscount = min($regularDiscount, $total);
        $baseAfterRegularDiscount = max(0.0, $total - $regularDiscount);

        $pointsToRedeem = max(0, (int) $this->loyalty_redeem_input);
        if ($pointsToRedeem > $this->loyalty_balance) {
            $pointsToRedeem = $this->loyalty_balance;
            $this->loyalty_redeem_input = $pointsToRedeem;
        }

        $maxFromTicket = (int) floor($baseAfterRegularDiscount * LoyaltyService::POINTS_PER_DT_VALUE);
        if ($pointsToRedeem > $maxFromTicket) {
            $pointsToRedeem = $maxFromTicket;
            $this->loyalty_redeem_input = $pointsToRedeem;
        }
        if ($pointsToRedeem > 0 && $pointsToRedeem < LoyaltyService::MIN_REDEEM_POINTS) {
            $pointsToRedeem = 0;
            $this->loyalty_redeem_input = 0;
        }

        $loyaltyDiscount = $this->loyalty_card_id
            ? app(LoyaltyService::class)->pointsToDiscount($pointsToRedeem)
            : 0.0;
        $loyaltyDiscount = min($loyaltyDiscount, $baseAfterRegularDiscount);

        return [
            'total_ht' => $total,
            'regular_discount' => $regularDiscount,
            'manual_discount' => $manualDiscount,
            'percent_discount' => $percentDiscount,
            'base_after_regular_discount' => $baseAfterRegularDiscount,
            'loyalty_discount' => $loyaltyDiscount,
            'final_paid_amount' => max(0.0, $baseAfterRegularDiscount - $loyaltyDiscount),
        ];
    }
}
