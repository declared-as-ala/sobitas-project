<?php

namespace App\Filament\Pages\Auth;

use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;

/**
 * Custom ForgotPassword page for Filament v4.
 *
 * Overrides the "request()" action to:
 *  - Use the same SMTP path as order confirmation emails (via User::sendPasswordResetNotification)
 *  - Show a proper SUCCESS toast ONLY when the email is actually sent
 *  - Show a proper ERROR toast when sending fails
 *  - Never show "email envoyé" as a fake success
 */
class RequestPasswordReset extends \Filament\Auth\Pages\PasswordReset\RequestPasswordReset
{
    protected function sendPasswordResetLink(array $data): void
    {
        $email = $data['email'];

        Log::info('ForgotPassword: attempting to send reset link', ['email' => $email]);

        try {
            $status = Password::broker(config('auth.defaults.passwords'))
                ->sendResetLink(['email' => $email]);
        } catch (\Throwable $e) {
            Log::error('ForgotPassword: exception while sending reset link', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            Notification::make()
                ->title('Erreur d\'envoi')
                ->body('Une erreur est survenue lors de l\'envoi de l\'email. Veuillez réessayer plus tard.')
                ->danger()
                ->send();

            // Halt — don't show the fake success
            return;
        }

        Log::info('ForgotPassword: broker returned status', [
            'email'  => $email,
            'status' => $status,
        ]);

        if ($status === Password::RESET_LINK_SENT) {
            // Real success — only now show the toast
            Notification::make()
                ->title('Email envoyé')
                ->body('Un lien de réinitialisation de mot de passe a été envoyé à votre adresse e-mail.')
                ->success()
                ->send();
        } else {
            // Broker returned an error code (e.g. user not found, throttled…)
            // Map status codes to French messages
            $message = match ($status) {
                Password::INVALID_USER  => 'Aucun compte trouvé avec cette adresse e-mail.',
                Password::RESET_THROTTLED => 'Vous avez déjà demandé un lien. Veuillez patienter avant de réessayer.',
                default => 'Impossible d\'envoyer le lien. Statut : ' . __($status),
            };

            Log::warning('ForgotPassword: reset link not sent', [
                'email'   => $email,
                'status'  => $status,
            ]);

            Notification::make()
                ->title('Erreur')
                ->body($message)
                ->danger()
                ->send();
        }
    }
}
