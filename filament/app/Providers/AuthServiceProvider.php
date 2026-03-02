<?php

namespace App\Providers;

use Filament\Facades\Filament;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
    ];

    /**
     * Register any authentication / authorization services.
     * Laravel 11+ AuthServiceProvider has no boot() — do not call parent::boot().
     */
    public function boot(): void
    {
        if (method_exists(get_parent_class($this), 'boot')) {
            parent::boot();
        }
        \Illuminate\Support\Facades\Gate::define('accessFilament', function ($user) {
            if (! $user instanceof \App\Models\User) {
                return false;
            }
            try {
                return $user->canAccessPanel(Filament::getPanel('admin'));
            } catch (\Throwable $e) {
                return true;
            }
        });
    }
}
