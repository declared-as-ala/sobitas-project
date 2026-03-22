<?php

namespace App\Providers;

use App\Filament\Widgets\TopCategoriesListWidget;
use App\Filament\Widgets\TopRegionsWidget;
use App\Models\Article;
use App\Models\Categ;
use App\Models\Commande;
use App\Models\Coordinate;
use App\Models\Page;
use App\Models\Product;
use App\Models\Review;
use App\Models\Slide;
use App\Models\User;
use App\Observers\ArticleImageObserver;
use App\Observers\CategImageObserver;
use App\Observers\CommandeObserver;
use App\Observers\CoordinateImageObserver;
use App\Observers\PageImageObserver;
use App\Observers\ProductImageObserver;
use App\Observers\ReviewObserver;
use App\Observers\SlideImageObserver;
use App\Observers\UserObserver;
use Filament\Facades\Filament;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Livewire\Livewire;

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
        // Ensure Livewire can resolve Filament widgets (avoids "Unable to find component" after deploy/cache)
        Livewire::component(TopCategoriesListWidget::class);
        Livewire::component(TopRegionsWidget::class);

        // Set custom password reset URL for Filament panel
        ResetPassword::createUrlUsing(function ($notifiable, $token) {
            $panel = Filament::getPanel('admin');
            return $panel->getResetPasswordUrl($token, $notifiable->getEmailForPasswordReset());
        });

        // Database notifications: new commandes, new avis, new users
        Commande::observe(CommandeObserver::class);
        Review::observe(ReviewObserver::class);
        User::observe(UserObserver::class);

        // Automatic WebP conversion on image upload
        Product::observe(ProductImageObserver::class);
        Article::observe(ArticleImageObserver::class);
        Categ::observe(CategImageObserver::class);
        Slide::observe(SlideImageObserver::class);
        Page::observe(PageImageObserver::class);
        Coordinate::observe(CoordinateImageObserver::class);
    }
}
