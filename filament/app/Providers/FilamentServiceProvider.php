<?php

namespace App\Providers;

use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class FilamentServiceProvider extends PackageServiceProvider
{
    public function boot(): void
    {
        // No deferred hydration — it breaks Select component initialization
        // on SPA navigations (selected values don't appear until manual refresh).
    }

    public function configurePackage(Package $package): void
    {
        $package->name('filament-performance');
    }
}
