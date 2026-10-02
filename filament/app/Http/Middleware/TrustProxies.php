<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Middleware\TrustProxies as Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;

/**
 * ── WHO $request->ip() IS, AND WHY IT WAS NEVER THE CUSTOMER ─────────────────────────────────
 *
 * Every per-IP limiter in this app (coupon-apply:{ip}, throttle:checkout-quote, the api read/write
 * buckets, login/register throttles) keys on $request->ip(). Until 02/10/2026 this middleware
 * trusted '*', which in Laravel means "trust whoever connected and take the LAST X-Forwarded-For
 * entry". Measured on production that day (backend-nginx-v2 access log, vps-run backend-nginx-log):
 *
 *   browser -> admin.protein.tn/api   peer 172.19.0.1  XFF "<anything>, <client>, <cloudflare edge>"
 *   browser -> protein.tn/api-proxy   peer 172.19.0.8  XFF "<anything>, <client>, <cloudflare edge>"
 *   storefront proxy (route handler)  peer 172.19.0.8  XFF "<VPS's own IP>, <cloudflare edge>"
 *
 * The last entry is the Cloudflare edge that Nginx Proxy Manager saw — a small rotating pool shared
 * by every Tunisian shopper — so ten coupon typos anywhere in the shop could lock everyone on that
 * edge out of coupons for a minute, and the storefront proxies did not carry the shopper at all.
 *
 * ── THE TRUST BOUNDARY ──────────────────────────────────────────────────────────────────────
 *
 *   Cloudflare -> NPM (host) -> :8083 backend-nginx-v2 -> php-fpm          (admin.protein.tn)
 *   Cloudflare -> NPM (host) -> :3001 Next -> backend-nginx-v2 -> php-fpm   (protein.tn)
 *
 * 1. Only hops on THIS box are proxies: NPM arrives through the Docker gateway, Next from its
 *    container, both on private addresses. Anything else that connects — including someone who
 *    finds the origin and calls :8083 directly — is the client, and its X-Forwarded-For is ignored.
 * 2. Behind those hops, Cloudflare's CF-Connecting-IP is believed ONLY when the address NPM
 *    recorded as its peer (the last X-Forwarded-For entry) is a Cloudflare edge. Cloudflare sets
 *    that header itself and answers 403 to a request that brings its own, so it cannot be forged
 *    through Cloudflare; a request that reached NPM some other way has a non-Cloudflare last hop
 *    and falls back to rule 1's answer, which is the real address NPM saw.
 * 3. Cloudflare's ranges are NOT trusted as proxies in the chain: a Cloudflare Worker's requests
 *    come FROM those ranges, so trusting them would let anyone with a free Worker put any address
 *    left of it and pick their own bucket. CF-Connecting-IP for a Worker is Cloudflare's own fixed
 *    address instead — one bucket for all of them.
 * 4. The storefront's server-side proxies (frontend/src/lib/shopperIp.ts) call backend-nginx-v2 over
 *    the Docker network and send the shopper as a single X-Forwarded-For value; rule 1 believes it
 *    because it comes from the Next container.
 *
 * What this cannot see: a client that reaches NPM (:443) or Next (:3001) WITHOUT Cloudflare can
 * still name its own address to Next, because Next trusts cf-connecting-ip. That gap closes at the
 * firewall (origin reachable only from Cloudflare), not here.
 */
class TrustProxies extends Middleware
{
    /**
     * The hops on this box: loopback and the Docker bridge networks (172.16/12 is Docker's default
     * pool, 192.168/16 its overflow, 10/8 overlay networks). Nothing on the internet arrives from
     * these. Ranges, not the measured 172.19.x addresses, because a recreated network can be
     * handed a different subnet.
     *
     * @var array<int, string>|string|null
     */
    protected $proxies = [
        '127.0.0.0/8',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '::1',
        'fc00::/7',
    ];

    /**
     * The headers that should be used to detect proxies.
     *
     * @var int
     */
    protected $headers =
        Request::HEADER_X_FORWARDED_FOR |
        Request::HEADER_X_FORWARDED_HOST |
        Request::HEADER_X_FORWARDED_PORT |
        Request::HEADER_X_FORWARDED_PROTO |
        Request::HEADER_X_FORWARDED_AWS_ELB;

    /**
     * Cloudflare's published edge ranges, https://www.cloudflare.com/ips/ (fetched 02/10/2026).
     * If Cloudflare adds one, requests through it simply key on the edge again until it is listed
     * here — the old behaviour, never a spoof.
     */
    private const CLOUDFLARE_EDGES = [
        '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
        '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
        '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
        '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
        '2a06:98c0::/29', '2c0f:f248::/32',
    ];

    public function handle(Request $request, Closure $next)
    {
        $this->believeCloudflareAboutTheClient($request);

        return parent::handle($request, $next);
    }

    /** Rule 2 above: collapse the chain to Cloudflare's client address when it provably came via Cloudflare. */
    private function believeCloudflareAboutTheClient(Request $request): void
    {
        $client = trim((string) $request->headers->get('CF-Connecting-IP', ''));
        if (filter_var($client, FILTER_VALIDATE_IP) === false) {
            return;
        }
        if (! IpUtils::checkIp((string) $request->server->get('REMOTE_ADDR', ''), $this->proxies)) {
            return;
        }
        $chain = explode(',', (string) $request->headers->get('X-Forwarded-For', ''));
        $edge = trim((string) end($chain));
        if (filter_var($edge, FILTER_VALIDATE_IP) === false || ! IpUtils::checkIp($edge, self::CLOUDFLARE_EDGES)) {
            return;
        }

        $request->headers->set('X-Forwarded-For', $client);
    }
}
