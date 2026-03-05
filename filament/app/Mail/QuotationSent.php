<?php

namespace App\Mail;

use App\Models\Quotation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Barryvdh\DomPDF\Facade\Pdf;

class QuotationSent extends Mailable
{
    use Queueable, SerializesModels;

    public Quotation $quotation;
    public string $customMessage;

    /**
     * Create a new message instance.
     */
    public function __construct(Quotation $quotation, string $customMessage)
    {
        $this->quotation = $quotation;
        $this->customMessage = $customMessage;
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
            view: 'emails.quotation-sent',
            with: [
                'customMessage' => $this->customMessage,
                'quotation' => $this->quotation,
            ]
        );
    }

    /**
     * Get the attachments for the message.
     * We generate the PDF on the fly using the exact same logic as 'quotations.print'
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $this->quotation->load('client', 'details');
        
        $coordonnee = \App\Models\Coordinate::first();

        // Exact same payload as the print template to guarantee 1:1 match
        $data = [
            'facture' => $this->quotation, // The view uses 'facture' variable name generically
            'details_facture' => $this->quotation->details, // The view iterates 'details_facture'
            'coordonnee' => $coordonnee,
            'company' => $coordonnee,
            'documentTitle' => 'Devis',
            'documentNumber' => $this->quotation->numero ?? '',
            'documentDate' => $this->quotation->date_quotation ? \Carbon\Carbon::parse($this->quotation->date_quotation)->format('d/m/Y') : ($this->quotation->created_at?->format('d/m/Y') ?? ''),
            'client' => $this->quotation->client,
            'totals' => [
                ['label' => 'Total HT', 'value' => number_format((float)($this->quotation->prix_ht ?? $this->quotation->prix_total ?? 0), 3, ',', ' ') . ' DT'],
                ['label' => 'TVA', 'value' => number_format((float)($this->quotation->tva ?? 0), 3, ',', ' ') . ' DT'],
                ['label' => 'Net à payer TTC', 'value' => number_format((float)($this->quotation->prix_ttc ?? $this->quotation->prix_total ?? 0), 3, ',', ' ') . ' DT', 'class' => 'ttc'],
            ],
            'footerNote' => $coordonnee && !empty($coordonnee->note) ? $coordonnee->note : null,
            'paymentTerms' => 'Valable 30 jours. Paiement à la commande ou à la livraison.',
            'forPdf' => true,
        ];

        $pdf = Pdf::loadView('print.quotation', $data)->output();

        $filename = 'Devis_' . str_replace('/', '-', $this->quotation->numero) . '.pdf';

        return [
            Attachment::fromData(fn () => $pdf, $filename)
                ->withMime('application/pdf'),
        ];
    }
}
