<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ConfirmNewsletterSubscriptionMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(public string $confirmationUrl) {}

    public function build(): static
    {
        return $this->from(config('marketing.from_address', config('mail.from.address')), 'Protein.tn')
            ->subject('Confirmez les offres Protein.tn')
            ->view('emails.newsletter-confirmation');
    }
}
