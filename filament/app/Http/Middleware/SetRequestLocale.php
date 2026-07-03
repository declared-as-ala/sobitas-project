<?php

namespace App\Http\Middleware;

use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetRequestLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $requested = $request->header('X-Locale')
            ?? $request->header('Accept-Language')
            ?? $request->query('locale')
            ?? $request->cookie('protein_locale');

        $requested = strtolower((string) $requested);
        $locale = str_starts_with($requested, 'ar')
            ? 'ar'
            : (str_starts_with($requested, 'en') ? 'en' : 'fr');
        app()->setLocale($locale);
        Carbon::setLocale($locale);

        return $next($request);
    }
}
