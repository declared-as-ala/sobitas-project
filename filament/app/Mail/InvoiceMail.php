<?php

namespace App\Mail;

use App\Models\Coordinate;
use App\Models\DetailsFactureTva;
use App\Models\FactureTva;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class InvoiceMail extends Mailable
{
    use Queueable, SerializesModels;

    public FactureTva $facture;
    public string $companyName;
    public string $clientName;
    public string $invoiceNumber;
    public string $invoiceDate;
    public string $invoiceTotal;

    public function __construct(FactureTva $facture)
    {
        $this->facture = $facture;

        $coordinate          = Coordinate::getCached();
        $this->companyName   = $coordinate?->abbreviation ?? $coordinate?->name ?? 'STE SOBITAS';
        $this->clientName    = $facture->client?->name ?? 'Client';
        $this->invoiceNumber = $facture->numero ?? (string) $facture->id;
        $this->invoiceDate   = $facture->date_facture
            ? \Carbon\Carbon::parse($facture->date_facture)->format('d/m/Y')
            : ($facture->created_at?->format('d/m/Y') ?? date('d/m/Y'));
        $this->invoiceTotal  = number_format((float) ($facture->prix_ttc ?? 0), 3, ',', ' ') . ' DT';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre facture #' . $this->invoiceNumber . ' — ' . $this->companyName,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.invoice',
        );
    }

    public function attachments(): array
    {
        try {
            $facture          = $this->facture->load('client');
            $details_facture  = DetailsFactureTva::where('facture_tva_id', $facture->id)
                ->with('product:id,designation_fr')
                ->get();
            $coordinate       = Coordinate::getCached() ?? Coordinate::first();
            $defaultTva       = (float) ($facture->tva ?? 19);

            $invoice_rows = $details_facture->map(function ($d, $i) use ($defaultTva) {
                $qte       = (int) ($d->qte ?? $d->quantite ?? 0);
                $pu_ht     = (float) ($d->prix_unitaire ?? 0);
                $tva_pct   = (float) ($d->tva ?? $defaultTva);
                $pu_ttc    = round($pu_ht * (1 + $tva_pct / 100), 3);
                $total_ht  = round($pu_ht * $qte, 3);
                $total_ttc = round($pu_ttc * $qte, 3);
                return [
                    'index'     => $i + 1,
                    'produit'   => $d->product->designation_fr ?? '—',
                    'qte'       => $qte,
                    'pu_ht'     => $pu_ht,
                    'tva_pct'   => $tva_pct,
                    'pu_ttc'    => $pu_ttc,
                    'total_ht'  => $total_ht,
                    'total_ttc' => $total_ttc,
                ];
            })->all();

            $data = [
                'facture'        => $facture,
                'details_facture' => $details_facture,
                'invoice_rows'   => $invoice_rows,
                'coordonnee'     => $coordinate,
                'company'        => $coordinate,
                'documentTitle'  => 'Facture TVA',
                'documentNumber' => $facture->numero ?? '',
                'documentDate'   => $this->invoiceDate,
                'client'         => $facture->client,
                'status'         => $facture->status?->value,
                'status_label'   => $facture->status?->label(),
                'totals'         => [
                    ['label' => 'Total HT',   'value' => number_format((float) ($facture->prix_ht ?? 0), 3, ',', ' ') . ' DT'],
                    ['label' => 'Remise',     'value' => number_format((float) ($facture->remise ?? 0), 3, ',', ' ') . ' DT'],
                    ['label' => 'TVA',        'value' => number_format((float) ($facture->tva ?? 0), 3, ',', ' ') . ' DT'],
                    ['label' => 'Timbre',     'value' => number_format((float) ($facture->timbre ?? 0), 3, ',', ' ') . ' DT'],
                    ['label' => 'TOTAL TTC',  'value' => number_format((float) ($facture->prix_ttc ?? 0), 3, ',', ' ') . ' DT', 'class' => 'ttc'],
                ],
                'footerNote'    => $coordinate && ! empty($coordinate->note) ? $coordinate->note : null,
                'paymentTerms'  => 'Paiement à réception. Virement bancaire ou espèces. Merci de préciser le n° de facture.',
                'forPdf'        => true,
            ];

            $year     = $facture->date_facture ? \Carbon\Carbon::parse($facture->date_facture)->format('Y') : ($facture->created_at?->format('Y') ?? date('Y'));
            $numero   = preg_replace('/[^A-Za-z0-9_\-]/', '-', (string) ($facture->numero ?? $facture->id));
            $filename = "FACTURE-TVA-{$year}-{$numero}.pdf";

            $pdfBytes = \Barryvdh\DomPDF\Facade\Pdf::loadView('print.facture-tva', $data)->output();

            return [
                Attachment::fromData(fn () => $pdfBytes, $filename)
                    ->withMime('application/pdf'),
            ];
        } catch (\Throwable $e) {
            Log::error('InvoiceMail: unable to generate PDF attachment', ['error' => $e->getMessage()]);
            return [];
        }
    }
}
