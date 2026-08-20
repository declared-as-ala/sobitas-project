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

    /**
     * ── THE SUBJECT LINE ────────────────────────────────────────────────────────────────────
     * It was "Comment s'est passée votre commande ? Donnez votre avis ⭐ — Protein.tn": a
     * question, an imperative, a star and a brand, in 62 characters, of which a phone shows about
     * 35. What arrived in the inbox was "Comment s'est passée votre comm…" — a line that could be
     * from any shop, about any order.
     *
     * The order number leads instead. It is the one string a customer can match to something they
     * remember doing, it survives truncation, and it makes the mail look like correspondence
     * rather than a campaign. The emoji goes for the same reason it goes everywhere else: it is
     * the visual signature of bulk mail.
     *
     * Reply-To is set to the shop. The body invites a reply — "on préfère régler le problème que
     * le découvrir dans un commentaire" — and an invitation to reply to a no-reply address is
     * worse than no invitation.
     */
    public function build(): static
    {
        $this->commande->loadMissing('details.product:id,slug,designation_fr,cover');

        $numero = trim((string) ($this->commande->numero ?? $this->commande->id));

        $contact = \App\Models\Coordinate::getCached();
        $replyTo = ($contact && ! empty($contact->email)) ? $contact->email : 'contact@protein.tn';

        return $this
            ->subject('Votre avis sur la commande #' . $numero)
            ->replyTo($replyTo, 'Protein.tn')
            ->view('emails.orders.review-request');
    }
}
