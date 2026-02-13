<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Client;
use App\Models\Coordinate;
use App\Models\DetailsFacture;
use App\Models\DetailsFactureTva;
use App\Models\DetailsQuotation;
use App\Models\DetailsTicket;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Message;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\Ticket;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InvoiceService
{
    public function __construct(
        private readonly SmsService $smsService,
    ) {}

    // ─── Facture (Bon de livraison) ─────────────────────────────────────

    /**
     * Create a new standard invoice (facture / bon de livraison).
     */
    public function storeFacture(array $data): Facture
    {
        return DB::transaction(function () use ($data): Facture {
            $clientId = $this->resolveClient($data);

            $facture = Facture::create([
                'client_id' => $clientId,
                'numero' => $this->generateNumber(Facture::class),
            ]);

            $totals = $this->processFactureItems($data['products'] ?? [], $facture);

            $remise = (float) ($data['remise'] ?? 0);
            $totalTtc = $totals['total_ht'] - $remise;

            $facture->update([
                'prix_ht' => $totals['total_ht'],
                'remise' => $remise,
                'prix_ttc' => max($totalTtc, 0),
            ]);

            return $facture->fresh();
        });
    }

    /**
     * Update an existing standard invoice.
     */
    public function updateFacture(int $id, array $data): Facture
    {
        return DB::transaction(function () use ($id, $data): Facture {
            $facture = Facture::findOrFail($id);

            // Restore stock from old details
            $this->restoreStockAndDeleteDetails($facture->details);

            // Process new items
            $totals = $this->processFactureItems($data['products'] ?? [], $facture);

            $remise = (float) ($data['remise'] ?? 0);
            $totalTtc = $totals['total_ht'] - $remise;

            $facture->update([
                'prix_ht' => $totals['total_ht'],
                'remise' => $remise,
                'prix_ttc' => max($totalTtc, 0),
            ]);

            return $facture->fresh();
        });
    }

    // ─── Facture TVA ────────────────────────────────────────────────────

    /**
     * Create a new VAT invoice.
     */
    public function storeFactureTva(array $data): FactureTva
    {
        return DB::transaction(function () use ($data): FactureTva {
            $clientId = $this->resolveClient($data);

            $facture = FactureTva::create([
                'client_id' => $clientId,
                'numero' => $this->generateNumber(FactureTva::class),
            ]);

            $totals = $this->processFactureTvaItems($data['products'] ?? [], $facture);

            $remise = (float) ($data['remise'] ?? 0);
            $timbre = (float) ($data['timbre'] ?? 0);
            $totalTtc = $this->calculateTvaTotals(
                $totals['total_ht'],
                $totals['total_tva'],
                $remise,
                $timbre
            );

            $facture->update([
                'prix_ht' => $totals['total_ht'],
                'tva' => $totals['total_tva'],
                'remise' => $remise,
                'timbre' => $timbre,
                'prix_ttc' => max($totalTtc, 0),
            ]);

            return $facture->fresh();
        });
    }

    /**
     * Update an existing VAT invoice.
     */
    public function updateFactureTva(int $id, array $data): FactureTva
    {
        return DB::transaction(function () use ($id, $data): FactureTva {
            $facture = FactureTva::findOrFail($id);

            // Restore stock from old details
            $this->restoreStockAndDeleteDetails($facture->details);

            // Process new items
            $totals = $this->processFactureTvaItems($data['products'] ?? [], $facture);

            $remise = (float) ($data['remise'] ?? 0);
            $timbre = (float) ($data['timbre'] ?? 0);
            $totalTtc = $this->calculateTvaTotals(
                $totals['total_ht'],
                $totals['total_tva'],
                $remise,
                $timbre
            );

            $facture->update([
                'prix_ht' => $totals['total_ht'],
                'tva' => $totals['total_tva'],
                'remise' => $remise,
                'timbre' => $timbre,
                'prix_ttc' => max($totalTtc, 0),
            ]);

            return $facture->fresh();
        });
    }

    // ─── Tickets ────────────────────────────────────────────────────────

    /**
     * Create a new ticket.
     */
    public function storeTicket(array $data): Ticket
    {
        return DB::transaction(function () use ($data): Ticket {
            $clientId = $this->resolveClient($data);

            $ticket = Ticket::create([
                'client_id' => $clientId,
                'numero' => $this->generateNumber(Ticket::class),
            ]);

            $totals = $this->processTicketItems($data['products'] ?? [], $ticket);

            $remise = (float) ($data['remise'] ?? 0);
            $totalTtc = $totals['total_ht'] - $remise;

            $ticket->update([
                'prix_ht' => $totals['total_ht'],
                'remise' => $remise,
                'prix_ttc' => max($totalTtc, 0),
            ]);

            return $ticket->fresh();
        });
    }

    /**
     * Update an existing ticket.
     */
    public function updateTicket(int $id, array $data): Ticket
    {
        return DB::transaction(function () use ($id, $data): Ticket {
            $ticket = Ticket::findOrFail($id);

            // Restore stock from old details
            $this->restoreStockAndDeleteDetails($ticket->details);

            // Process new items
            $totals = $this->processTicketItems($data['products'] ?? [], $ticket);

            $remise = (float) ($data['remise'] ?? 0);
            $totalTtc = $totals['total_ht'] - $remise;

            $ticket->update([
                'prix_ht' => $totals['total_ht'],
                'remise' => $remise,
                'prix_ttc' => max($totalTtc, 0),
            ]);

            return $ticket->fresh();
        });
    }

    // ─── Quotations (Devis) ─────────────────────────────────────────────

    /**
     * Create a new quotation (no stock decrement).
     */
    public function storeQuotation(array $data): Quotation
    {
        return DB::transaction(function () use ($data): Quotation {
            $clientId = $this->resolveClient($data);

            $quotation = Quotation::create([
                'client_id' => $clientId,
                'numero' => $this->generateNumber(Quotation::class),
            ]);

            $totals = $this->processQuotationItems($data['products'] ?? [], $quotation);

            $remise = (float) ($data['remise'] ?? 0);
            $timbre = (float) ($data['timbre'] ?? 0);
            $tva = Coordinate::first()?->tva ?? 19;

            $totalTva = ($totals['total_ht'] * $tva) / 100;
            $totalTtc = $this->calculateTvaTotals($totals['total_ht'], $totalTva, $remise, $timbre);

            $quotation->update([
                'prix_ht' => $totals['total_ht'],
                'tva' => $totalTva,
                'remise' => $remise,
                'timbre' => $timbre,
                'prix_ttc' => max($totalTtc, 0),
            ]);

            return $quotation->fresh();
        });
    }

    /**
     * Update an existing quotation (no stock operations).
     */
    public function updateQuotation(int $id, array $data): Quotation
    {
        return DB::transaction(function () use ($id, $data): Quotation {
            $quotation = Quotation::findOrFail($id);

            // Delete old detail items (no stock restore for quotations)
            $quotation->details()->delete();

            // Process new items
            $totals = $this->processQuotationItems($data['products'] ?? [], $quotation);

            $remise = (float) ($data['remise'] ?? 0);
            $timbre = (float) ($data['timbre'] ?? 0);
            $tva = Coordinate::first()?->tva ?? 19;

            $totalTva = ($totals['total_ht'] * $tva) / 100;
            $totalTtc = $this->calculateTvaTotals($totals['total_ht'], $totalTva, $remise, $timbre);

            $quotation->update([
                'prix_ht' => $totals['total_ht'],
                'tva' => $totalTva,
                'remise' => $remise,
                'timbre' => $timbre,
                'prix_ttc' => max($totalTtc, 0),
            ]);

            return $quotation->fresh();
        });
    }

    // ─── Internal Helpers ───────────────────────────────────────────────

    /**
     * Resolve or create client from form data. Sends welcome SMS for new clients.
     */
    public function resolveClient(array $data): int
    {
        if ((int) ($data['new_client'] ?? 0) === 1) {
            $client = Client::create([
                'name' => $data['name'] ?? null,
                'adresse' => $data['adresse'] ?? null,
                'phone_1' => $data['phone_1'] ?? null,
                'phone_2' => $data['phone_2'] ?? null,
                'matricule' => $data['matricule'] ?? null,
            ]);

            // Send welcome SMS
            if ($client->phone_1) {
                $msg = Message::first();
                $sms = $msg?->msg_welcome
                    ?? 'Cher(e) client(e), nous vous remercions de votre confiance et nous serons ravis de vous revoir dans notre boutique SOBITAS ou notre site Web Protein.tn';
                $this->smsService->send($client->phone_1, $sms);
            }

            return $client->id;
        }

        return (int) ($data['client_id'] ?? 0);
    }

    /**
     * Generate next sequential number for a model class within the current year.
     */
    public function generateNumber(string $modelClass): string
    {
        $count = $modelClass::whereYear('created_at', date('Y'))->count() + 1;

        return date('Y') . '/' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Process facture line items (without TVA). Decrements stock.
     *
     * @param array<int, array{produit_id: int, qte: int, prix_unitaire: float}> $products
     */
    private function processFactureItems(array $products, Facture $facture): array
    {
        $totalHt = 0.0;

        foreach ($products as $item) {
            $qte = (int) $item['qte'];
            $prixUnitaire = (float) $item['prix_unitaire'];
            $prixHt = $qte * $prixUnitaire;

            DetailsFacture::create([
                'facture_id' => $facture->id,
                'produit_id' => $item['produit_id'],
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ttc' => $prixHt,
            ]);

            Product::where('id', $item['produit_id'])->decrement('qte', $qte);

            $totalHt += $prixHt;
        }

        return ['total_ht' => $totalHt, 'total_ttc' => $totalHt];
    }

    /**
     * Process facture TVA line items (with TVA). Decrements stock.
     */
    private function processFactureTvaItems(array $products, FactureTva $facture): array
    {
        $totalHt = 0.0;
        $totalTva = 0.0;
        $totalTtc = 0.0;
        $taux = Coordinate::first()?->tva ?? 19;

        foreach ($products as $item) {
            $qte = (int) $item['qte'];
            $prixUnitaire = (float) $item['prix_unitaire'];
            $prixHt = $qte * $prixUnitaire;
            $montantTva = ($prixHt * $taux) / 100;
            $prixTtc = $prixHt + $montantTva;

            DetailsFactureTva::create([
                'facture_tva_id' => $facture->id,
                'produit_id' => $item['produit_id'],
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ht' => $prixHt,
                'tva' => $taux,
                'prix_ttc' => $prixTtc,
            ]);

            Product::where('id', $item['produit_id'])->decrement('qte', $qte);

            $totalHt += $prixHt;
            $totalTva += $montantTva;
            $totalTtc += $prixTtc;
        }

        return ['total_ht' => $totalHt, 'total_tva' => $totalTva, 'total_ttc' => $totalTtc];
    }

    /**
     * Process ticket line items. Decrements stock.
     */
    private function processTicketItems(array $products, Ticket $ticket): array
    {
        $totalHt = 0.0;

        foreach ($products as $item) {
            $qte = (int) $item['qte'];
            $prixUnitaire = (float) $item['prix_unitaire'];
            $prixHt = $qte * $prixUnitaire;

            DetailsTicket::create([
                'ticket_id' => $ticket->id,
                'produit_id' => $item['produit_id'],
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ttc' => $prixHt,
            ]);

            Product::where('id', $item['produit_id'])->decrement('qte', $qte);

            $totalHt += $prixHt;
        }

        return ['total_ht' => $totalHt, 'total_ttc' => $totalHt];
    }

    /**
     * Process quotation line items. Does NOT decrement stock (quotation only).
     */
    private function processQuotationItems(array $products, Quotation $quotation): array
    {
        $totalHt = 0.0;

        foreach ($products as $item) {
            $qte = (int) $item['qte'];
            $prixUnitaire = (float) $item['prix_unitaire'];
            $prixHt = $qte * $prixUnitaire;

            DetailsQuotation::create([
                'quotation_id' => $quotation->id,
                'produit_id' => $item['produit_id'],
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ttc' => $prixHt,
            ]);

            $totalHt += $prixHt;
        }

        return ['total_ht' => $totalHt];
    }

    /**
     * Calculate total TTC with TVA, discount, and timbre.
     */
    private function calculateTvaTotals(float $totalHt, float $totalTva, float $remise, float $timbre): float
    {
        if ($remise > 0 && $totalHt > 0) {
            $newHt = $totalHt - $remise;
            $pourcentage = $remise / $totalHt;
            $newTva = $totalTva - ($totalTva * $pourcentage);

            return $newHt + $newTva + $timbre;
        }

        return $totalHt + $totalTva + $timbre;
    }

    /**
     * Restore stock and delete detail items (used when updating invoices/tickets).
     */
    private function restoreStockAndDeleteDetails(iterable $details): void
    {
        foreach ($details as $detail) {
            Product::where('id', $detail->produit_id)->increment('qte', $detail->qte);
            $detail->delete();
        }
    }
}
