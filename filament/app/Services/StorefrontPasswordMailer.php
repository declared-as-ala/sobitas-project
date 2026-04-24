<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

/**
 * Sends storefront (Next.js) password reset links — not Filament admin URLs.
 */
class StorefrontPasswordMailer
{
    public function sendResetLinkForUser(User $user): void
    {
        $token = Password::broker('users')->createToken($user);
        $base = rtrim((string) config('services.frontend_url', 'https://protein.tn'), '/');
        $resetUrl = $base . '/reset-password?token=' . urlencode($token) . '&email=' . urlencode($user->email);
        $fromAddr = config('mail.from.address', 'noreply@protein.tn');
        $fromName = config('mail.from.name', 'Protein.tn');
        $expiry = (int) config('auth.passwords.users.expire', 60);

        Mail::send([], [], function ($message) use ($user, $resetUrl, $fromAddr, $fromName, $expiry) {
            $message
                ->to($user->email, $user->name)
                ->from($fromAddr, $fromName)
                ->subject('Réinitialisation de votre mot de passe — Protein.tn')
                ->html(
                    view('mail.password-reset', [
                        'resetUrl' => $resetUrl,
                        'user'     => $user,
                        'expiry'   => $expiry,
                    ])->render()
                );
        });

        Log::info('StorefrontPasswordMailer: reset link sent', ['to' => $user->email]);
    }
}
