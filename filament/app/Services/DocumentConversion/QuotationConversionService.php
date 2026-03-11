<?php

namespace App\Services\DocumentConversion;

use App\Enums\BlStatus;
use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Coordinate;
use App\Models\DetailsFacture;
use App\Models\DetailsFactureTva;
use App\Models\DetailsTicket;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Quotation;
use App\Models\Ticket;
use App\Services\InvoiceCalculator;
use App\Services\NumberSequenceService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class QuotationConversionService
{
    public function __construct(
        protected NumberSequenceService $numberSequence
    ) {}

    /**
     * Convert a quotation to an order. Copies header + lines with snapshots, sets commande.quotation_id.
     */
    public function convertToOrder(Quotation $quotation): Commande
    {
        return DB::transaction(function () use ($quotation) {
            $quotation->load('details.product');

            $commande = new Commande();
            $commande->quotation_id = $quotation->id;
            $nb = Commande::whereYear('created_at', date('Y'))->count() + 1;
            $commande->numero = date('Y') . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);
            $commande->etat = Commande::STATUS_NEW;

            $client = $quotation->client;
            if ($client) {
                $commande->nom = $client->name;
                $commande->prenom = '';
                $commande->email = $client->email ?? null;
                $commande->phone = $client->phone_1 ?? null;
                $commande->adresse1 = $client->adresse ?? null;
                $commande->user_id = $client->id;
            }
            $commande->prix_ht = (float) ($quotation->prix_ht ?? $quotation->prix_total ?? 0);
            $commande->prix_ttc = (float) ($quotation->prix_ttc ?? $quotation->prix_total ?? 0);
            $commande->remise = (float) ($quotation->remise ?? 0);
            $commande->frais_livraison = 0;
            $commande->save();

            foreach ($quotation->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = (int) ($line->qte ?? $line->quantite ?? 1);
                $pu = (float) ($line->prix_unitaire ?? 0);
                $detail = new CommandeDetail();
                $detail->commande_id = $commande->id;
                $detail->produit_id = $line->produit_id;
                $detail->qte = $qte;
                $detail->prix_unitaire = $pu;
                $detail->prix_ht = $qte * $pu;
                $detail->prix_ttc = $qte * $pu;
                $detail->save();
            }

            $this->audit('quotation.converted_to_order', $quotation, [
                'quotation_id' => $quotation->id,
                'commande_id' => $commande->id,
            ]);

            return $commande->fresh(['details']);
        });
    }

    /**
     * Convert a quotation to a Ticket (ticket de caisse). Same client + lines; no commande link.
     */
    public function convertToTicket(Quotation $quotation): Ticket
    {
        return DB::transaction(function () use ($quotation) {
            $quotation->load('details.product');

            $ticket = new Ticket();
            $ticket->type = Ticket::TYPE_TICKET_CAISSE;
            $ticket->commande_id = null;
            $ticket->client_id = $quotation->client_id;
            $year = date('Y');
            $nb = Ticket::whereYear('created_at', $year)->count() + 1;
            $ticket->numero = $year . '/' . str_pad((string) $nb, 4, '0', STR_PAD_LEFT);
            $ticket->prix_ht = (float) ($quotation->prix_ht ?? $quotation->prix_total ?? 0);
            $ticket->prix_ttc = (float) ($quotation->prix_ttc ?? $quotation->prix_total ?? 0);
            $ticket->remise = (float) ($quotation->remise ?? 0);
            $ticket->timbre = (float) ($quotation->timbre ?? 0);
            if (Schema::hasColumn('tickets', 'date_ticket')) {
                $ticket->date_ticket = now()->toDateString();
            }
            $ticket->save();

            foreach ($quotation->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = (int) ($line->qte ?? $line->quantite ?? 1);
                $pu = (float) ($line->prix_unitaire ?? 0);
                $lineHt = $qte * $pu;
                $attrs = [
                    'ticket_id' => $ticket->id,
                    'produit_id' => $line->produit_id,
                    'quantite' => $qte,
                    'prix_unitaire' => $pu,
                ];
                if (Schema::hasColumn('details_tickets', 'qte')) {
                    $attrs['qte'] = $qte;
                }
                if (Schema::hasColumn('details_tickets', 'prix_ht')) {
                    $attrs['prix_ht'] = $lineHt;
                }
                if (Schema::hasColumn('details_tickets', 'prix_ttc')) {
                    $attrs['prix_ttc'] = $lineHt;
                }
                DetailsTicket::create($attrs);
            }

            $this->audit('quotation.converted_to_ticket', $quotation, [
                'quotation_id' => $quotation->id,
                'ticket_id' => $ticket->id,
            ]);

            return $ticket->fresh(['details']);
        });
    }

    /**
     * Convert a quotation to a Facture TVA. Same client + lines; remise/timbre/TVA from quotation or default.
     * Uses InvoiceCalculator so net_a_payer and all totals are persisted (list view shows correct values).
     */
    public function convertToFactureTva(Quotation $quotation): FactureTva
    {
        return DB::transaction(function () use ($quotation) {
            $quotation->load('details.product');

            $coordinate = Coordinate::getCached();
            $defaultTvaPct = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
            $remise = (float) ($quotation->remise ?? 0);
            $timbre = (float) ($quotation->timbre ?? 0);

            $details = [];
            foreach ($quotation->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $details[] = [
                    'produit_id' => $line->produit_id,
                    'qte' => (int) ($line->qte ?? $line->quantite ?? 1),
                    'prix_unitaire' => (float) ($line->prix_unitaire ?? 0),
                    'tva_pct' => (float) ($line->tva ?? $defaultTvaPct),
                ];
            }
            $totals = InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTvaPct);

            $invoice = new FactureTva();
            $invoice->client_id = $quotation->client_id;
            $invoice->commande_id = null;
            $invoice->source_ticket_id = null;
            $invoice->numero = $this->numberSequence->nextFacture();
            $invoice->status = InvoiceStatus::Issued;
            if (Schema::hasColumn('facture_tvas', 'date_facture')) {
                $invoice->date_facture = now()->toDateString();
            }
            $invoice->prix_ht = $totals['total_ht_brut'];
            $invoice->remise = $totals['remise'];
            $invoice->timbre = $totals['timbre'];
            $invoice->prix_ht_apres_remise = $totals['prix_ht_apres_remise'];
            $invoice->tva = $totals['tva'];
            $invoice->prix_ttc = $totals['prix_ttc'];
            $invoice->net_a_payer = $totals['net_a_payer'];
            if (Schema::hasColumn('facture_tvas', 'pourcentage_remise')) {
                $invoice->pourcentage_remise = $totals['pourcentage_remise'];
            }
            if (Schema::hasColumn('facture_tvas', 'prix_total')) {
                $invoice->prix_total = $totals['prix_ttc'];
            }
            $invoice->save();

            foreach ($quotation->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = (int) ($line->qte ?? $line->quantite ?? 1);
                $pu = (float) $line->prix_unitaire;
                $lineHt = $qte * $pu;
                $tvaPct = (float) ($line->tva ?? $defaultTvaPct);
                $tvaAmount = $lineHt * $tvaPct / 100;
                DetailsFactureTva::create([
                    'facture_tva_id' => $invoice->id,
                    'produit_id' => $line->produit_id,
                    'qte' => $qte,
                    'prix_unitaire' => $pu,
                    'prix_ht' => $lineHt,
                    'tva' => $tvaPct,
                    'prix_ttc' => $lineHt + $tvaAmount,
                ]);
            }

            $this->audit('quotation.converted_to_facture_tva', $quotation, [
                'quotation_id' => $quotation->id,
                'facture_tva_id' => $invoice->id,
            ]);

            return $invoice->fresh(['details']);
        });
    }

    /**
     * Convert a quotation to a Bon de livraison (Facture BL). Same client + lines; commande_id null.
     * BL is HT only: no TVA. Uses InvoiceCalculator with defaultTva=0.
     */
    public function convertToBl(Quotation $quotation): Facture
    {
        return DB::transaction(function () use ($quotation) {
            $quotation->load('details.product');

            $remise = (float) ($quotation->remise ?? 0);
            $timbre = (float) ($quotation->timbre ?? 0);

            $details = [];
            foreach ($quotation->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $details[] = [
                    'produit_id' => $line->produit_id,
                    'qte' => (int) ($line->qte ?? $line->quantite ?? 1),
                    'prix_unitaire' => (float) ($line->prix_unitaire ?? 0),
                    'tva_pct' => 0,
                ];
            }
            $totals = InvoiceCalculator::calculate($details, $remise, $timbre, 0);

            $bl = new Facture();
            $bl->commande_id = null;
            $bl->client_id = $quotation->client_id;
            $bl->numero = $this->numberSequence->nextBl();
            $bl->status = BlStatus::Draft;
            $bl->prix_ht = $totals['total_ht_brut'];
            $bl->remise = $totals['remise'];
            $bl->pourcentage_remise = $totals['pourcentage_remise'];
            $bl->prix_ht_apres_remise = $totals['prix_ht_apres_remise'];
            $bl->tva = $totals['tva'];
            $bl->timbre = $totals['timbre'];
            $bl->prix_ttc = $totals['prix_ttc'];
            $bl->net_a_payer = $totals['net_a_payer'];
            $bl->save();

            foreach ($quotation->details as $line) {
                if (! $line->produit_id) {
                    continue;
                }
                $qte = (int) ($line->qte ?? $line->quantite ?? 1);
                $pu = (float) ($line->prix_unitaire ?? 0);
                $detail = new DetailsFacture();
                $detail->facture_id = $bl->id;
                $detail->produit_id = $line->produit_id;
                $detail->qte = $qte;
                $detail->prix_unitaire = $pu;
                if (Schema::hasColumn('details_factures', 'prix_ttc')) {
                    $detail->prix_ttc = $qte * $pu;
                }
                $detail->save();
            }

            $this->audit('quotation.converted_to_bl', $quotation, [
                'quotation_id' => $quotation->id,
                'facture_id' => $bl->id,
            ]);

            return $bl->fresh(['details']);
        });
    }

    protected function audit(string $action, $entity, array $after = []): void
    {
        if (! class_exists(AuditLog::class) || ! Schema::hasTable('audit_logs')) {
            return;
        }
        AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'entity_type' => $entity instanceof Quotation ? 'quotation' : get_class($entity),
            'entity_id' => $entity->id,
            'after' => $after,
        ]);
    }
}
