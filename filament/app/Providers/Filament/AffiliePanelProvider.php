<?php

namespace App\Providers\Filament;

use App\Filament\Pages\Auth\EditProfile;
use App\Filament\Pages\Auth\Login;
use App\Filament\Affilie\Pages\AffilieDashboard;
use App\Filament\Affilie\Pages\AffilieProfilePage;
use App\Filament\Affilie\Widgets\AffilieBalanceWidget;
use App\Filament\Affilie\Widgets\AffilieEarningsChart;
use App\Filament\Affilie\Widgets\AffilieReferralWidget;
use App\Filament\Affilie\Resources\AffilieCommandeResource;
use App\Filament\Affilie\Resources\AffilieLedgerReadResource;
use App\Filament\Affilie\Resources\AffiliePaymentReadResource;
use App\Filament\Affilie\Resources\AffilieSaleTicketResource;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AffiliePanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        $panel = $panel->id('affilie');

        /*
         * Subdomain separation (opt-in via AFFILIATE_PANEL_HOST — see config/affilies.php).
         * With a host set, the affiliate portal is its OWN site at the subdomain root; without
         * one, it stays co-hosted at admin.protein.tn/affilie exactly as before. Binding a
         * domain restricts the panel to that host, so this MUST NOT activate before the DNS +
         * reverse-proxy + TLS for the subdomain exist, or the portal becomes unreachable.
         */
        if ($affilieHost = config('affilies.panel_host')) {
            $panel = $panel->domain($affilieHost)->path('');
        } else {
            $panel = $panel->path('affilie');
        }

        return $panel
            ->login(Login::class)
            ->passwordReset()
            ->profile(EditProfile::class)
            ->colors([
                'primary' => Color::Orange,
            ])
            /*
             * THERE IS NO AUTO-DISCOVERY IN THIS PANEL. A resource that is not in this array does
             * not exist: no navigation entry, no routes, and `Resource::getUrl()` throws
             * RouteNotFoundException for it. AffilieCommandeResource is the affiliate's own order
             * desk — the create page the whole module is built around — so it leads.
             */
            ->resources([
                AffilieCommandeResource::class,
                AffilieSaleTicketResource::class,
                AffilieLedgerReadResource::class,
                AffiliePaymentReadResource::class,
            ])
            ->pages([
                AffilieDashboard::class,
                AffilieProfilePage::class,
            ])
            ->widgets([
                AffilieBalanceWidget::class,
                AffilieEarningsChart::class,
                AffilieReferralWidget::class,
            ])
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
            ->brandName('Protein.tn — Affiliés')
            ->sidebarCollapsibleOnDesktop();
    }
}
