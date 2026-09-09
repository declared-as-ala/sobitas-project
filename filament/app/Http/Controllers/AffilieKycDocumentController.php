<?php

namespace App\Http\Controllers;

use App\Models\Affilie;
use App\Services\AffilieKycService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The only way to read an affiliate's identity document.
 *
 * ── WHY THIS IS IN routes/web.php AND NOT routes/api.php ─────────────────────────────────────
 * The primary viewer is an administrator inside the Filament panel, authenticated by a SESSION.
 * The `api` middleware group in app/Http/Kernel.php contains no `StartSession`, so on an API route
 * a logged-in admin is simply an anonymous request — the route would be signature-only, and a
 * signature in a URL is a bearer token that survives in browser history, in a Referer header and
 * in every screenshot of the address bar. The route therefore lives in the `web` group, where a
 * session exists, and `auth:web,sanctum` also admits the affiliate themselves holding a storefront
 * token.
 *
 * ── SIGNED **AND** AUTHENTICATED, AND THE ORDER MATTERS ──────────────────────────────────────
 * `signed` bounds the link's lifetime (5 minutes, see AffilieKycService::temporaryUrl). `auth`
 * proves somebody is logged in. Neither answers "is this the right person", so the controller
 * re-checks `canView()` on every single request and 403s otherwise — a stolen valid link in the
 * hands of another logged-in affiliate still gets nothing.
 *
 * 403 rather than 404 for a wrong viewer is deliberate here: the id is already in the URL they
 * hold, so there is nothing left to conceal by pretending the record is absent, and a 404 would
 * send an administrator hunting for a missing file instead of a missing permission.
 */
class AffilieKycDocumentController extends Controller
{
    /** GET /affilie-kyc/{affilie}/{side}  (name: affilie.kyc.document) */
    public function __invoke(Request $request, AffilieKycService $kyc, Affilie $affilie, string $side): StreamedResponse
    {
        abort_unless(in_array($side, AffilieKycService::sides(), true), 404);

        abort_unless($kyc->canView($request->user(), $affilie), 403, 'Document non accessible.');

        return $kyc->stream($affilie, $side);
    }
}
