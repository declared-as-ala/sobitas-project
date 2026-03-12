<?php

namespace App\Filament\Pages;

use App\Models\Client;
use App\Models\Coordinate;
use App\Models\DetailsTicket;
use App\Models\Product;
use App\Models\Ticket;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\Page;
use App\Filament\Resources\TicketResource;

class TicketPosPage extends Page
{
    protected static string $resource = TicketResource::class;
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
            $this->lines = [self::emptyLine()];
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

    // ── Barcode scan ─────────────────────────────────────────────────────────
    public function scanBarcode(): void
    {
        $code = trim($this->barcode);
        $this->barcode = '';

        if ($code === '') {
            return;
        }

        $product = Product::where(function ($q) use ($code) {
            $q->where('code_product', $code)
              ->orWhere('code_product', '0' . $code);
        })->first();

        if (! $product) {
            Notification::make()
                ->title('Aucun produit trouvé pour ce code')
                ->warning()
                ->send();
            return;
        }

        // Look for existing line with same produit_id and increment qty
        foreach ($this->lines as $i => $line) {
            if ((int) ($line['produit_id'] ?? 0) === $product->id) {
                $this->lines[$i]['qte'] += 1;
                $this->recalcTotals();
                $this->dispatch('barcode-focus');
                return;
            }
        }

        // Add new line
        $this->lines[] = [
            'produit_id'    => $product->id,
            'designation'   => $product->designation_fr ?? '—',
            'qte'           => 1,
            'prix_unitaire' => $product->getEffectiveUnitPrice(),
        ];

        $this->recalcTotals();
        $this->dispatch('barcode-focus');
    }

    // ── AJAX: get product label for select ───────────────────────────────────
    public function getProductOptions(string $search = ''): array
    {
        return Product::getSearchOptionsForFilament($search, 30);
    }

    // ── Line updates ──────────────────────────────────────────────────────────
    public function updatedLines(): void
    {
        // Sync designation when produit_id changes via select
        foreach ($this->lines as $i => $line) {
            if (! empty($line['produit_id']) && empty($line['designation'])) {
                $p = Product::select('id', 'designation_fr', 'prix', 'promo', 'promo_expiration_date')
                    ->find($line['produit_id']);
                if ($p) {
                    $this->lines[$i]['designation']   = $p->designation_fr ?? '';
                    $this->lines[$i]['prix_unitaire'] = $p->getEffectiveUnitPrice();
                }
            }
        }
        $this->recalcTotals();
    }

    public function lineProductChanged(int $index, ?int $produitId): void
    {
        if ($produitId && $p = Product::select('id', 'designation_fr', 'prix', 'promo', 'promo_expiration_date')
            ->find($produitId)) {
            $this->lines[$index]['produit_id']    = $p->id;
            $this->lines[$index]['designation']   = $p->designation_fr ?? '';
            $this->lines[$index]['prix_unitaire'] = $p->getEffectiveUnitPrice();
        }
        $this->recalcTotals();
    }

    public function addLine(): void
    {
        $this->lines[] = self::emptyLine();
    }

    public function removeLine(int $index): void
    {
        array_splice($this->lines, $index, 1);
        if (empty($this->lines)) {
            $this->lines = [self::emptyLine()];
        }
        $this->recalcTotals();
    }

    public function updatedRemise(): void
    {
        $this->recalcTotals();
    }

    public function updatedPourcentageRemise(): void
    {
        $this->pourcentage_remise = max(0, (float) $this->pourcentage_remise);
        $this->recalcTotals();
    }

    // ── Save ─────────────────────────────────────────────────────────────────
    public function save(): void
    {
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

        if ($this->ticketId) {
            $ticket = Ticket::findOrFail($this->ticketId);
            $ticket->update($data);
            $ticket->details()->delete();
        } else {
            $nb = Ticket::whereYear('created_at', date('Y'))->count() + 1;
            $data['numero'] = date('Y') . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);
            $ticket = Ticket::create($data);
        }

        foreach ($this->lines as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte      = (float) ($row['qte'] ?? 1);
            $pu       = (float) ($row['prix_unitaire'] ?? 0);
            $lineTotal = $qte * $pu;
            DetailsTicket::create([
                'ticket_id'     => $ticket->id,
                'produit_id'    => $row['produit_id'],
                'designation_fr' => $row['designation'] ?? '',
                'qte'           => $qte,
                'prix_unitaire' => $pu,
                'prix_ht'       => $lineTotal,
                'prix_ttc'      => $lineTotal,
            ]);
        }

        Notification::make()
            ->title('Ticket enregistré avec succès !')
            ->success()
            ->send();

        $this->redirect(route('filament.admin.resources.tickets.index'));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private function recalcTotals(): void
    {
        $total = 0.0;
        foreach ($this->lines as $line) {
            if (! empty($line['produit_id'])) {
                $total += (float) ($line['qte'] ?? 0) * (float) ($line['prix_unitaire'] ?? 0);
            }
        }
        $remiseAmount = (float) $this->remise;
        if ($this->pourcentage_remise > 0 && $total > 0) {
            $remiseAmount = $total * $this->pourcentage_remise / 100;
            $this->remise = round($remiseAmount, 3);
        }
        $this->prix_ht  = round($total, 3);
        $this->prix_ttc = round(max(0, $total - $remiseAmount), 3);
    }

    private static function emptyLine(): array
    {
        return [
            'produit_id'    => null,
            'designation'   => '',
            'qte'           => 1,
            'prix_unitaire' => 0,
        ];
    }

    public static function getUrl(array $parameters = [], bool $isAbsolute = true, ?string $panel = null, ?\Illuminate\Database\Eloquent\Model $tenant = null): string
    {
        return route('filament.admin.pages.ticket-pos', $parameters, $isAbsolute);
    }
}
