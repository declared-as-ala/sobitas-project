<?php

namespace App\Mail;

use App\Models\Commande;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Post-delivery review request. Sent once, when an order is marked delivered
 * (see App\Observers\CommandeObserver). Links to /avis/{order_token} where the
 * customer can rate the products they bought without logging in.
 */
class ReviewRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Commande $commande)
    {
    }

    public function build(): static
    {
        $this->commande->loadMissing('details.product:id,slug,designation_fr,cover');

        return $this
            ->subject('Comment s\'est passée votre commande ? Donnez votre avis ⭐ — Protein.tn')
            ->view('emails.orders.review-request');
    }
}
