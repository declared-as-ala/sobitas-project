<?php

namespace App\Providers\Filament;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\View;

class FilamentThemeServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Inject modern CSS into Filament's head section
        View::composer('filament::components.layout.app', function ($view) {
            // Add CSS link to head
            $css = asset('css/filament-modern.css');
            $view->with('customCss', $css);
        });

        // Also add via styles stack if available
        View::composer('filament::*', function ($view) {
            $css = asset('css/filament-modern.css');
            if (method_exists($view, 'getData')) {
                $data = $view->getData();
                $data['customCss'] = $css;
            }
        });
    }
}
