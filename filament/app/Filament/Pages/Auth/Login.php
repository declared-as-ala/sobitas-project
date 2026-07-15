<?php

namespace App\Filament\Pages\Auth;

class Login extends \Filament\Auth\Pages\Login
{
    public function mount(): void
    {
        parent::mount();

        // Do NOT pre-fill a real admin email — it publicly discloses a valid admin username.
        $this->form->fill([
            'email' => '',
            'password' => '',
            'remember' => true,
        ]);
    }
}
