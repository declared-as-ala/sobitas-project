<?php

namespace App\Mail;

use App\Models\Quotation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class QuotationSent extends Mailable
{
    use Queueable, SerializesModels;

    protected array $sharedData;

    /**
     * Create a new message instance.
     */
    public function __construct(Quotation $quotation, string $customMessage)
    {
        $this->quotation = $quotation;
        $this->customMessage = $customMessage;

        $this->quotation->load('client', 'details.product:id,designation_fr');
        $coordonnee = \App\Models\Coordinate::first();
        $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float) $coordonnee->tva : 19;
        $devis_lines = \App\Services\DevisCalculator::lines($this->quotation->details, $defaultTva)['lines'];

        $q = $this->quotation;
        $totals = [
            ['label' => 'Totale HT', 'value' => number_format((float) ($q->prix_ht ?? 0), 3, ',', ' ') . ' DT'],
        ];
        if (($q->remise ?? 0) > 0) {
            $totals[] = ['label' => 'Remise', 'value' => number_format((float) $q->remise, 3, ',', ' ') . ' DT'];
        }
        $totals[] = ['label' => 'TVA', 'value' => number_format((float) ($q->tva ?? 0), 3, ',', ' ') . ' DT'];
        $totals[] = ['label' => 'Totale TTC', 'value' => number_format((float) ($q->prix_ttc ?? 0), 3, ',', ' ') . ' DT', 'class' => 'ttc'];

        $this->sharedData = [
            'facture' => $this->quotation,
            'details_facture' => $this->quotation->details,
            'devis_lines' => $devis_lines,
            'totals' => $totals,
            'coordonnee' => $coordonnee,
            'company' => $coordonnee,
            'documentTitle' => 'Devis',
            'documentNumber' => $this->quotation->numero ?? '',
            'documentDate' => $this->quotation->date_quotation ? \Carbon\Carbon::parse($this->quotation->date_quotation)->format('d/m/Y') : ($this->quotation->created_at?->format('d/m/Y') ?? ''),
            'client' => $this->quotation->client,
            'customMessage' => $customMessage,
            'noteDevis' => $coordonnee ? ($coordonnee->note_devis ?? null) : null,
            'paymentTerms' => 'Valable 30 jours. Paiement à la commande ou à la livraison.',
            'forPdf' => true,
        ];
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Devis #' . $this->quotation->numero,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.documents.devis',
            with: $this->sharedData
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        if (! app()->bound('dompdf.wrapper')) {
            return [];
        }

        $pdf = app('dompdf.wrapper')->loadView('print.devis', $this->sharedData)->output();

        $numero = (string) ($this->quotation->numero ?? $this->quotation->id);
        $safeNumero = str_replace('/', '-', $numero);
        $filename = 'Devis_' . $safeNumero . '.pdf';

        return [
            Attachment::fromData(fn () => $pdf, $filename)
                ->withMime('application/pdf'),
        ];
    }
}
