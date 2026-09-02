<?php

namespace App\Notifications;

use App\Support\StorefrontUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The "choose a new password" email.
 *
 * ── WHY THIS REPLACES LARAVEL'S BUILT-IN ONE ────────────────────────────────────────────────
 * The framework's `ResetPassword` notification builds its link with `route('password.reset')` —
 * a route on the API host that does not exist here, because the reset FORM lives on the Next.js
 * storefront. Left alone it would either throw a RouteNotFoundException while sending, or mail a
 * link to admin.protein.tn that shows the customer a 404.
 *
 * So the URL is composed against `app.frontend_url`, in the exact shape the storefront's
 * /reset-password screen reads: `?token=…&email=…`.
 *
 * The copy is deliberately flat. A password-reset mail is read by someone who is mildly annoyed
 * and wants one link; a gradient hero and a "Votre sécurité nous tient à cœur !" paragraph both
 * delay that link and make the message look less like it came from a real shop.
 */
class ResetPasswordLink extends Notification
{
    use Queueable;

    public function __construct(public string $token)
    {
    }

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $email = (string) ($notifiable->getEmailForPasswordReset() ?? $notifiable->email ?? '');

        $url = StorefrontUrl::to('/reset-password')
            . '?token=' . urlencode($this->token)
            . '&email=' . urlencode($email);

        // Minutes, from the broker config, so the email cannot claim a different lifetime from
        // the one the token actually has (config/auth.php → passwords.users.expire).
        $minutes = (int) config('auth.passwords.'
            . config('auth.defaults.passwords') . '.expire', 60);

        return (new MailMessage())
            ->subject('Réinitialiser votre mot de passe — Protein.tn')
            ->view('emails.auth.reset-password', [
                'url'          => $url,
                'name'         => trim((string) ($notifiable->name ?? '')),
                'expiryHours'  => max(1, (int) round($minutes / 60)),
                'expiryMinutes' => $minutes,
            ])
            ->text('emails.auth.reset-password-text', [
                'url' => $url,
                'name' => trim((string) ($notifiable->name ?? '')),
                'expiryMinutes' => $minutes,
            ]);
    }
}
