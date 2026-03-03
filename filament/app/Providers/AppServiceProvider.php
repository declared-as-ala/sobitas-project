<?php

namespace App\Providers;

use App\Models\Commande;
use App\Models\Review;
use App\Models\User;
use App\Observers\CommandeObserver;
use App\Observers\ReviewObserver;
use App\Observers\UserObserver;
use Filament\Facades\Filament;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Set custom password reset URL for Filament panel
        ResetPassword::createUrlUsing(function ($notifiable, $token) {
            $panel = Filament::getPanel('admin');
            return $panel->getResetPasswordUrl($token, $notifiable->getEmailForPasswordReset());
        });

        // Database notifications: new commandes, new avis, new users
        Commande::observe(CommandeObserver::class);
        Review::observe(ReviewObserver::class);
        User::observe(UserObserver::class);
    }
}
