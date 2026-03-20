<?php

namespace App\Mail;

use App\Models\Commande;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderConfirmedCustomerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Commande $commande
    ) {}

    public function build(): static
    {
        $this->commande->loadMissing('details.product');
        return $this
            ->subject('✅ Votre commande #' . $this->commande->numero . ' est confirmée — SOBITAS')
            ->view('emails.orders.confirmed-customer');
    }
}
