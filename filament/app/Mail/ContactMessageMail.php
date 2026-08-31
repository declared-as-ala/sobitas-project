<?php

namespace App\Mail;

use App\Models\Contact;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Queue\SerializesModels;

/**
 * The message a visitor typed on /contact, delivered to the shop.
 *
 * ── WHY THIS DID NOT EXIST UNTIL 20/08/2026 ──────────────────────────────────────────────────
 * ApisController::sendContact() validated three fields, called Contact::create(), and returned
 * "Votre message envoyé avec succès". Nothing was ever sent. Every message since the endpoint
 * shipped has been sitting in the `contacts` table waiting for somebody to open the Filament
 * admin and look — while the visitor was told, in those words, that it had been sent.
 *
 * The infrastructure was already here and already proven: mail.default is 'smtp', there are seven
 * other Mailables, and CommandeController sends an admin copy and a customer copy of every order
 * the same way. This is the one public form that was never wired to it.
 *
 * ── REPLY-TO IS THE WHOLE POINT ─────────────────────────────────────────────────────────────
 * The From address has to stay the configured sender or SPF/DKIM fail and the mail lands in spam.
 * So the visitor's address goes on Reply-To instead: hitting reply in the shop's inbox answers
 * the person who wrote, which is the entire workflow this form exists to start. Sending As the
 * visitor would break authentication for a convenience Reply-To already provides.
 */
class ContactMessageMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Contact $contact
    ) {}

    public function build(): static
    {
        $name = trim((string) $this->contact->name) ?: 'Visiteur';

        $mail = $this
            ->subject('[Contact] ' . $name . ' — protein.tn')
            ->view('emails.contact-message');

        // Guarded: an invalid address here would throw and lose the notification for a message
        // that is already safely persisted. Validation should make this unreachable; "should" is
        // not a reason to let a transport error swallow a customer enquiry.
        $email = (string) $this->contact->email;
        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $mail->replyTo(new Address($email, $name));
        }

        return $mail;
    }
}
