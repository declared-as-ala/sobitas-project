<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Require a BACK-OFFICE role, not merely a session.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────
 * Every print, PDF, export and POS-AJAX route in routes/web.php was grouped behind bare `auth`.
 * `auth` answers "is somebody logged in", not "is this person staff" — and partners log in on the
 * SAME `web` guard as admins (PartnerPanelProvider declares no ->authGuard(); config/auth.php
 * defines only 'web'). The Filament partner panel itself is correctly isolated, but these routes
 * live OUTSIDE the panel, so panel isolation never applied to them.
 *
 * The result, confirmed against the code before this middleware existed: any partner could call
 *
 *     GET /api/pos-clients?q=a
 *
 * and receive name, phone_1, adresse, email, ville and code_postale for 30 customers at a time,
 * walking the alphabet to take the entire customer list. The same group exposed every ticket, BL,
 * facture TVA, devis and wholesale price list by ID — including rival partners' sales and the
 * partner codes printed on them — plus the company revenue, stock and loyalty exports.
 *
 * Partners are competitors of one another. This was the single highest-severity finding in the
 * B2B audit and it had to be closed before public partner signup could exist at all.
 *
 * ── WHY A ROLE CHECK AND NOT A PANEL CHECK ────────────────────────────────────────────────
 * `Filament::auth()` / `canAccessPanel()` is panel-scoped, and these are plain web routes with no
 * panel context — asking a panel whether it admits someone is the wrong question here. The right
 * question is the one config/partners.php already answers for the admin panel, so this reuses
 * exactly that list rather than inventing a second, drift-prone definition of "staff".
 *
 * FAIL CLOSED: an unknown or missing role_id is refused. A new role added to the system is not
 * silently trusted with the customer database.
 */
class EnsureBackOfficeRole
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(403);
        }

        $allowed = config('partners.admin_role_ids', [1, 3]);

        if (! in_array((int) ($user->role_id ?? 0), $allowed, true)) {
            // 403 rather than a redirect: these are print/PDF/AJAX endpoints, and bouncing an
            // XHR to a login page produces an HTML body where JSON was expected, which reads as
            // a broken feature instead of a refusal.
            abort(403, "Accès réservé au personnel.");
        }

        return $next($request);
    }
}
