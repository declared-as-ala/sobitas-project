<?php

namespace App\Mail;

use App\Models\Commande;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderStatusCustomerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Commande $commande)
    {
    }

    public function build(): static
    {
        $status = Commande::getStatusLabel((string) $this->commande->etat);

        return $this
            ->subject('Commande #' . $this->commande->numero . ' — ' . $status . ' | Protein.tn')
            ->view('emails.orders.status-customer');
    }
}
