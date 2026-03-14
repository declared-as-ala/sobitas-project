<?php

namespace App\Providers;

use Filament\Support\Facades\FilamentView;
use Illuminate\View\View;
use Livewire\Livewire;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class FilamentServiceProvider extends PackageServiceProvider
{
    public function boot(): void
    {
        // Defer Livewire component initialization to improve first paint
        // This prevents the 115ms 'update' request from blocking page load
        Livewire::attribute('defer', true);

        // Lazy-load Livewire components (don't hydrate until user interaction)
        FilamentView::registerRenderHook(
            'panels::body.end',
            fn (): string => <<<'HTML'
                <script>
                    // Defer Livewire hydration until page is interactive
                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(() => {
                            document.dispatchEvent(new Event('livewire:hydrate'));
                        }, { timeout: 2000 });
                    } else {
                        setTimeout(() => {
                            document.dispatchEvent(new Event('livewire:hydrate'));
                        }, 1000);
                    }
                </script>
            HTML
        );
    }

    public function configurePackage(Package $package): void
    {
        $package->name('filament-performance');
    }
}
