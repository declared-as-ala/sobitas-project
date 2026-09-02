<?php

namespace App\Mail;

use App\Models\Commande;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderConfirmedAdminMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Commande $commande
    ) {}

    public function build(): static
    {
        $this->commande->loadMissing('details.product');
        $total = number_format((float) $this->commande->prix_ttc, 3, '.', ' ');
        $name = trim((string) ($this->commande->livraison_nom ?: $this->commande->nom));
        $mail = $this
            ->subject('Nouvelle commande #' . $this->commande->numero . ' — ' . $total . ' TND' . ($name !== '' ? ' — ' . $name : ''))
            ->view('emails.orders.confirmed-admin')
            ->text('emails.orders.confirmed-admin-text');

        $customerEmail = trim((string) ($this->commande->livraison_email ?: $this->commande->email));
        if (filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            $mail->replyTo($customerEmail, $name !== '' ? $name : 'Client Protein.tn');
        }

        return $mail;
    }
}
