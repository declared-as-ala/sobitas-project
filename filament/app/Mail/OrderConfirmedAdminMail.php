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
        $total = number_format((float) $this->commande->prix_ttc, 2, ',', ' ');
        return $this
            ->subject('Nouvelle commande ' . $this->commande->numero . ' — ' . $total . ' TND')
            ->view('emails.orders.confirmed-admin');
    }
}
