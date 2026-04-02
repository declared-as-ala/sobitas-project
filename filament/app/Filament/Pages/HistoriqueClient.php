<?php

namespace App\Filament\Pages;

use App\Filament\Resources\ClientResource;
use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\QuotationResource;
use App\Filament\Resources\TicketResource;
use App\Models\Client;
use App\Models\Commande;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Quotation;
use App\Models\Ticket;
use Filament\Pages\Page;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class HistoriqueClient extends Page
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-magnifying-glass';

    protected static ?string $navigationLabel = 'Historique Client';

    protected static ?string $title = 'Historique Client';

    protected static ?string $slug = 'historique-client';

    protected static string | \UnitEnum | null $navigationGroup = 'Clients';

    protected static ?int $navigationSort = 5;

    protected string $view = 'filament.pages.historique-client';

    public ?string $tel = null;

    public ?string $name = null;

    public bool $searching = false;

    /** @var Collection<int, Client> */
    public Collection $clients;

    public function mount(?string $tel = null, ?string $name = null): void
    {
        $this->tel = $tel ?? request()->query('tel');
        $this->name = $name ?? request()->query('name');
        $this->clients = collect();
        $this->searching = false;
        if ($this->hasSearchCriteria()) {
            $this->search();
        }
    }

    public function hasSearchCriteria(): bool
    {
        return (trim((string) $this->tel) !== '') || (trim((string) $this->name) !== '');
    }

    /**
     * Normalize phone for Tunisia: digits only, last 8 digits (accept +216 prefix).
     */
    public static function normalizePhone(string $input): string
    {
        $digits = preg_replace('/\D/', '', $input);
        if (strlen($digits) >= 10 && str_starts_with($digits, '216')) {
            return substr($digits, -8);
        }
        if (strlen($digits) > 8) {
            return substr($digits, -8);
        }
        return $digits;
    }

    public function search(): void
    {
        $telRaw = trim((string) $this->tel);
        $nameRaw = trim((string) $this->name);
        if ($telRaw === '' && $nameRaw === '') {
            $this->clients = collect();
            return;
        }

        $this->searching = true;
        $query = Client::query()->orderBy('name');

        $query->where(function ($q) use ($telRaw, $nameRaw) {
            if ($telRaw !== '') {
                $normalized = self::normalizePhone($telRaw);
                $searchTerm = ($normalized !== '' && strlen($normalized) >= 8) ? $normalized : $telRaw;
                $q->where(function ($q2) use ($searchTerm, $normalized) {
                    $q2->where('phone_1', 'like', '%' . $searchTerm . '%')
                        ->orWhere('phone_2', 'like', '%' . $searchTerm . '%');
                    if ($normalized !== '' && strlen($normalized) >= 8) {
                        $q2->orWhereRaw("RIGHT(REPLACE(REPLACE(REPLACE(COALESCE(phone_1,''), ' ', ''), '+', ''), '-', ''), 8) = ?", [$normalized])
                            ->orWhereRaw("RIGHT(REPLACE(REPLACE(REPLACE(COALESCE(phone_2,''), ' ', ''), '+', ''), '-', ''), 8) = ?", [$normalized]);
                    }
                });
            }
            if ($nameRaw !== '') {
                $q->where('name', 'like', '%' . str_replace(['%', '_'], ['\%', '\_'], $nameRaw) . '%');
            }
        });

        $this->clients = $query->get();
        $this->searching = false;
    }

    public function getTitle(): string | Htmlable
    {
        return 'Historique Client';
    }

    public function getMaxContentWidth(): ?string
    {
        return '7xl';
    }

    public static function getUrl(array $parameters = [], bool $isAbsolute = true, ?string $panel = null, ?\Illuminate\Database\Eloquent\Model $tenant = null, bool $shouldGuessMissingParameters = false, ?string $configuration = null): string
    {
        $params = array_filter([
            'tel' => $parameters['tel'] ?? null,
            'name' => $parameters['name'] ?? null,
        ], fn ($v) => $v !== null && trim((string) $v) !== '');
        return parent::getUrl($params, $isAbsolute, $panel, $tenant, $shouldGuessMissingParameters, $configuration);
    }

    public function getTickets(Client $client): Collection
    {
        return Ticket::where('client_id', $client->id)->orderByDesc('created_at')->limit(100)->get();
    }

    public function getFactureTvas(Client $client): Collection
    {
        return FactureTva::where('client_id', $client->id)->orderByDesc('created_at')->limit(100)->get();
    }

    public function getFactures(Client $client): Collection
    {
        return Facture::where('client_id', $client->id)->orderByDesc('created_at')->limit(100)->get();
    }

    public function getQuotations(Client $client): Collection
    {
        return Quotation::where('client_id', $client->id)->orderByDesc('created_at')->limit(100)->get();
    }

    /**
     * Commandes (orders) linked by client_id, user_id (legacy), or normalized phone/email.
     */
    public function getCommandes(Client $client): Collection
    {
        $query = Commande::query()->orderByDesc('created_at')->limit(100);

        $query->where(function ($q) use ($client) {
            // A) client_id (preferred when present)
            if (Schema::hasColumn((new Commande)->getTable(), 'client_id')) {
                $q->where('client_id', $client->id);
            }
            // B) user_id (legacy: many commandes link client via user_id)
            $q->orWhere('user_id', $client->id);
            // C) Guest orders: match by normalized phone (last 8 digits)
            $phones = array_values(array_filter(array_unique([
                self::normalizePhone((string) ($client->phone_1 ?? '')),
                self::normalizePhone((string) ($client->phone_2 ?? '')),
            ])));
            if ($phones !== []) {
                $q->orWhere(function ($q2) use ($phones) {
                    $q2->whereRaw(
                        "RIGHT(REPLACE(REPLACE(REPLACE(COALESCE(livraison_phone, phone), ' ', ''), '+', ''), '-', ''), 8) IN (" . implode(',', array_fill(0, count($phones), '?')) . ")",
                        $phones
                    );
                });
            }
        });

        return $query->get();
    }

    public function getClientEditUrl(Client $client): string
    {
        return ClientResource::getUrl('edit', ['record' => $client]);
    }

    public function getTicketEditUrl(Ticket $ticket): string
    {
        return TicketResource::getUrl('edit', ['record' => $ticket]);
    }

    public function getFactureTvaEditUrl(FactureTva $f): string
    {
        return FactureTvaResource::getUrl('edit', ['record' => $f]);
    }

    public function getFactureEditUrl(Facture $f): string
    {
        return FactureResource::getUrl('edit', ['record' => $f]);
    }

    public function getQuotationEditUrl(Quotation $q): string
    {
        return QuotationResource::getUrl('edit', ['record' => $q]);
    }

    public function getCommandeEditUrl(Commande $c): string
    {
        return CommandeResource::getUrl('edit', ['record' => $c]);
    }

    public function getCreateTicketUrl(): string
    {
        return TicketResource::getUrl('create');
    }

    public function hasAnyHistory(Client $client): bool
    {
        return $this->getCommandes($client)->isNotEmpty()
            || $this->getTickets($client)->isNotEmpty()
            || $this->getFactureTvas($client)->isNotEmpty()
            || $this->getFactures($client)->isNotEmpty()
            || $this->getQuotations($client)->isNotEmpty();
    }

    /**
     * Summary stats for client: total spent, last order date, average basket.
     *
     * @return array{total_spent: float, last_order_date: string|null, avg_basket: float}
     */
    public function getClientSummaryStats(Client $client): array
    {
        $commandes = $this->getCommandes($client);
        $total = $commandes->sum(fn ($c) => (float) ($c->prix_ttc ?? 0));
        $last = $commandes->sortByDesc('created_at')->first();
        $count = $commandes->count();
        return [
            'total_spent' => $total,
            'last_order_date' => $last?->created_at?->format('d/m/Y'),
            'avg_basket' => $count > 0 ? $total / $count : 0,
        ];
    }

    /** Status options for Commande filter. */
    public static function getCommandeStatusOptions(): array
    {
        return Commande::getStatusOptions();
    }

    /** Payment method options (from distinct values in DB). */
    public function getCommandePaymentOptions(Client $client): array
    {
        $commandes = $this->getCommandes($client);
        $methods = $commandes->pluck('payment_method')->filter()->unique()->sort()->values()->all();
        $out = ['' => 'Tous'];
        foreach ($methods as $m) {
            $out[$m] = $m;
        }
        return $out;
    }
}
