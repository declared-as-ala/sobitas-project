<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Affilie;
use Illuminate\Http\JsonResponse;

/**
 * Does `ali.protein.tn` belong to a real, active affiliate?
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────────────────────
 * The storefront is served on every hostname under the apex, because wildcard DNS resolves them
 * all. The hostname therefore proves nothing on its own: without this endpoint, `whatever.
 * protein.tn` would stamp an attribution cookie for an affiliate that does not exist, and every
 * order from that visit would carry a referral to nobody. The frontend middleware calls this
 * BEFORE it writes the cookie and treats anything other than a positive answer — 404, 500,
 * timeout, unparseable body — as "not an affiliate, this is a normal visit".
 *
 * ── WHAT IT DELIBERATELY DOES NOT RETURN ─────────────────────────────────────────────────────
 * Same posture as AffilieCodeController, and for the same reason: this is an unauthenticated
 * endpoint addressed by a short guessable string, so everything it returns is readable by anyone
 * willing to walk hostnames. No `id` — the storefront must never learn an affiliate's primary key,
 * because the moment a browser can name a row by number, "trust the server" becomes a comment
 * rather than a property. No `commission_rate`, which is the shop's margin per affiliate. No
 * balance, no email, no phone.
 *
 * What is left is the echo of the subdomain (so the caller can prove the 200 answers the question
 * it asked, rather than being a proxy error page or a rewritten route) and the affiliate's public
 * trading name, which is the string a storefront banner would say out loud.
 *
 * ── STATUS IS PART OF THE QUESTION ───────────────────────────────────────────────────────────
 * A suspended, rejected or still-pending affiliate resolves to 404. A suspension that stopped the
 * commission but left the traffic attributed would be a silent half-suspension, and the code
 * preview already refuses on exactly this ground.
 */
class AffilieSubdomainController extends Controller
{
    /** GET /api/affilie-subdomains/{subdomain} */
    public function show(string $subdomain): JsonResponse
    {
        $affilie = Affilie::resolveActiveBySubdomain($subdomain);

        if ($affilie === null) {
            // 404 rather than 200-with-a-flag: the caller caches misses on a short TTL and a
            // status code is the one part of the response no proxy rewrites.
            return response()->json(['message' => 'Sous-domaine introuvable.'], 404);
        }

        return response()->json([
            'subdomain' => (string) Affilie::normalizeSubdomain($subdomain),
            // Trading name first: a gym would rather be "Fitness Park Lac" than its owner's name.
            'affilie_name' => (string) ($affilie->business_name ?: $affilie->name),
        ]);
    }
}
