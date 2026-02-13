<?php

namespace App\Filament\Pages\Auth;

use Filament\Actions\Action;
use Filament\Facades\Filament;

class Login extends \Filament\Auth\Pages\Login
{
    public function mount(): void
    {
        parent::mount();

        $this->form->fill([
            'email' => 'admin@filamentphp.com',
            'password' => 'demo.Filament@2021!',
            'remember' => true,
        ]);
    }

    /**
     * Override Filament v4's password reset action to add "Mot de passe oublié?" link.
     */
    public function passwordResetAction(): Action
    {
        return Action::make('passwordReset')
            ->link()
            ->label('Mot de passe oublié ?')
            ->url(fn () => Filament::getRequestPasswordResetUrl());
    }
}
