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
        } else {
            $this->client_adresse = '';
            $this->client_phone   = '';
        }
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
        $net = max(0, $total - $remiseAmount);

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

    /** Attach CRM client from loyalty card QR token (paste). */
    public function attachClientFromLoyaltyQr(string $token): void
    {
        $token = trim($token);
        if ($token === '') {
            Notification::make()->title('Token vide')->warning()->send();

            return;
        }

        $card = LoyaltyCard::where('qr_token', $token)->with('client')->first();
        if (! $card) {
            Notification::make()->title('Carte fidélité introuvable')->danger()->send();

            return;
        }

        $this->client_id = $card->client_id;
        $this->updatedClientId($this->client_id);

        $svc = app(LoyaltyService::class);
        $pts = $svc->getBalance($card->client_id);
        $val = $svc->getMonetaryValue($card->client_id);

        Notification::make()
            ->title('Client : ' . ($card->client->name ?? '#' . $card->client_id))
            ->body("Points : {$pts} (~ " . number_format($val, 3, '.', ' ') . ' DT)')
            ->success()
            ->send();

        $this->dispatch('loyalty-client-attached', clientId: (int) $this->client_id);
    }

    /** Add or remove loyalty points for the currently selected client (POS). */
    public function loyaltyApplyAdjustment(int $points, string $description = 'Caisse ticket'): void
    {
        if (! $this->client_id) {
            Notification::make()->title('Sélectionnez ou scannez un client')->warning()->send();

            return;
        }

        app(LoyaltyService::class)->adjustPoints(
            (int) $this->client_id,
            $points,
            $description,
            auth()->id()
        );

        $bal = app(LoyaltyService::class)->getBalance((int) $this->client_id);
        Notification::make()
            ->title('Fidélité mise à jour')
            ->body("Nouveau solde : {$bal} points")
            ->success()
            ->send();
    }
}
