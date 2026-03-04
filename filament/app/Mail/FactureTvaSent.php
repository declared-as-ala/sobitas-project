<?php

namespace App\Mail;

use App\Models\DetailsFactureTva;
use App\Models\FactureTva;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class FactureTvaSent extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public FactureTva $factureTva
    ) {
        $this->factureTva->load('client');
    }

    public function build(): static
    {
        $factureTva = $this->factureTva;
        $details_facture = DetailsFactureTva::where('facture_tva_id', $factureTva->id)
            ->with('product:id,designation_fr')
            ->get();
        $coordonnee = \App\Models\Coordinate::first();
        $defaultTva = (float) ($factureTva->tva ?? 19);
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
            'documentTitle' => 'Facture TVA',
            'documentNumber' => $factureTva->numero ?? '',
            'documentDate' => $factureTva->date_facture ? \Carbon\Carbon::parse($factureTva->date_facture)->format('d/m/Y') : ($factureTva->created_at?->format('d/m/Y') ?? ''),
            'client' => $factureTva->client,
            'status' => $factureTva->status ? $factureTva->status->value : null,
            'status_label' => $factureTva->status ? $factureTva->status->label() : null,
            'totals' => [
                ['label' => 'Total HT', 'value' => number_format((float) ($factureTva->prix_ht ?? 0), 3, ',', ' ') . ' DT'],
                ['label' => 'Remise', 'value' => number_format((float) ($factureTva->remise ?? 0), 3, ',', ' ') . ' DT'],
                ['label' => 'TVA', 'value' => number_format((float) ($factureTva->tva ?? 0), 3, ',', ' ') . ' DT'],
                ['label' => 'Timbre', 'value' => number_format((float) ($factureTva->timbre ?? 0), 3, ',', ' ') . ' DT'],
                ['label' => 'TOTAL TTC', 'value' => number_format((float) ($factureTva->prix_ttc ?? 0), 3, ',', ' ') . ' DT', 'class' => 'ttc'],
            ],
            'footerNote' => $coordonnee && ! empty($coordonnee->note) ? $coordonnee->note : null,
            'paymentTerms' => 'Paiement à réception. Virement bancaire ou espèces. Merci de préciser le n° de facture.',
            'forPdf' => true,
        ];

        $numero = (string) ($factureTva->numero ?? $factureTva->id);
        $year = $factureTva->date_facture ? \Carbon\Carbon::parse($factureTva->date_facture)->format('Y') : ($factureTva->created_at?->format('Y') ?? date('Y'));
        $filename = preg_replace('/[^A-Za-z0-9_\-]/', '-', "FACTURE-TVA-{$year}-{$numero}");
        $filename = preg_replace('/-+/', '-', trim($filename, '-'));
        $filename = ($filename !== '' ? $filename : 'document') . '.pdf';

        $pdf = null;
        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('print.facture-tva', $data);
        }

        $mail = $this
            ->subject('Votre facture #' . $numero)
            ->view('emails.facture-tva-sent', ['factureTva' => $factureTva, 'numero' => $numero]);

        if ($pdf !== null) {
            $mail->attachData($pdf->output(), $filename, ['mime' => 'application/pdf']);
        }

        return $mail;
    }
}
