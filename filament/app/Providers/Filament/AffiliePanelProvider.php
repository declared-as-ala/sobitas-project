<?php

namespace App\Providers\Filament;

use App\Filament\Pages\Auth\EditProfile;
use App\Filament\Affilie\Pages\Auth\AffilieLogin;
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
use Filament\View\PanelsRenderHook;
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
            ->login(AffilieLogin::class)
            ->passwordReset()
            ->profile(EditProfile::class)
            ->colors([
                'primary' => Color::Orange,
            ])
            // Use the FULL screen width (owner request: "use all the space"). Only injected on the
            // affilie panel, so it can't touch the admin layout. Kept to layout width — no fragile
            // targeting of Filament's internal control markup.
            ->renderHook(
                PanelsRenderHook::HEAD_END,
                fn (): string => <<<'HTML'
                    <style>
                        /* ── Affiliate panel: BIG, spacious, image-forward (owner request) ──────────
                           Only injected on the affilie panel, so the admin layout is untouched. */

                        /* Use the full width, with breathing room. */
                        .fi-main { max-width: 100% !important; font-size: 15px; }
                        .fi-main-ctn { width: 100% !important; }
                        @media (min-width: 1024px) {
                            .fi-main { padding-left: 2rem !important; padding-right: 2rem !important; }
                        }

                        /* Bigger, clearer section headings. */
                        .fi-section-header-heading, .fi-fo-section-header-heading { font-size: 1.2rem !important; font-weight: 800 !important; }

                        /* Tall, legible form fields — easy to hit, easy to read. */
                        .fi-input, textarea.fi-input, .fi-select-input, .fi-fo-select .fi-input {
                            font-size: 1.03rem !important;
                            min-height: 3.2rem !important;
                            padding-top: .72rem !important; padding-bottom: .72rem !important;
                            border-radius: 12px !important;
                        }
                        .fi-fo-field-wrp label, .fi-fo-field-label, .fi-fo-field-wrp-label {
                            font-size: .95rem !important; font-weight: 700 !important;
                        }

                        /* Roomier repeater rows (each product line) + card feel. */
                        .fi-fo-repeater-item { border-radius: 16px !important; }
                        .fi-fo-repeater-item .fi-section-content, .fi-fo-repeater-item > div { padding: 1rem 1.1rem !important; }

                        /* ── Rich product option (Select ->allowHtml): BIG thumbnail + clear data ── */
                        .afp-opt { display: flex; align-items: center; gap: 14px; padding: 6px 2px; min-width: 0; }
                        .afp-img { width: 56px; height: 56px; border-radius: 13px; object-fit: cover;
                                   background: #f1f5f9; border: 1px solid #eef2f7; flex: 0 0 56px; }
                        .afp-body { min-width: 0; }
                        .afp-name { font-weight: 700; font-size: 15.5px; color: #0f172a; line-height: 1.25;
                                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                        .afp-meta { display: flex; align-items: center; gap: 10px; font-size: 13px; margin-top: 4px; }
                        .afp-base { color: #D53B04; font-weight: 800; }
                        .afp-stock { font-weight: 700; padding: 1px 10px; border-radius: 999px; }
                        .afp-stock.afp-ok { color: #047857; background: #ecfdf5; }
                        .afp-stock.afp-out { color: #b91c1c; background: #fef2f2; }
                        .dark .afp-name { color: #f1f5f9; }
                        .dark .afp-stock.afp-ok { background: rgba(16,185,129,.14); }
                        .dark .afp-stock.afp-out { background: rgba(239,68,68,.14); }
                    </style>
                    HTML
            )
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
            ->databaseNotifications()
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
