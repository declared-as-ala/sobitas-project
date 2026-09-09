/**
 * Is `ali.protein.tn` a REAL affiliate, or did somebody just type a word in front of the domain?
 *
 * With wildcard DNS every string under the apex resolves, so the hostname alone proves nothing.
 * This module is the only thing standing between "a hostname exists" and "an order gets attributed
 * to somebody", and it is built to fail in the direction that costs nothing:
 *
 *   AN UNRESOLVED SUBDOMAIN IS A NORMAL VISIT. No cookie, no attribution, the storefront renders
 *   exactly as it does on the apex. That is also what happens when the backend is unreachable —
 *   which it is as this is written (the VPS is down and admin.protein.tn answers 522). A commission
 *   is money; guessing one on a timeout is the wrong way to be wrong, and the visitor loses
 *   nothing but the attribution they would not have had if the feature did not exist.
 *
 * ── SHAPE COPIED FROM util/adminRedirects.ts, AND ONE THING DELIBERATELY NOT ─────────────────
 * The frontend runs as a long-lived Node server, so a module-level cache with a TTL survives
 * across requests: at most one backend call per subdomain per TTL per worker, then a Map hit with
 * zero added latency. What is NOT copied is the "fetch the whole list once" strategy. A list
 * endpoint would publish the complete roster of affiliates to anyone who can spell the URL, and
 * AffilieCodeController already sets the posture for this programme: a public endpoint addressed
 * by a guessable string returns the least it can. Per-subdomain lookups leak only "this one
 * hostname exists", which the affiliate is printing on a poster anyway.
 *
 * The price of per-key lookups is that a stranger walking random hostnames could mint one backend
 * call each. Three things bound that: NEGATIVE results are cached too, the map is capped and
 * evicts oldest-first so it cannot grow without limit, and the route itself is throttled in
 * Laravel (60/1, same as the code preview).
 */

import { isValidAffiliateSubdomain } from './affiliateHost';

type Entry = { known: boolean; at: number };

/** A confirmed affiliate changes rarely; 5 minutes matches the admin-redirect cache. */
const HIT_TTL_MS = 5 * 60 * 1000;
/**
 * A miss expires fast so a subdomain assigned in Filament goes live within a minute rather than
 * within five. Wrong-for-a-minute is a support call; wrong-for-five is a support call the admin
 * has already retried three times.
 */
const MISS_TTL_MS = 60 * 1000;
/**
 * A failed lookup (timeout, 5xx, unparseable) is remembered for only 10 seconds. Long enough to
 * stop a dead backend being hammered once per request, short enough that attribution resumes
 * within one page view of the backend coming back.
 */
const ERROR_TTL_MS = 10 * 1000;

/** Hard ceiling so random-hostname traffic cannot grow this map into a memory leak. */
const MAX_ENTRIES = 500;

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<boolean>>();

function apiBase(): string {
  return (
    process.env.API_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace('/api-proxy', '') ||
    'https://admin.protein.tn/api'
  );
}

function remember(sub: string, known: boolean, ttl: number): void {
  if (cache.size >= MAX_ENTRIES) {
    // Map iterates in insertion order, so the first key is the oldest write.
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(sub, { known, at: Date.now() + ttl });
}

async function askBackend(sub: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/affilie-subdomains/${encodeURIComponent(sub)}`, {
      headers: { Accept: 'application/json' },
      // Same 1.5s ceiling as the product lookup and the admin-redirect fetch in middleware. A
      // request that has not answered by then must not hold a page render hostage.
      signal: AbortSignal.timeout(1500),
      /*
       * `next: { revalidate }` rather than `cache: 'no-store'`. A no-store fetch is a dynamic
       * signal that opts the CALLING ROUTE out of static generation — the exact regression
       * documented in util/adminRedirects.ts, where it turned every category and product page
       * dynamic. This module is reached from middleware (where the Data Cache is irrelevant and
       * the in-process map above is what actually serves) and, in principle, from a route
       * handler, so caching here is free and never wrong.
       */
      next: { revalidate: 300, tags: ['affilie-subdomains'] },
    });
    if (res.status === 404) {
      remember(sub, false, MISS_TTL_MS);
      return false;
    }
    if (!res.ok) {
      remember(sub, false, ERROR_TTL_MS);
      return false;
    }
    const body = (await res.json()) as { subdomain?: unknown } | null;
    // The endpoint echoes the subdomain back. A 200 whose body does not agree is a proxy error
    // page or a rewritten route, not an affiliate — never attribute on it.
    const echoed = typeof body?.subdomain === 'string' ? body.subdomain.toLowerCase() : null;
    const known = echoed === sub;
    remember(sub, known, known ? HIT_TTL_MS : ERROR_TTL_MS);
    return known;
  } catch {
    remember(sub, false, ERROR_TTL_MS);
    return false;
  }
}

/**
 * Does this subdomain belong to an ACTIVE affiliate?
 *
 * Never throws. Returns false for anything it cannot positively confirm.
 */
export async function isKnownAffiliateSubdomain(sub: string): Promise<boolean> {
  if (!isValidAffiliateSubdomain(sub)) return false;

  const hit = cache.get(sub);
  if (hit && hit.at > Date.now()) return hit.known;

  // Collapse concurrent first-hits on the same subdomain into one backend call. Without this, a
  // page that fires several parallel requests on a cold cache would ask the same question N times.
  const running = inflight.get(sub);
  if (running) return running;

  const p = askBackend(sub).finally(() => inflight.delete(sub));
  inflight.set(sub, p);
  return p;
}

/** Test seam: drop everything remembered. Not used in production code. */
export function __resetAffiliateSubdomainCache(): void {
  cache.clear();
  inflight.clear();
}
