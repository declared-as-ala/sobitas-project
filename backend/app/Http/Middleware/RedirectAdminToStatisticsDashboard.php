<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectAdminToStatisticsDashboard
{
    /**
     * Redirect /admin (exact) to /admin/dashboard so the statistics dashboard is the admin home.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('GET') && $request->path() === 'admin') {
            return redirect('/admin/dashboard');
        }

        return $next($request);
    }
}
