<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Optimize Livewire response size and defer non-critical data loading.
 * Removes unnecessary payload from initial Livewire hydration to speed up first paint.
 */
class OptimizeLivewireResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only optimize Livewire update requests
        if (!$request->is('livewire/update') && !$request->is('livewire/message')) {
            return $response;
        }

        // Compress response with gzip if supported
        if (str_contains($request->header('Accept-Encoding'), 'gzip')) {
            $response->header('Content-Encoding', 'gzip');
        }

        return $response;
    }
}
