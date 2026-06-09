<?php

namespace App\Mail;

use App\Models\Commande;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderConfirmedCustomerMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $mailLocale;

    public function __construct(public Commande $commande)
    {
        $this->mailLocale = app()->getLocale();
    }

    public function build(): static
    {
        $this->commande->loadMissing('details.product');
        if ($this->mailLocale === 'ar') {
            return $this
                ->subject('تم تأكيد طلبك رقم #' . $this->commande->numero . ' - SOBITAS')
                ->view('emails.orders.confirmed-customer-ar');
        }

        return $this
            ->subject('✅ Votre commande #' . $this->commande->numero . ' est confirmée — SOBITAS')
            ->view('emails.orders.confirmed-customer');
    }
}
