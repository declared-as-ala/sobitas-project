<?php

namespace App\Filament\Pages;

use App\Models\Client;
use App\Models\Coordinate;
use App\Models\DetailsTicket;
use App\Models\LoyaltyCard;
use App\Models\Product;
use App\Models\Ticket;
use App\Services\LoyaltyService;
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
            }

            $this->lines = $this->ticket->details->map(fn ($d) => [
                'produit_id'    => $d->produit_id,
                'designation'   => $d->product->designation_fr ?? '—',
                'qte'           => (float) $d->qte,
                'prix_unitaire' => (float) ($d->prix_unitaire ?? 0),
            ])->toArray();
        }

        if (empty($this->lines)) {
            $this->lines = [];
        }
    }

    // ── Client change ────────────────────────────────────────────────────────
    public function updatedClientId($value): void
    {
        if ($value && $client = Client::find($value)) {
            $this->client_adresse = $client->adresse ?? '';
            $this->client_phone   = $client->phone_1 ?? '';
            $this->loadClientLoyalty($client);
        } else {
            $this->client_adresse = '';
            $this->client_phone   = '';
            $this->clearLoyalty();
        }
    }

    // ── Loyalty helpers ───────────────────────────────────────────────────────

    protected function loadClientLoyalty(Client $client): void
    {
        $card = $client->activeCard;

        if (!$card) {
            $this->clearLoyalty();
            return;
        }

        $svc = app(LoyaltyService::class);

        $this->loyalty_card_id      = $card->id;
        $this->loyalty_card_number  = $card->card_number;
        $this->loyalty_balance      = $client->loyalty_points_balance;
        $this->loyalty_balance_dt   = number_format($svc->pointsToDiscount($client->loyalty_points_balance), 3, '.', ' ');
        $this->loyalty_redeem_input = 0;
        $this->loyalty_redeem_dt    = '0.000';
        $this->loyalty_panel_visible = true;

        $this->recalcLoyaltyEarn();
    }

    protected function recalcLoyaltyEarn(): void
    {
        $svc    = app(LoyaltyService::class);
        $redeem = (float) $this->loyalty_redeem_dt;
        $earn   = $svc->calculateEarnablePoints($this->prix_ttc, $redeem);

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
    }

    public function updatedLoyaltyRedeemInput(): void
    {
        $svc    = app(LoyaltyService::class);
        $points = max(0, (int) $this->loyalty_redeem_input);

        // Cap to available balance
        if ($points > $this->loyalty_balance) {
            $points = $this->loyalty_balance;
            $this->loyalty_redeem_input = $points;
        }

        // Cap to ticket value
        $maxFromTicket = (int) floor($this->prix_ttc * LoyaltyService::POINTS_PER_DT_VALUE);
        if ($points > $maxFromTicket) {
            $points = $maxFromTicket;
            $this->loyalty_redeem_input = $points;
        }

        $this->loyalty_redeem_dt = number_format($svc->pointsToDiscount($points), 3, '.', ' ');
        $this->recalcLoyaltyEarn();
    }

    public function setMaxRedeem(): void
    {
        $svc           = app(LoyaltyService::class);
        $maxFromBalance = $this->loyalty_balance;
        $maxFromTicket  = (int) floor($this->prix_ttc * LoyaltyService::POINTS_PER_DT_VALUE);
        $max            = min($maxFromBalance, $maxFromTicket);

        $this->loyalty_redeem_input = $max;
        $this->loyalty_redeem_dt    = number_format($svc->pointsToDiscount($max), 3, '.', ' ');
        $this->recalcLoyaltyEarn();
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

        $total = 0.0;
        foreach ($this->lines as $line) {
            if (! empty($line['produit_id'])) {
                $total += (float) ($line['qte'] ?? 0) * (float) ($line['prix_unitaire'] ?? 0);
            }
        }

        $remiseAmount = (float) $this->remise;
        if ($this->pourcentage_remise > 0 && $total > 0) {
            $remiseAmount = $total * $this->pourcentage_remise / 100;
        }

        // Apply loyalty discount on top of regular discount
        $loyaltyDiscount = 0.0;
        if ($this->loyalty_card_id && $this->loyalty_redeem_input > 0) {
            $svc = app(LoyaltyService::class);
            $loyaltyDiscount = $svc->pointsToDiscount($this->loyalty_redeem_input);
        }

        $net = max(0, $total - $remiseAmount - $loyaltyDiscount);
        $this->prix_ttc = $net;

        $data = [
            'type'               => Ticket::TYPE_TICKET_CAISSE,
            'client_id'          => $this->client_id ?: null,
            'remise'             => $remiseAmount,
            'pourcentage_remise' => $this->pourcentage_remise,
            'prix_ht'            => $total,
            'prix_ttc'           => $net,
        ];

        \Illuminate\Support\Facades\DB::transaction(function () use ($data) {
            if ($this->ticketId) {
                $ticket = Ticket::findOrFail($this->ticketId);
                $ticket->update($data);
                $ticket->details()->delete();
            } else {
                $nb = Ticket::whereYear('created_at', date('Y'))->sharedLock()->count() + 1;
                $data['numero'] = date('Y') . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);
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
                        (float) $this->prix_ttc
                    );
                }
            }
        });

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
}
