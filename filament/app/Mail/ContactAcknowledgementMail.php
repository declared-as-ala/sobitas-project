<?php

namespace App\Mail;

use App\Models\Contact;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * The receipt the visitor gets back, so "message sent" stops being a claim the site makes about
 * itself and becomes something the visitor can see in their own inbox.
 *
 * It is deliberately short and contains no marketing: it confirms what was received, says when to
 * expect an answer, and offers the two channels that are faster than email in this market
 * (telephone and WhatsApp). A Tunisian shopper who does not hear back within the hour will reach
 * for WhatsApp anyway — this tells them the number rather than making them look for it.
 *
 * Sending it must never be able to fail the request: see the try/catch in
 * ApisController::sendContact(). The message is already stored and the admin copy already sent by
 * the time this is attempted.
 */
class ContactAcknowledgementMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Contact $contact
    ) {}

    public function build(): static
    {
        return $this
            ->subject($this->contact->requested_product ? 'Votre demande de produit est reçue — Protein.tn' : 'Nous avons bien reçu votre message — Protein.tn')
            ->view('emails.contact-acknowledgement');
    }
}
