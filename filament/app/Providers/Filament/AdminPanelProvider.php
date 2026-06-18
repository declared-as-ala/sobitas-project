<?php

namespace App\Providers\Filament;


use App\Models\Coordinate;
use App\Filament\Pages\Auth\EditProfile;
use App\Filament\Pages\Auth\Login;
use App\Filament\Pages\Dashboard;
use App\Filament\Pages\HistoriqueClient;
use App\Filament\Pages\ScannerFidelitePage;
use App\Filament\Pages\SendEmail;
use App\Filament\Pages\SendSms;
use App\Filament\Pages\Stock\StockDashboard;
use App\Filament\Pages\MediaPage;
use App\Filament\Pages\MenuNavbarOrderPage;
use App\Filament\Resources\AnnonceResource;
use App\Filament\Resources\ArticleResource;
use App\Filament\Resources\ArticleTypeResource;
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
use App\Filament\Resources\LoyaltyCardBatchResource;
use App\Filament\Resources\LoyaltyCardResource;
use App\Filament\Resources\LoyaltyTransactionResource;
use App\Filament\Resources\MarketingTemplateResource;
use App\Filament\Resources\MessageResource;
use App\Filament\Resources\NewsletterResource;
use App\Filament\Resources\PartnerCommissionLedgerResource;
use App\Filament\Resources\PartnerPromoCodeResource;
use App\Filament\Resources\PartnerResource;
use App\Filament\Resources\PageResource;
use App\Filament\Resources\ProductPriceListResource;
use App\Filament\Resources\ProductResource;
use App\Filament\Resources\QuotationResource;
use App\Filament\Resources\ReviewResource;
use App\Filament\Resources\ServiceResource;
use App\Filament\Resources\SiteNavigationItemResource;
use App\Filament\Resources\SlideResource;
use App\Filament\Resources\SousCategoryResource;
use App\Filament\Resources\TicketResource;
use App\Filament\Resources\UserResource;
use App\Filament\Widgets\LatestCommandes;
use App\Filament\Widgets\MonthlyRevenueComparison;
use App\Filament\Widgets\OrderStatusChart;
use App\Filament\Widgets\OrdersStatusPieChart;
use App\Filament\Widgets\ProductsStockPieChart;
use App\Filament\Widgets\RevenueByCategoryPieChart;
use App\Filament\Widgets\RevenueBySourcePieChart;
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
use App\Filament\Widgets\StatusCardsWidget;
use App\Filament\Widgets\SousCategoryStatsWidget;
use App\Filament\Widgets\AramexTrackingWidget;
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
    private function resolveBrandLogoUrl(): ?string
    {
        return Coordinate::publicBrandLogoUrl();
    }

    private function resolveLoginBackgroundUrl(): string
    {
        return Coordinate::publicLoginBackgroundUrl();
    }

    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('')
            ->login(Login::class)
            ->passwordReset()
            ->profile(EditProfile::class)
            ->renderHook(
                PanelsRenderHook::HEAD_END,
                function (): string {
                    // Login background — asset() uses APP_URL (forced in AppServiceProvider)
                    // so it always resolves to the correct public domain.
                    $bgUrl = Coordinate::publicLoginBackgroundUrl();
                    if ($bgUrl === '') {
                        foreach (['images/auth/gym-bg.jpg', 'images/auth/image.png', 'images/auth/image.jpg'] as $rel) {
                            if (is_file(public_path($rel))) {
                                $bgUrl = asset($rel);
                                break;
                            }
                        }
                    }
                    $loginBgStyle = $bgUrl !== ''
                        ? '.fi-simple-layout{'
                        . 'background-image:url(' . json_encode($bgUrl, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ') !important;'
                        . 'background-size:cover !important;background-position:center !important;'
                        . 'background-repeat:no-repeat !important;min-height:100vh !important;}'
                        : '.fi-simple-layout{background-color:#111827 !important;min-height:100vh !important;}';

                    return implode("\n", [
                        '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.css" />',
                        view('filament.components.custom-admin-styles')->render(),
                        '<link rel="stylesheet" href="' . asset('css/filament/topbar.css') . '" />',
                        '<link rel="stylesheet" href="' . asset('css/filament/doc-edit.css') . '" />',
                        '<link rel="stylesheet" href="' . asset('css/filament/auth.css') . '" />',
                        '<style id="filament-login-background">' . $loginBgStyle . '</style>',
                    ]);
                }
            )
            ->renderHook(
                PanelsRenderHook::BODY_END,
                fn (): string => implode("\n", [
                    '<script src="https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.js"></script>',
                    view('filament.components.spa-navigation-fix')->render(),
                ])
            )
            // ── PERFORMANCE: Explicit registration instead of filesystem discovery ──
            // discoverResources/discoverPages/discoverWidgets use Symfony Finder
            // to scan directories. On Docker Windows volumes, each stat() call
            // takes 10-50ms. With 33+ files, that's 300-1600ms wasted PER REQUEST.
            // Explicit registration eliminates ALL filesystem scanning.
            ->resources([
                AnnonceResource::class,
                ArticleResource::class,
                ArticleTypeResource::class,
                AromaResource::class,
                BrandResource::class,
                CategResource::class,
                ClientResource::class,
                CommandeResource::class,
                ContactResource::class,
                CoordinateResource::class,
                CouponResource::class,
                PartnerResource::class,
                PartnerPromoCodeResource::class,
                PartnerCommissionLedgerResource::class,
                FactureResource::class,
                FactureTvaResource::class,
                FaqResource::class,
                LoyaltyCardBatchResource::class,
                LoyaltyCardResource::class,
                LoyaltyTransactionResource::class,
                MessageResource::class,
                NewsletterResource::class,
                PageResource::class,
                ProductPriceListResource::class,
                ProductResource::class,
                QuotationResource::class,
                ReviewResource::class,
                ServiceResource::class,
                SiteNavigationItemResource::class,
                SlideResource::class,
                SousCategoryResource::class,
                TicketResource::class,
                UserResource::class,
            ])
            ->pages([
                Dashboard::class,
                HistoriqueClient::class,
                MediaPage::class,
                MenuNavbarOrderPage::class,
                ScannerFidelitePage::class,
                SendSms::class,
                SendEmail::class,
                StockDashboard::class,
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
                OrdersStatusPieChart::class,
                RevenueByCategoryPieChart::class,
                RevenueBySourcePieChart::class,
                ProductsStockPieChart::class,
                StatusCardsWidget::class,
                SousCategoryStatsWidget::class,
                AramexTrackingWidget::class,
            ])
            ->unsavedChangesAlerts()
            ->brandLogo(function (): \Illuminate\Support\HtmlString|null {
                $url = $this->resolveBrandLogoUrl();
                if ($url === null) {
                    // No logo on disk – Filament will render the brand name as text instead.
                    return null;
                }

                // Return explicit <img> HTML so Filament v4 never has to guess whether the
                // string is a URL or raw markup. height/width are set here because
                // brandLogoHeight() only applies when Filament itself wraps the URL.
                return new \Illuminate\Support\HtmlString(
                    '<img src="' . e($url) . '"'
                    . ' alt="' . e(config('app.name', 'Sobitas')) . '"'
                    . ' style="max-height:8rem;height:auto;width:auto;">'
                );
            })
            ->favicon(fn (): ?string => $this->resolveBrandLogoUrl())
            ->navigationGroups([
                // ── Always Expanded ─────────────────────────────────────────────
                NavigationGroup::make('Paramètres du site')
                    ->icon('heroicon-o-cog-6-tooth'),
                NavigationGroup::make('Facturation & Tickets')
                    ->icon('heroicon-o-document-text'),
                NavigationGroup::make('Catalogue')
                    ->icon('heroicon-o-cube'),
                NavigationGroup::make('Commandes')
                    ->icon('heroicon-o-shopping-cart'),
                NavigationGroup::make('Clients')
                    ->icon('heroicon-o-users'),
                NavigationGroup::make('Vente')
                    ->icon('heroicon-o-tag'),
                // ── Collapsed by default ─────────────────────────────────────────
                NavigationGroup::make('Blog')
                    ->icon('heroicon-o-newspaper')
                    ->collapsed(),
                NavigationGroup::make('Marketing')
                    ->icon('heroicon-o-megaphone')
                    ->collapsed(),
                NavigationGroup::make('Partenaires')
                    ->icon('heroicon-o-user-group')
                    ->collapsed(),
                NavigationGroup::make('SEO')
                    ->icon('heroicon-o-magnifying-glass-circle')
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
