<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Disable Debugbar for API routes
 * 
 * Debugbar adds significant overhead (50-200ms per request) and should
 * never run on API routes, even in development.
 */
class DisableDebugbarForApi
{
    public function handle(Request $request, Closure $next): Response
    {
        // Disable debugbar for all API routes
        if ($request->is('api/*')) {
            if (class_exists(\Barryvdh\Debugbar\Facades\Debugbar::class)) {
                \Barryvdh\Debugbar\Facades\Debugbar::disable();
            }
        }

        return $next($request);
    }
}
