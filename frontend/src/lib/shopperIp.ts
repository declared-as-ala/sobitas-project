import { isIP } from 'node:net';

/**
 * Where the storefront's server-side proxies (`app/api/*`) reach Laravel, and who they say is asking.
 *
 * ── WHY THE PROXIES NO LONGER CALL NEXT_PUBLIC_API_URL ──────────────────────────────────────
 * In production that is `https://protein.tn/api-proxy`, so every coupon, quote and order left this
 * container, went out through Cloudflare, came back through NPM into this same Next server, and only
 * then reached backend-nginx-v2 via the rewrite. Laravel saw Cloudflare's edge as the client and the
 * shopper was gone. Measured 02/10/2026 in the backend-nginx-v2 access log: a POST to
 * /api/checkout/quote arrived with `X-Forwarded-For: <VPS IP>, <cloudflare edge>` — and the
 * per-IP coupon limiter (10/min) was shared by every shopper behind that edge.
 *
 * `API_BACKEND_URL` is the backend's address on the Docker network (`http://backend-nginx-v2/api`,
 * see .env.production and docker-compose.yml). Calling it directly makes this container the only
 * hop Laravel sees, and Laravel trusts exactly that hop (filament/app/Http/Middleware/TrustProxies.php)
 * to name the shopper. Locally, without API_BACKEND_URL, it falls back to the public URL as before.
 */
export const BACKEND_API_URL =
  process.env.API_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://admin.protein.tn/api';

function firstIp(value: string | null): string | null {
  const ip = value?.split(',')[0]?.trim();
  return ip && isIP(ip) ? ip : null;
}

/**
 * The shopper's address as this server received it. `cf-connecting-ip` first: Cloudflare sets it and
 * refuses (403) a request that brings its own. The first `x-forwarded-for` hop and `x-real-ip` only
 * matter off Cloudflare (local dev); in production NPM appends to x-forwarded-for, so its first hop
 * is whatever the client typed. Anything that does not parse as an IP is skipped, never forwarded.
 */
export function shopperIp(request: Request): string | null {
  const { headers } = request;
  return firstIp(headers.get('cf-connecting-ip')) ?? firstIp(headers.get('x-forwarded-for')) ?? firstIp(headers.get('x-real-ip'));
}

/** Header to spread into a proxied fetch so Laravel's per-IP limiters see the shopper, not this server. */
export function forwardShopperIp(request: Request): Record<string, string> {
  const ip = shopperIp(request);
  return ip ? { 'X-Forwarded-For': ip } : {};
}
