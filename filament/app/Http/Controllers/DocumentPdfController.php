<?php

namespace App\Http\Controllers;

use App\Models\DetailsFacture;
use App\Models\DetailsFactureTva;
use App\Models\DetailsQuotation;
use App\Models\DetailsTicket;
use App\Models\Facture;
use App\Models\FactureTva;
use App\Models\Quotation;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class DocumentPdfController extends Controller
{
    private static function pdfFacadeExists(): bool
    {
        return class_exists(\Barryvdh\DomPDF\Facade\Pdf::class);
    }
    /**
     * Sanitize filename for PDF download (ASCII-safe).
     */
    private static function sanitizeFilename(string $base, string $ext = 'pdf'): string
    {
        $safe = preg_replace('/[^A-Za-z0-9_\-]/', '-', $base);
        $safe = preg_replace('/-+/', '-', trim($safe, '-'));
        return ($safe !== '' ? $safe : 'document') . '.' . $ext;
    }

    /**
     * BL (Bon de Livraison) → PDF download.
     *
     * @return Response|RedirectResponse
     */
    public function downloadFacture(Facture $facture)
    {
        try {
            $facture->load('client');
            $details_facture = DetailsFacture::where('facture_id', $facture->id)
                ->with('product:id,designation_fr,cover')
                ->get();
            $totalHt = $details_facture->sum(fn($d) => ($d->qte ?? $d->quantite ?? 1) * ($d->prix_unitaire ?? $d->prix_ht ?? 0));
            $remise = (float) ($facture->remise ?? 0);
            $frais = (float) ($facture->frais_livraison ?? 0);
            // Assuming no TVA for BL based on current logic, so TTC = HT. 
            // If the system has prix_ttc per line, we sum that. If not, it falls back to HT.
            $totalTtc = $details_facture->sum(fn($d) => ($d->qte ?? $d->quantite ?? 1) * ($d->prix_ttc ?? $d->prix_unitaire ?? $d->prix_ht ?? 0));
            $netAPayer = max($totalTtc - $remise + $frais, 0);

            $data = [
                'facture' => $facture,
                'details_facture' => $details_facture,
                'coordonnee' => $coordonnee,
                'company' => $coordonnee,
                'documentTitle' => 'Bon de Livraison',
                'documentNumber' => $facture->numero,
                'documentDate' => $facture->created_at?->format('d/m/Y'),
                'client' => $facture->client,
                'calc_total_ht' => $totalHt,
                'calc_remise' => $remise,
                'calc_frais' => $frais,
                'calc_net_a_payer' => $netAPayer,
                'calc_pourcentage_remise' => (float) ($facture->pourcentage_remise ?? 0),
                'footerNote' => $coordonnee && ! empty($coordonnee->note) ? $coordonnee->note : null,
                'paymentTerms' => 'Paiement à la livraison ou par virement.',
                'forPdf' => true,
            ];

            $year = $facture->created_at?->format('Y') ?? date('Y');
            $numero = (string) ($facture->numero ?? $facture->id);
            $filename = self::sanitizeFilename("BL-{$year}-{$numero}", 'pdf');

            if (! self::pdfFacadeExists()) {
                return redirect()->back()->with('error', __('Le package PDF (barryvdh/laravel-dompdf) n’est pas installé. Exécutez : composer require barryvdh/laravel-dompdf'));
            }
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('print.bon-de-livraison', $data);
            return $pdf->download($filename, ['Attachment' => true]);
        } catch (\Throwable $e) {
            Log::error('DocumentPdfController::downloadFacture', ['id' => $facture->id, 'error' => $e->getMessage()]);
            return redirect()->back()->with('error', __('Erreur lors de la génération du PDF.'));
        }
    }

    /**
     * Facture TVA → PDF download.
     *
     * @return Response|RedirectResponse
     */
    public function downloadFactureTva(FactureTva $factureTva)
    {
        try {
            $factureTva->load('client');
            $details_facture = DetailsFactureTva::where('facture_tva_id', $factureTva->id)
                ->with('product:id,designation_fr')
                ->get();
            $coordonnee = \App\Models\Coordinate::first();
            $defaultTva = (float) ($factureTva->tva ?? 19);
            $calcTotals = \App\Services\InvoiceCalculator::calculate(
                $details_facture->toArray(),
                (float) ($factureTva->remise ?? 0),
                (float) ($factureTva->timbre ?? 0),
                $defaultTva
            );

            $invoice_rows = $details_facture->map(function ($d, $i) use ($defaultTva) {
                $qte = (int) ($d->qte ?? $d->quantite ?? 0);
                $pu_ht = (float) ($d->prix_unitaire ?? 0);
                $tva_pct = (float) ($d->tva ?? $defaultTva);
                $pu_ttc = round($pu_ht * (1 + $tva_pct / 100), 3);
                $total_ht = round($pu_ht * $qte, 3);
                $total_ttc = round($pu_ttc * $qte, 3);
                return [
                    'index' => $i + 1,
                    'produit' => $d->product->designation_fr ?? '—',
                    'qte' => $qte,
                    'pu_ht' => $pu_ht,
                    'tva_pct' => $tva_pct,
                    'pu_ttc' => $pu_ttc,
                    'total_ht' => $total_ht,
                    'total_ttc' => $total_ttc,
                ];
            })->all();

            $data = [
                'facture' => $factureTva,
                'details_facture' => $details_facture,
                'invoice_rows' => $invoice_rows,
                'coordonnee' => $coordonnee,
                'company' => $coordonnee,
                'documentTitle' => 'Facture',
                'documentNumber' => $factureTva->numero ?? '',
                'documentDate' => $factureTva->date_facture ? \Carbon\Carbon::parse($factureTva->date_facture)->format('d/m/Y') : ($factureTva->created_at?->format('d/m/Y') ?? ''),
                'client' => $factureTva->client,
                'status' => $factureTva->status ? $factureTva->status->value : null,
                'status_label' => $factureTva->status ? $factureTva->status->label() : null,
                'totals' => [
                    ['label' => 'Total HT', 'value' => number_format($calcTotals['total_ht_brut'], 3, ',', ' ') . ' DT'],
                    ['label' => 'Remise', 'value' => number_format($calcTotals['remise'], 3, ',', ' ') . ' DT'],
                    ['label' => 'TVA', 'value' => number_format($calcTotals['tva'], 3, ',', ' ') . ' DT'],
                    ['label' => 'Timbre', 'value' => number_format($calcTotals['timbre'], 3, ',', ' ') . ' DT'],
                    ['label' => 'TOTAL TTC', 'value' => number_format($calcTotals['prix_ttc'], 3, ',', ' ') . ' DT'],
                    ['label' => 'NET À PAYER', 'value' => number_format($calcTotals['net_a_payer'], 3, ',', ' ') . ' DT', 'class' => 'net-a-payer'],
                ],
                'footerNote' => $coordonnee && ! empty($coordonnee->note) ? $coordonnee->note : null,
                'paymentTerms' => 'Paiement à réception. Virement bancaire ou espèces. Merci de préciser le n° de facture.',
                'forPdf' => true,
            ];

            $year = $factureTva->date_facture ? \Carbon\Carbon::parse($factureTva->date_facture)->format('Y') : ($factureTva->created_at?->format('Y') ?? date('Y'));
            $numero = (string) ($factureTva->numero ?? $factureTva->id);
            $filename = self::sanitizeFilename("FACTURE-TVA-{$year}-{$numero}", 'pdf');

            if (! self::pdfFacadeExists()) {
                return redirect()->back()->with('error', __('Le package PDF (barryvdh/laravel-dompdf) n’est pas installé. Exécutez : composer require barryvdh/laravel-dompdf'));
            }
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('print.facture-tva', $data);
            return $pdf->download($filename, ['Attachment' => true]);
        } catch (\Throwable $e) {
            Log::error('DocumentPdfController::downloadFactureTva', ['id' => $factureTva->id, 'error' => $e->getMessage()]);
            return redirect()->back()->with('error', __('Erreur lors de la génération du PDF.'));
        }
    }

    /**
     * Devis (Quotation) → PDF download.
     */
    public function downloadQuotation(Quotation $quotation): Response
    {
        try {
            $quotation->load('client');
            $details_facture = DetailsQuotation::where('quotation_id', $quotation->id)
                ->with('product:id,designation_fr')
                ->get();
            $coordonnee = \App\Models\Coordinate::first();
            $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float) $coordonnee->tva : 19;
            $devis_lines = \App\Services\DevisCalculator::lines($details_facture, $defaultTva)['lines'];

            $data = [
                'facture' => $quotation,
                'details_facture' => $details_facture,
                'devis_lines' => $devis_lines,
                'coordonnee' => $coordonnee,
                'company' => $coordonnee,
                'documentTitle' => 'Devis',
                'documentNumber' => $quotation->numero ?? '',
                'documentDate' => $quotation->date_quotation ? \Carbon\Carbon::parse($quotation->date_quotation)->format('d/m/Y') : ($quotation->created_at?->format('d/m/Y') ?? ''),
                'client' => $quotation->client,
                'totals' => [
                    ['label' => 'Total HT', 'value' => number_format((float) ($quotation->prix_ht ?? $quotation->prix_total ?? 0), 3, ',', ' ') . ' DT'],
                    ['label' => 'TVA', 'value' => number_format((float) ($quotation->tva ?? 0), 3, ',', ' ') . ' DT'],
                    ['label' => 'Net à payer TTC', 'value' => number_format((float) ($quotation->prix_ttc ?? $quotation->prix_total ?? 0), 3, ',', ' ') . ' DT', 'class' => 'ttc'],
                ],
                'footerNote' => $coordonnee && ! empty($coordonnee->note) ? $coordonnee->note : null,
                'paymentTerms' => 'Valable 30 jours. Paiement à la commande ou à la livraison.',
                'forPdf' => true,
            ];

            $year = $quotation->date_quotation ? \Carbon\Carbon::parse($quotation->date_quotation)->format('Y') : ($quotation->created_at?->format('Y') ?? date('Y'));
            $numero = (string) ($quotation->numero ?? $quotation->id);
            $filename = self::sanitizeFilename("DEVIS-{$year}-{$numero}", 'pdf');

            if (! self::pdfFacadeExists()) {
                return redirect()->back()->with('error', __('Le package PDF (barryvdh/laravel-dompdf) n’est pas installé. Exécutez : composer require barryvdh/laravel-dompdf'));
            }
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('print.devis', $data);
            return $pdf->download($filename, ['Attachment' => true]);
        } catch (\Throwable $e) {
            Log::error('DocumentPdfController::downloadQuotation', ['id' => $quotation->id, 'error' => $e->getMessage()]);
            return redirect()->back()->with('error', __('Erreur lors de la génération du PDF.'));
        }
    }

    /**
     * Ticket → PDF download.
     *
     * @return Response|RedirectResponse
     */
    public function downloadTicket(Ticket $ticket)
    {
        try {
            $ticket->load('client');
            $details_ticket = DetailsTicket::where('ticket_id', $ticket->id)
                ->with('product:id,designation_fr')
                ->get();
            $coordonnee = \App\Models\Coordinate::getCached();
            $documentDate = $ticket->date_ticket ? \Carbon\Carbon::parse($ticket->date_ticket)->format('d/m/Y') : ($ticket->created_at?->format('d/m/Y') ?? '');
            $documentTime = $ticket->created_at?->format('H:i') ?? '';

            $data = [
                'ticket' => $ticket,
                'details_ticket' => $details_ticket,
                'coordonnee' => $coordonnee,
                'company' => $coordonnee,
                'documentDate' => $documentDate,
                'documentTime' => $documentTime,
                'forPdf' => true,
            ];

            $numero = (string) ($ticket->numero ?? $ticket->id);
            $filename = self::sanitizeFilename("TICKET-{$numero}", 'pdf');

            if (! self::pdfFacadeExists()) {
                return redirect()->back()->with('error', __('Le package PDF (barryvdh/laravel-dompdf) n’est pas installé. Exécutez : composer require barryvdh/laravel-dompdf'));
            }
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('print.ticket', $data);
            return $pdf->download($filename, ['Attachment' => true]);
        } catch (\Throwable $e) {
            Log::error('DocumentPdfController::downloadTicket', ['id' => $ticket->id, 'error' => $e->getMessage()]);
            return redirect()->back()->with('error', __('Erreur lors de la génération du PDF.'));
        }
    }
}
