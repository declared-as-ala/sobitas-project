<?php

namespace App\Filament\Pages\Auth;

use Filament\Forms\Components\Component;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Support\Facades\Password;
use Filament\Pages\Auth\PasswordReset\ResetPassword as BaseResetPassword;

class ResetPassword extends BaseResetPassword
{
    public ?string $email = '';

    public ?string $password = '';

    public ?string $passwordConfirmation = '';

    public ?string $token = null;

    public function mount(?string $token = null, ?string $email = null): void
    {
        $this->token = $token;
        $this->email = $email ?? '';

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
            ->extraInputAttributes(['tabindex' => 1])
            ->disabled(fn () => ! empty($this->email));
    }

    protected function getPasswordFormComponent(): Component
    {
        return TextInput::make('password')
            ->label('New Password')
            ->password()
            ->required()
            ->rule('min:8')
            ->dehydrated()
            ->revealable()
            ->autocomplete('new-password')
            ->extraInputAttributes(['tabindex' => 2]);
    }

    protected function getPasswordConfirmationFormComponent(): Component
    {
        return TextInput::make('passwordConfirmation')
            ->label('Confirm New Password')
            ->password()
            ->required()
            ->same('password')
            ->dehydrated(false)
            ->revealable()
            ->autocomplete('new-password')
            ->extraInputAttributes(['tabindex' => 3]);
    }

    public function reset(): void
    {
        $data = $this->form->getState();

        $status = Password::broker('users')->reset(
            [
                'email' => $data['email'],
                'password' => $data['password'],
                'password_confirmation' => $data['passwordConfirmation'],
                'token' => $this->token,
            ],
            function (CanResetPassword $user, string $password): void {
                $user->password = $password;
                $user->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            Notification::make()
                ->title(__('filament-panels::pages/auth/password-reset/reset-password.messages.notification_recovered'))
                ->success()
                ->send();

            $this->redirect($this->getLoginUrl());
        } else {
            Notification::make()
                ->title(__('filament-panels::pages/auth/password-reset/reset-password.messages.notification_not_recovered', [
                    'status' => $status,
                ]))
                ->danger()
                ->send();
        }
    }

    protected function hasFullWidthFormActions(): bool
    {
        return true;
    }
}
