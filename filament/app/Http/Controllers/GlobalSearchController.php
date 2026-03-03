<?php

namespace App\Http\Controllers;

use App\Filament\Resources\ClientResource;
use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\ProductResource;
use App\Filament\Resources\QuotationResource;
use App\Filament\Resources\TicketResource;
use App\Filament\Resources\UserResource;
use App\Models\Client;
use App\Models\Commande;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    private const LIMIT_PER_GROUP = 5;
    private const MIN_QUERY_LENGTH = 2;

    public function __invoke(Request $request): JsonResponse
    {
        $q = $request->input('q', '');
        $q = is_string($q) ? trim($q) : '';

        if (strlen($q) < self::MIN_QUERY_LENGTH) {
            return response()->json([
                'clients' => [],
                'users' => [],
                'products' => [],
                'commandes' => [],
                'tickets' => [],
                'factures' => [],
                'facture_tvas' => [],
                'quotations' => [],
            ]);
        }

        $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';

        $clients = $this->searchClients($term);
        $users = $this->searchUsers($term);
        $products = $this->searchProducts($term);
        $commandes = $this->searchCommandes($term);
        $tickets = $this->searchTickets($term);
        $factures = $this->searchFactures($term);
        $factureTvas = $this->searchFactureTvas($term);
        $quotations = $this->searchQuotations($term);

        return response()->json([
            'clients' => $clients,
            'users' => $users,
            'products' => $products,
            'commandes' => $commandes,
            'tickets' => $tickets,
            'factures' => $factures,
            'facture_tvas' => $factureTvas,
            'quotations' => $quotations,
        ]);
    }

    private function searchClients(string $term): array
    {
        $rows = Client::query()
            ->where(function ($query) use ($term): void {
                $query->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone_1', 'like', $term)
                    ->orWhere('phone_2', 'like', $term);
            })
            ->orderBy('name')
            ->limit(self::LIMIT_PER_GROUP)
            ->get(['id', 'name', 'email', 'phone_1']);

        return $rows->map(fn (Client $r) => [
            'id' => $r->id,
            'label' => $r->name ?? '—',
            'subtitle' => implode(' · ', array_filter([$r->phone_1, $r->email])),
            'url' => ClientResource::getUrl('edit', ['record' => $r]),
            'icon' => 'heroicon-o-user',
        ])->all();
    }

    private function searchUsers(string $term): array
    {
        $rows = User::query()
            ->where(function ($query) use ($term): void {
                $query->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term);
            })
            ->orderBy('name')
            ->limit(self::LIMIT_PER_GROUP)
            ->get(['id', 'name', 'email', 'phone']);

        return $rows->map(fn (User $r) => [
            'id' => $r->id,
            'label' => $r->name ?? '—',
            'subtitle' => implode(' · ', array_filter([$r->email, $r->phone])),
            'url' => UserResource::getUrl('edit', ['record' => $r]),
            'icon' => 'heroicon-o-user-circle',
        ])->all();
    }

    private function searchProducts(string $term): array
    {
        $rows = Product::query()
            ->where(function ($query) use ($term): void {
                $query->where('designation_fr', 'like', $term)
                    ->orWhere('code_product', 'like', $term)
                    ->orWhere('slug', 'like', $term);
            })
            ->orderBy('designation_fr')
            ->limit(self::LIMIT_PER_GROUP)
            ->get(['id', 'designation_fr', 'code_product', 'prix']);

        return $rows->map(fn (Product $r) => [
            'id' => $r->id,
            'label' => $r->designation_fr ?? '—',
            'subtitle' => trim(($r->code_product ? "{$r->code_product} · " : '') . ($r->prix !== null ? number_format((float) $r->prix, 2, ',', ' ') . ' DT' : '')),
            'url' => ProductResource::getUrl('edit', ['record' => $r]),
            'icon' => 'heroicon-o-cube',
        ])->all();
    }

    private function searchCommandes(string $term): array
    {
        $rows = Commande::query()
            ->with('client:id,name,phone_1')
            ->where(function ($query) use ($term): void {
                $query->where('numero', 'like', $term)
                    ->orWhere('phone', 'like', $term)
                    ->orWhere('nom', 'like', $term)
                    ->orWhere('prenom', 'like', $term)
                    ->orWhereHas('client', fn ($q) => $q->where('name', 'like', $term)->orWhere('phone_1', 'like', $term));
            })
            ->orderByDesc('created_at')
            ->limit(self::LIMIT_PER_GROUP)
            ->get(['id', 'numero', 'phone', 'nom', 'prenom', 'prix_ttc', 'created_at', 'client_id']);

        return $rows->map(fn (Commande $r) => [
            'id' => $r->id,
            'label' => $r->numero ?? 'Commande #' . $r->id,
            'subtitle' => trim(($r->nom ?? '') . ' ' . ($r->prenom ?? '')) . ($r->prix_ttc !== null ? ' · ' . number_format((float) $r->prix_ttc, 2, ',', ' ') . ' DT' : ''),
            'url' => CommandeResource::getUrl('edit', ['record' => $r]),
            'icon' => 'heroicon-o-shopping-cart',
        ])->all();
    }

    private function searchTickets(string $term): array
    {
        $rows = Ticket::query()
            ->with('client:id,name,phone_1')
            ->where(function ($query) use ($term): void {
                $query->where('numero', 'like', $term)
                    ->orWhereHas('client', fn ($q) => $q->where('name', 'like', $term)->orWhere('phone_1', 'like', $term));
            })
            ->orderByDesc('created_at')
            ->limit(self::LIMIT_PER_GROUP)
            ->get(['id', 'numero', 'client_id', 'prix_total', 'date_ticket']);

        return $rows->map(fn (Ticket $r) => [
            'id' => $r->id,
            'label' => $r->numero ?? 'Ticket #' . $r->id,
            'subtitle' => $r->client ? $r->client->name : '' . ($r->prix_total !== null ? ' · ' . number_format((float) $r->prix_total, 2, ',', ' ') . ' DT' : ''),
            'url' => TicketResource::getUrl('edit', ['record' => $r]),
            'icon' => 'heroicon-o-ticket',
        ])->all();
    }

    private function searchFactures(string $term): array
    {
        $rows = Facture::query()
            ->with('client:id,name')
            ->where(function ($query) use ($term): void {
                $query->where('numero', 'like', $term)
                    ->orWhereHas('client', fn ($q) => $q->where('name', 'like', $term));
            })
            ->orderByDesc('created_at')
            ->limit(self::LIMIT_PER_GROUP)
            ->get(['id', 'numero', 'client_id', 'prix_ttc']);

        return $rows->map(fn (Facture $r) => [
            'id' => $r->id,
            'label' => $r->numero ?? 'BL #' . $r->id,
            'subtitle' => ($r->client ? $r->client->name : '') . ($r->prix_ttc !== null ? ' · ' . number_format((float) $r->prix_ttc, 2, ',', ' ') . ' DT' : ''),
            'url' => FactureResource::getUrl('edit', ['record' => $r]),
            'icon' => 'heroicon-o-document-text',
        ])->all();
    }

    private function searchFactureTvas(string $term): array
    {
        $rows = FactureTva::query()
            ->with('client:id,name')
            ->where(function ($query) use ($term): void {
                $query->where('numero', 'like', $term)
                    ->orWhereHas('client', fn ($q) => $q->where('name', 'like', $term)->orWhere('phone_1', 'like', $term));
            })
            ->orderByDesc('created_at')
            ->limit(self::LIMIT_PER_GROUP)
            ->get(['id', 'numero', 'client_id', 'prix_ttc', 'prix_total']);

        return $rows->map(fn (FactureTva $r) => [
            'id' => $r->id,
            'label' => $r->numero ?? 'Facture #' . $r->id,
            'subtitle' => trim(($r->client ? $r->client->name : '') . (($r->prix_ttc ?? $r->prix_total) !== null ? ' · ' . number_format((float) ($r->prix_ttc ?? $r->prix_total), 2, ',', ' ') . ' DT' : '')),
            'url' => FactureTvaResource::getUrl('edit', ['record' => $r]),
            'icon' => 'heroicon-o-document-duplicate',
        ])->all();
    }

    private function searchQuotations(string $term): array
    {
        $rows = Quotation::query()
            ->with('client:id,name')
            ->where(function ($query) use ($term): void {
                $query->where('numero', 'like', $term)
                    ->orWhereHas('client', fn ($q) => $q->where('name', 'like', $term)->orWhere('phone_1', 'like', $term));
            })
            ->orderByDesc('created_at')
            ->limit(self::LIMIT_PER_GROUP)
            ->get(['id', 'numero', 'client_id', 'prix_total']);

        return $rows->map(fn (Quotation $r) => [
            'id' => $r->id,
            'label' => $r->numero ?? 'Devis #' . $r->id,
            'subtitle' => ($r->client ? $r->client->name : '') . ($r->prix_total !== null ? ' · ' . number_format((float) $r->prix_total, 2, ',', ' ') . ' DT' : ''),
            'url' => QuotationResource::getUrl('edit', ['record' => $r]),
            'icon' => 'heroicon-o-document-text',
        ])->all();
    }
}
