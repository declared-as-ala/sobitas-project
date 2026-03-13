<?php

namespace App\Filament\Pages\Auth;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Illuminate\Validation\Rule;

/**
 * Custom EditProfile page for Filament v4.
 *
 * Overrides the email field to:
 *  - add unique rule ignoring the current user (so updating with same email is allowed)
 *  - show a proper French error message when another user already has that email
 *
 * Registered in AdminPanelProvider via ->profile(EditProfile::class)
 */
class EditProfile extends \Filament\Livewire\Auth\EditProfile
{
    /**
     * Override the email form component to add unique validation
     * that ignores the currently authenticated user.
     */
    protected function getEmailFormComponent(): \Filament\Forms\Components\Component
    {
        $user = $this->getUser();

        return TextInput::make('email')
            ->label(__('filament-panels::pages/auth/edit-profile.form.email.label'))
            ->email()
            ->required()
            ->maxLength(255)
            ->unique(
                table: 'users',
                column: 'email',
                ignorable: $user,
            )
            ->validationMessages([
                'unique' => 'Cette adresse e-mail est déjà utilisée par un autre compte.',
            ]);
    }
}
