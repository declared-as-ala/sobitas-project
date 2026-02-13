<?php

namespace App\Providers\Filament;

use App\Support\AdminMenu\FilamentNavigationBuilder;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('admin')
            ->path('admin-filament')
            ->authGuard('web')
            ->login()
            ->brandName('SOBITAS Admin')
            ->colors([
                'primary' => Color::Blue,
                'success' => Color::Green,
                'warning' => Color::Amber,
                'danger' => Color::Red,
                'info' => Color::Sky,
                'gray' => Color::Slate,
            ])
            ->darkMode()
            ->sidebarCollapsibleOnDesktop()
            ->sidebarWidth('17rem')
            ->maxContentWidth('full')
            ->navigation(fn () => app(FilamentNavigationBuilder::class)->buildNavigationBuilder())
            ->pages([
                \App\Filament\Pages\Dashboard::class,
            ])
    }
}
