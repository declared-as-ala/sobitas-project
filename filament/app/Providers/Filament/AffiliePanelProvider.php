<?php

namespace App\Providers\Filament;

use App\Filament\Pages\Auth\EditProfile;
use App\Filament\Pages\Auth\Login;
use App\Filament\Affilie\Pages\AffilieDashboard;
use App\Filament\Affilie\Pages\AffilieProfilePage;
use App\Filament\Affilie\Widgets\AffilieBalanceWidget;
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
        return $panel
            ->id('affilie')
            ->path('affilie')
            ->login(Login::class)
            ->passwordReset()
            ->profile(EditProfile::class)
            ->colors([
                'primary' => Color::Orange,
            ])
            ->resources([
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
