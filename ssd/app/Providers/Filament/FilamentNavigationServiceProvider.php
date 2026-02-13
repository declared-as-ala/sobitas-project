<?php

namespace App\Providers\Filament;

use App\Support\AdminMenu\FilamentNavigationBuilder;
use Filament\Facades\Filament;
use Illuminate\Support\ServiceProvider;

class FilamentNavigationServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if (! class_exists(Filament::class)) {
            return;
        }

        Filament::navigation(
            fn () => app(FilamentNavigationBuilder::class)->buildNavigationBuilder()
        );
    }
}
