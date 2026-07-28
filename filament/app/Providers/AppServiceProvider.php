<?php

namespace App\Providers;

use App\Filament\Widgets\TopCategoriesListWidget;
use App\Filament\Widgets\TopRegionsWidget;
use App\Models\Article;
use App\Models\BlogCategory;
use App\Models\BlogTag;
use App\Models\Brand;
use App\Models\Categ;
use App\Models\Commande;
use App\Models\Page;
use App\Models\Product;
use App\Models\Review;
use App\Models\SousCategory;
use App\Models\User;
use App\Observers\CommandeObserver;
use App\Observers\ProductSeoObserver;
use App\Observers\ReviewObserver;
use App\Observers\SitemapTouchObserver;
use App\Observers\UserObserver;
use Filament\Facades\Filament;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\URL;
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
        // Force all URL/asset generation to use APP_URL regardless of the Host header
        // received by PHP-FPM (which may differ from the public domain when behind a
        // reverse proxy like Nginx Proxy Manager).
        $appUrl = rtrim((string) config('app.url'), '/');
        if ($appUrl) {
            URL::forceRootUrl($appUrl);
            if (str_starts_with($appUrl, 'https://')) {
                URL::forceScheme('https');
            }
        }

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

        // Self-healing SEO: auto-fill empty meta title/description + image alt on every product save
        Product::observe(ProductSeoObserver::class);

        // Keep /sitemap.xml current. Products already refresh it through ProductSeoObserver, but
        // every OTHER content type that appears in the sitemap used to leave it stale for up to an
        // hour after a change. Each of these models owns URLs in the sitemap, so each must bust it.
        foreach ([Categ::class, SousCategory::class, Brand::class, Article::class, Page::class, BlogCategory::class, BlogTag::class] as $sitemapModel) {
            if (class_exists($sitemapModel)) {
                $sitemapModel::observe(SitemapTouchObserver::class);
            }
        }
    }
}
