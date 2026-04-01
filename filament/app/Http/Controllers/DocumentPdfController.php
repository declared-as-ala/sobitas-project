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
            $coordonnee = \App\Models\Coordinate::getCached();
            $details_facture = DetailsFacture::where('facture_id', $facture->id)
                ->with('product:id,designation_fr,cover')
                ->get();
            $toFloat = static fn ($value): float => (float) str_replace(' ', '', (string) ($value ?? 0));
            $totalHt = $details_facture->sum(function ($d) use ($toFloat) {
                $qte = (float) ($d->qte ?? $d->quantite ?? 1);
                $pu = $toFloat($d->prix_unitaire ?? $d->prix_ht ?? 0);
                return $qte * $pu;
            });
            $remise = (float) ($facture->remise ?? 0);
            $frais = (float) ($facture->frais_livraison ?? 0);
            // BL is HT-only in this app, so TTC line total must stay qte * prix_unitaire.
            // This avoids multiplying an already-aggregated prix_ttc by quantity again.
            $totalTtc = $totalHt;
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
            $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float) $coordonnee->tva : 19;
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

            $totalsPdf = [
                ['label' => 'Total HT', 'value' => number_format($calcTotals['total_ht_brut'], 3, ',', ' ') . ' DT'],
            ];
            if ($calcTotals['remise'] > 0) {
                $totalsPdf[] = ['label' => 'Remise', 'value' => number_format($calcTotals['remise'], 3, ',', ' ') . ' DT'];
            }
            $totalsPdf[] = ['label' => 'TVA', 'value' => number_format($calcTotals['tva'], 3, ',', ' ') . ' DT'];
            $totalsPdf[] = ['label' => 'TOTAL TTC (Net à payer)', 'value' => number_format($calcTotals['net_a_payer'], 3, ',', ' ') . ' DT', 'class' => 'ttc'];

            $data = [
                'facture' => $factureTva,
                'details_facture' => $details_facture,
                'invoice_rows' => $invoice_rows,
                'calcTotals' => $calcTotals,
                'coordonnee' => $coordonnee,
                'company' => $coordonnee,
                'documentTitle' => 'Facture',
                'documentNumber' => $factureTva->numero ?? '',
                'documentDate' => $factureTva->date_facture ? \Carbon\Carbon::parse($factureTva->date_facture)->format('d/m/Y') : ($factureTva->created_at?->format('d/m/Y') ?? ''),
                'client' => $factureTva->client,
                'status' => $factureTva->status ? $factureTva->status->value : null,
                'status_label' => $factureTva->status ? $factureTva->status->label() : null,
                'totals' => $totalsPdf,
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

            $detailsForCalc = $details_facture->map(fn ($d) => [
                'produit_id' => $d->produit_id,
                'qte' => (int) ($d->qte ?? $d->quantite ?? 1),
                'prix_unitaire' => (float) ($d->prix_unitaire ?? 0),
                'tva_pct' => (float) ($d->tva ?? $defaultTva),
            ])->toArray();
            $calcTotals = \App\Services\InvoiceCalculator::calculate(
                $detailsForCalc,
                (float) ($quotation->remise ?? 0),
                (float) ($quotation->timbre ?? 0),
                $defaultTva
            );

            $totals = [
                ['label' => 'Total HT', 'value' => number_format($calcTotals['total_ht_brut'], 3, ',', ' ') . ' DT'],
            ];
            if ($calcTotals['remise'] > 0) {
                $totals[] = ['label' => 'Remise', 'value' => number_format($calcTotals['remise'], 3, ',', ' ') . ' DT'];
            }
            $totals[] = ['label' => 'TVA', 'value' => number_format($calcTotals['tva'], 3, ',', ' ') . ' DT'];
            if ($calcTotals['timbre'] > 0) {
                $totals[] = ['label' => 'Timbre', 'value' => number_format($calcTotals['timbre'], 3, ',', ' ') . ' DT'];
            }
            $totals[] = ['label' => 'TOTAL TTC (Net à payer)', 'value' => number_format($calcTotals['net_a_payer'], 3, ',', ' ') . ' DT', 'class' => 'ttc'];

            $data = [
                'facture' => $quotation,
                'details_facture' => $details_facture,
                'devis_lines' => $devis_lines,
                'calcTotals' => $calcTotals,
                'coordonnee' => $coordonnee,
                'company' => $coordonnee,
                'documentTitle' => 'Devis',
                'documentNumber' => $quotation->numero ?? '',
                'documentDate' => $quotation->date_quotation ? \Carbon\Carbon::parse($quotation->date_quotation)->format('d/m/Y') : ($quotation->created_at?->format('d/m/Y') ?? ''),
                'client' => $quotation->client,
                'totals' => $totals,
                'footerNote' => $coordonnee && ! empty($coordonnee->note) ? $coordonnee->note : null,
                'noteDevis' => $coordonnee ? ($coordonnee->note_devis ?? null) : null,
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
