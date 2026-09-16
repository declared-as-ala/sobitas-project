<?php

namespace App\Http\Middleware;

use App\Enums\AffilieStatus;
use App\Models\Affilie;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Require an APPROVED affiliate on an API route. Runs AFTER `auth:sanctum`.
 *
 * Affilies share the same user table (and the same sanctum guard) as customers and admins, so
 * `auth:sanctum` only proves "some user is logged in". This is the identical gate the Filament
 * panel uses in User::canAccessPanel('affilie'): an Active `Affilie` profile AND
 * role_id === the configured affilie role. It FAILS CLOSED (403). It stashes the resolved Affilie
 * on the request so the portal controllers don't re-query it.
 */
class EnsureAffilie
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(401, 'Non authentifié.');
        }

        $affilie = $user->affilie()->first();

        $ok = $affilie !== null
            && $affilie->status === AffilieStatus::Active
            && (int) ($user->role_id ?? 0) === Affilie::availableCommissionRoleId();

        if (! $ok) {
            // 403 (not a redirect): these are JSON API endpoints; the frontend guard reads the code.
            abort(403, 'Accès réservé aux affiliés approuvés.');
        }

        $request->attributes->set('affilie', $affilie);

        return $next($request);
    }
}
