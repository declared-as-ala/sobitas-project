<?php

namespace App\Filament\Affilie\Pages\Auth;

use App\Filament\Pages\Auth\Login as BaseLogin;

/**
 * The affiliate panel's OWN login page — distinct from the admin login. It reuses the base Login's
 * authenticate() machinery and blanked-field mount() untouched (so nothing about the auth flow
 * changes), and only swaps the view for a professional, affiliate-branded two-panel layout.
 */
class AffilieLogin extends BaseLogin
{
    protected string $view = 'filament.affilie.auth.login';
}
