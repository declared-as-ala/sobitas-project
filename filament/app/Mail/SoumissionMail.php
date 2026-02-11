<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SoumissionMail extends Mailable
{
    use Queueable, SerializesModels;

    public $data;
    public $fromAddress;

    /**
     * Create a new message instance.
     */
    public function __construct(array $data, ?string $fromAddress = null)
    {
        $this->data = $data;
        $this->fromAddress = $fromAddress;
    }

    /**
     * Build the message.
     */
    public function build(): static
    {
        $from = $this->fromAddress ?? 'contact@protein.tn';

        return $this->from($from)
            ->subject('Protein.TN | Suivi de commande')
            ->view('emails.SoumissionMail');
    }
}
