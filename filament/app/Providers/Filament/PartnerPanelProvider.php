<?php

namespace App\Providers\Filament;

use App\Filament\Pages\Auth\EditProfile;
use App\Filament\Pages\Auth\Login;
use App\Filament\Partner\Pages\PartnerDashboard;
use App\Filament\Partner\Pages\PartnerProfilePage;
use App\Filament\Partner\Widgets\PartnerBalanceWidget;
use App\Filament\Partner\Resources\PartnerLedgerReadResource;
use App\Filament\Partner\Resources\PartnerPaymentReadResource;
use App\Filament\Partner\Resources\PartnerSaleTicketResource;
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

class PartnerPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('partner')
            ->path('partner')
            ->login(Login::class)
            ->passwordReset()
            ->profile(EditProfile::class)
            ->colors([
                'primary' => Color::Orange,
            ])
            ->resources([
                PartnerSaleTicketResource::class,
                PartnerLedgerReadResource::class,
                PartnerPaymentReadResource::class,
            ])
            ->pages([
                PartnerDashboard::class,
                PartnerProfilePage::class,
            ])
            ->widgets([
                PartnerBalanceWidget::class,
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
            ->brandName('Sobitas — Partenaires')
            ->sidebarCollapsibleOnDesktop();
    }
}
