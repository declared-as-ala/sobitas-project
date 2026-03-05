<?php

namespace App\Providers\Filament;

use App\Filament\Pages\Auth\Login;
use App\Filament\Pages\Dashboard;
use App\Filament\Pages\HistoriqueClient;
use App\Filament\Pages\SendEmail;
use App\Filament\Pages\SendSms;
use App\Filament\Pages\Stock\StockDashboard;
use App\Filament\Pages\Stock\StockProductsPage;
use App\Filament\Pages\Stock\StockMovementsPage;
use App\Filament\Pages\Stock\StockAlertsPage;
use App\Filament\Pages\Stock\StockAdjustmentsPage;
use App\Filament\Pages\Stock\StockReportsPage;
use App\Filament\Pages\MediaPage;
use App\Filament\Resources\AnnonceResource;
use App\Filament\Resources\ArticleResource;
use App\Filament\Resources\AromaResource;
use App\Filament\Resources\BrandResource;
use App\Filament\Resources\CategResource;
use App\Filament\Resources\ClientResource;
use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\ContactResource;
use App\Filament\Resources\CoordinateResource;
use App\Filament\Resources\CouponResource;
use App\Filament\Resources\CreditNoteResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\FaqResource;
use App\Filament\Resources\MarketingTemplateResource;
use App\Filament\Resources\MessageResource;
use App\Filament\Resources\NewsletterResource;
use App\Filament\Resources\PageResource;
use App\Filament\Resources\ProductPriceListResource;
use App\Filament\Resources\ProductResource;
use App\Filament\Resources\QuotationResource;
use App\Filament\Resources\ReviewResource;
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
use App\Filament\Widgets\ClientHistoriqueSearchWidget;
use App\Filament\Widgets\DashboardHeaderWidget;
use App\Filament\Widgets\DashboardAlertsWidget;
use App\Filament\Widgets\MarketplaceKpis;
use App\Filament\Widgets\MultiMetricChart;
use App\Filament\Widgets\OrderFunnelChart;
use App\Filament\Widgets\TopCategoriesChart;
use App\Filament\Widgets\GeographicChart;
use App\Filament\Widgets\DelayedOrdersTable;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Filament\Widgets\LowStockTable;
use App\Filament\Widgets\TopCustomersTable;
use App\Filament\Widgets\ReturnsRefundsTable;
use App\Filament\Widgets\StockKpisWidget;
use App\Filament\Widgets\StockMovementChartWidget;
use App\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Navigation\NavigationGroup;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\View\PanelsRenderHook;
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
            ->profile()
            ->passwordReset()
            ->renderHook(
                'panels::head.end',
                fn (): string => '
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.css" />
                ' . "\n" . view('filament.components.custom-admin-styles')->render()
                . "\n" . '<style>' . file_get_contents(resource_path('css/filament/topbar.css')) . '</style>'
                . "\n" . '<style>' . file_get_contents(resource_path('css/filament/doc-edit.css')) . '</style>'
            )
            ->renderHook(
                'panels::body.end',
                fn (): string => '
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.js"></script>
                    ' . "\n" . view('filament.components.spa-navigation-fix')->render()
            )
            // ── PERFORMANCE: Explicit registration instead of filesystem discovery ──
            // discoverResources/discoverPages/discoverWidgets use Symfony Finder
            // to scan directories. On Docker Windows volumes, each stat() call
            // takes 10-50ms. With 33+ files, that's 300-1600ms wasted PER REQUEST.
            // Explicit registration eliminates ALL filesystem scanning.
            ->resources([
                AnnonceResource::class,
                ArticleResource::class,
                AromaResource::class,
                BrandResource::class,
                CategResource::class,
                ClientResource::class,
                CommandeResource::class,
                ContactResource::class,
                CoordinateResource::class,
                CouponResource::class,
                FactureResource::class,
                FactureTvaResource::class,
                FaqResource::class,
                MessageResource::class,
                NewsletterResource::class,
                PageResource::class,
                ProductPriceListResource::class,
                ProductResource::class,
                QuotationResource::class,
                ReviewResource::class,
                ServiceResource::class,
                SlideResource::class,
                SousCategoryResource::class,
                TicketResource::class,
                UserResource::class,
            ])
            ->pages([
                Dashboard::class,
                HistoriqueClient::class,
                SendSms::class,
                SendEmail::class,
                // Gestion de stock
                StockDashboard::class,
                StockProductsPage::class,
                StockAlertsPage::class,
                StockReportsPage::class,
            ])
            ->widgets([
                AccountWidget::class,
                ClientHistoriqueSearchWidget::class,
                DashboardHeaderWidget::class,
                DocumentTimelineWidget::class,
                DashboardAlertsWidget::class,
                MarketplaceKpis::class,
                OrderFunnelChart::class,
                TopCategoriesChart::class,
                GeographicChart::class,
                TopCustomersTable::class,
                StatsOverview::class,
                RevenueChart::class,
                OrderStatusChart::class,
                TopProductsWidget::class,
                MonthlyRevenueComparison::class,
                LatestCommandes::class,
                StockKpisWidget::class,
                StockMovementChartWidget::class,
            ])
            ->unsavedChangesAlerts()
            ->brandLogo(fn () => view('filament.app.logo'))
            ->brandLogoHeight('5rem')
            ->favicon(asset('logo.png'))
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
                NavigationGroup::make('Gestion de stock')
                    ->icon('heroicon-o-archive-box'),
                NavigationGroup::make('Catalogue')
                    ->icon('heroicon-o-cube'),
                NavigationGroup::make('Blog')
                    ->icon('heroicon-o-newspaper'),
                NavigationGroup::make('Marketing')
                    ->icon('heroicon-o-megaphone')
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
            // Disable Filament built-in global search; navbar search bar removed.
            ->globalSearch(false);
    }
}
