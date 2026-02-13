<?php

namespace App\Filament\Pages\Auth;

use Filament\Forms\Components\Component;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Illuminate\Contracts\Auth\PasswordBroker;
use Illuminate\Support\Facades\Password;
use Filament\Pages\Auth\PasswordReset\RequestPasswordReset as BaseRequestPasswordReset;

class RequestPasswordReset extends BaseRequestPasswordReset
{
    public ?string $email = '';

    public function mount(): void
    {
        parent::mount();
    }

    protected function getEmailFormComponent(): Component
    {
        return TextInput::make('email')
            ->label('Email')
            ->email()
            ->required()
            ->autocomplete()
            ->autofocus()
            ->extraInputAttributes(['tabindex' => 1]);
    }

    public function request(): void
    {
        $data = $this->form->getState();

        $status = Password::broker('users')->sendResetLink(
            ['email' => $data['email']]
        );

        if ($status === Password::RESET_LINK_SENT) {
            Notification::make()
                ->title('Password reset link sent!')
                ->body('If an account exists with that email, we have sent a password reset link.')
                ->success()
                ->send();

            $this->form->fill();
        } else {
            Notification::make()
                ->title('Unable to send reset link')
                ->body('We were unable to process your request. Please try again later.')
                ->danger()
                ->send();
        }
    }

    protected function hasFullWidthFormActions(): bool
    {
        return true;
    }
}
