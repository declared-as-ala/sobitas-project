<?php

namespace App\Mail;

use App\Models\Commande;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Post-delivery review request. Sent once after delivery (reviews:send-due-requests, or
 * App\Observers\CommandeObserver when the delay is 0), and at most once more as a reminder
 * (`$reminder = true`, reviews:send-due-requests' second pass) when no review came back. Links to
 * /avis/{order_token} where the customer can rate the products they bought without logging in.
 */
class ReviewRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  bool  $reminder  The one follow-up: a "Rappel" subject and a one-line reminder intro.
     *                          Shared with the view as `$reminder`.
     */
    public function __construct(public Commande $commande, public bool $reminder = false)
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

        // Same shape as the first subject, so the two read as one conversation in the inbox, with
        // the order number still inside what a phone shows before truncating.
        $subject = $this->reminder
            ? 'Rappel — votre avis sur la commande #' . $numero
            : 'Votre avis sur la commande #' . $numero;

        return $this
            ->subject($subject)
            ->replyTo($replyTo, 'Protein.tn')
            ->view('emails.orders.review-request', ['reminder' => $this->reminder]);
    }
}
