<?php

namespace App\Filament\Pages\Auth;

use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;

/**
 * Custom ForgotPassword page for Filament v4.
 *
 * Extends the built-in RequestPasswordReset page.
 * The base class namespace in Filament v4 (based on filesystem path
 * src/Auth/Pages/PasswordReset/RequestPasswordReset.php) is:
 * \Filament\Auth\Pages\PasswordReset\RequestPasswordReset
 *
 * The method that handles sending is "request()" — we override it
 * to show proper success/failure toasts rather than static success.
 */
class RequestPasswordReset extends \Filament\Auth\Pages\PasswordReset\RequestPasswordReset
{
    // Override the core action that sends the password reset link.
    // In Filament v4 the built-in method is "request()" — we call
    // Password::sendResetLink() directly and react to the status code.
    public function request(): void
    {
        $data  = $this->form->getState();
        $email = $data['email'] ?? '';

        Log::info('ForgotPassword: attempting to send reset link', ['email' => $email]);

        try {
            $status = Password::broker(config('auth.defaults.passwords'))
                ->sendResetLink(['email' => $email]);
        } catch (\Throwable $e) {
            Log::error('ForgotPassword: exception while sending reset link', [
                'email' => $email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            Notification::make()
                ->title('Erreur d\'envoi')
                ->body('Une erreur est survenue lors de l\'envoi de l\'email. Veuillez réessayer plus tard.')
                ->danger()
                ->send();

            return;
        }

        Log::info('ForgotPassword: broker returned status', [
            'email'  => $email,
            'status' => $status,
        ]);

        if ($status === Password::RESET_LINK_SENT) {
            Notification::make()
                ->title('Email envoyé ✅')
                ->body('Un lien de réinitialisation a été envoyé à votre adresse e-mail.')
                ->success()
                ->send();
        } else {
            $message = match ($status) {
                Password::INVALID_USER    => 'Aucun compte trouvé avec cette adresse e-mail.',
                Password::RESET_THROTTLED => 'Vous avez déjà demandé un lien récemment. Veuillez patienter avant de réessayer.',
                default                   => 'Impossible d\'envoyer le lien. Code : ' . $status,
            };

            Log::warning('ForgotPassword: reset link not sent', [
                'email'  => $email,
                'status' => $status,
            ]);

            Notification::make()
                ->title('Erreur')
                ->body($message)
                ->danger()
                ->send();
        }
    }
}
