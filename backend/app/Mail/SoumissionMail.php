<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SoumissionMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $data;
    public ?string $fromAddress;

    /**
     * Create a new message instance.
     */
    public function __construct(array $data, ?string $fromAddress = null)
    {
        $this->data = $data;
        $this->fromAddress = $fromAddress;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            from: $this->fromAddress ?? config('mail.from.address', 'contact@protein.tn'),
            subject: 'Protein.TN | Suivi de commande',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.SoumissionMail',
        );
    }
}
