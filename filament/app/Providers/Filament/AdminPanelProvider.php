<?php

namespace App\Providers\Filament;

use App\Filament\Pages\Auth\Login;
use App\Filament\Pages\Dashboard;
use App\Filament\Pages\Profile;
use App\Filament\Pages\SendSms;
use App\Filament\Resources\AnnonceResource;
use App\Filament\Resources\ArticleResource;
use App\Filament\Resources\BrandResource;
use App\Filament\Resources\CategResource;
use App\Filament\Resources\ClientResource;
use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\ContactResource;
use App\Filament\Resources\CoordinateResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\FaqResource;
use App\Filament\Resources\MessageResource;
use App\Filament\Resources\NewsletterResource;
use App\Filament\Resources\ProductPriceListResource;
use App\Filament\Resources\ProductResource;
use App\Filament\Resources\QuotationResource;
use App\Filament\Resources\RedirectionResource;
use App\Filament\Resources\ReviewResource;
use App\Filament\Resources\SeoPageResource;
use App\Filament\Resources\ServiceResource;
use App\Filament\Resources\SlideResource;
use App\Filament\Resources\SousCategoryResource;
use App\Filament\Resources\TicketResource;
use App\Filament\Resources\UserResource;
use App\Filament\Widgets\LatestCommandes;
use App\Filament\Widgets\MonthlyRevenueComparison;
use App\Filament\Widgets\OrderStatusChart;
use App\Filament\Widgets\RevenueChart;
use App\Filament\Widgets\StatsOverview;
use App\Filament\Widgets\TopProductsWidget;
use App\Filament\Widgets\DashboardHeaderWidget;
use App\Filament\Widgets\DashboardAlertsWidget;
use App\Filament\Widgets\MarketplaceKpis;
use App\Filament\Widgets\MultiMetricChart;
use App\Filament\Widgets\OrderFunnelChart;
use App\Filament\Widgets\TopCategoriesChart;
use App\Filament\Widgets\GeographicChart;
use App\Filament\Widgets\DelayedOrdersTable;
use App\Filament\Widgets\LowStockTable;
use App\Filament\Widgets\TopCustomersTable;
use App\Filament\Widgets\ReturnsRefundsTable;
use App\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Navigation\NavigationGroup;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets\AccountWidget;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->login(Login::class)
            ->passwordReset()
            ->renderHook(
                'panels::head.end',
                fn (): string => '
                    <link rel="stylesheet" href="' . asset('css/filament/admin/custom-sidebar.css') . '" />
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.css" />
                '
            )
            ->renderHook(
                'panels::body.end',
                fn (): string => '
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.js"></script>
                    <script src="' . asset('js/filament/admin/sidebar-hover.js') . '"></script>
                '
            )
            // ── PERFORMANCE: Explicit registration instead of filesystem discovery ──
            // discoverResources/discoverPages/discoverWidgets use Symfony Finder
            // to scan directories. On Docker Windows volumes, each stat() call
            // takes 10-50ms. With 33+ files, that's 300-1600ms wasted PER REQUEST.
            // Explicit registration eliminates ALL filesystem scanning.
            ->resources([
                AnnonceResource::class,
                ArticleResource::class,
                BrandResource::class,
                CategResource::class,
                ClientResource::class,
                CommandeResource::class,
                ContactResource::class,
                CoordinateResource::class,
                FactureResource::class,
                FactureTvaResource::class,
                FaqResource::class,
                MessageResource::class,
                NewsletterResource::class,
                ProductPriceListResource::class,
                ProductResource::class,
                QuotationResource::class,
                RedirectionResource::class,
                ReviewResource::class,
                SeoPageResource::class,
                ServiceResource::class,
                SlideResource::class,
                SousCategoryResource::class,
                TicketResource::class,
                UserResource::class,
            ])
            ->pages([
                Dashboard::class,
                Profile::class,
                SendSms::class,
            ])
            ->widgets([
                AccountWidget::class,
                DashboardHeaderWidget::class,
                DashboardAlertsWidget::class,
                MarketplaceKpis::class,
                MultiMetricChart::class,
                OrderFunnelChart::class,
                TopCategoriesChart::class,
                GeographicChart::class,
                DelayedOrdersTable::class,
                LowStockTable::class,
                TopCustomersTable::class,
                ReturnsRefundsTable::class,
                StatsOverview::class,
                RevenueChart::class,
                OrderStatusChart::class,
                TopProductsWidget::class,
                MonthlyRevenueComparison::class,
                LatestCommandes::class,
            ])
            ->unsavedChangesAlerts()
            ->brandLogo(fn () => view('filament.app.logo'))
            ->brandLogoHeight('1.25rem')
            ->navigationGroups([
                NavigationGroup::make('Paramètres du site')
                    ->icon('heroicon-o-cog-6-tooth')
                    ->collapsed(),
                NavigationGroup::make('Commandes')
                    ->icon('heroicon-o-shopping-cart'),
                NavigationGroup::make('Facturation')
                    ->icon('heroicon-o-document-text'),
                NavigationGroup::make('Clients')
                    ->icon('heroicon-o-users'),
                NavigationGroup::make('Catalogue')
                    ->icon('heroicon-o-cube'),
                NavigationGroup::make('Blog')
                    ->icon('heroicon-o-newspaper'),
                NavigationGroup::make('Marketing')
                    ->icon('heroicon-o-megaphone')
                    ->collapsed(),
                NavigationGroup::make('SEO')
                    ->icon('heroicon-o-magnifying-glass')
                    ->collapsed(),
                NavigationGroup::make('Système')
                    ->icon('heroicon-o-wrench-screwdriver')
                    ->collapsed(),
            ])
            ->sidebarCollapsibleOnDesktop()
            // Database notifications — poll every 120s to reduce AJAX overhead
            ->databaseNotifications()
            ->databaseNotificationsPolling('120s')
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ])
            // SPA mode — navigations are AJAX-based, no full page reloads
            ->spa()
            ->colors([
                'primary' => Color::Blue,
                'danger'  => Color::Rose,
                'gray'    => Color::Slate,
                'info'    => Color::Sky,
                'success' => Color::Emerald,
                'warning' => Color::Amber,
            ])
            // Only keep global search for essential resources
            ->globalSearchKeyBindings(['command+k', 'ctrl+k'])
            ->globalSearchFieldSuffix(fn (): ?string => null);
    }
}
