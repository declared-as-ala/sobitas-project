<?php

namespace App\Providers\Filament;

use App\Filament\Partner\Pages\PartnerDashboard;
use App\Filament\Partner\Resources\PartnerCommissionHistoryResource;
use App\Filament\Partner\Resources\PartnerOrdersResource;
use App\Filament\Partner\Resources\PartnerPayoutHistoryResource;
use App\Filament\Partner\Resources\PartnerPromoCodeResource;
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
            ->login()
            ->colors(['primary' => Color::Emerald])
            ->brandName('Espace Partenaire')
            ->resources([
                PartnerPromoCodeResource::class,
                PartnerCommissionHistoryResource::class,
                PartnerPayoutHistoryResource::class,
                PartnerOrdersResource::class,
            ])
            ->pages([
                PartnerDashboard::class,
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
                \App\Http\Middleware\Authenticate::class,
            ])
            ->spa()
            ->sidebarCollapsibleOnDesktop();
    }
}
