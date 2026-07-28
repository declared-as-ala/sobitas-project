/**
 * Brand landing pages live at `/{slug-of-brand-name}`, served by the dynamic `(shop)/[slug]` route.
 *
 * The slug is derived from free-text admin data, so a brand name can collide with a real route
 * segment — and in the Next.js App Router a STATIC segment always beats a dynamic one. When that
 * happens the brand page becomes unreachable while still being submitted in the sitemap.
 *
 * Live case: the brand "API" (`brands` id=5) generates the slug `api`, which collides with
 * `app/api/`. `/api` therefore returns 404 for every visitor, yet appears in sitemap.xml between
 * `/activlab` and `/applied-nutrition`. Overriding the slug gives the brand a URL that actually
 * resolves; middleware 301s the dead `/api` onto it so the sitemap entry and any external link
 * land on a 200 instead of a 404.
 *
 * Keys are the RAW generated slug, values the slug actually served. Add an entry ONLY for a
 * genuine collision with a route segment that exists on disk — each override costs a permanent
 * redirect, and the raw slug must keep 301ing to the override forever.
 *
 * This file is imported by both server and client components, so it must stay dependency-free.
 */
export const BRAND_SLUG_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
  // `app/api/` (route handlers: orders, coupons, revalidate, …) shadows `(shop)/[slug]`.
  api: 'marque-api',
});

/**
 * The unmodified slug for a brand name — accent-folded, lowercased, non-alphanumerics collapsed
 * to hyphens. This was copy-pasted as a local `nameToSlug` in seven files; they all delegate here
 * now so the brand href, the resolver, the sitemap and the JSON-LD can never drift apart.
 */
export function rawBrandSlug(name: string): string {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/** The slug a brand is actually SERVED at — `rawBrandSlug` unless it collides with a route. */
export function brandNameToSlug(name: string): string {
  const raw = rawBrandSlug(name);
  return BRAND_SLUG_OVERRIDES[raw] ?? raw;
}

/**
 * The override target for a raw slug, or null when it needs no redirect. Used by middleware to
 * turn the shadowed `/api` into a single 301 rather than leaving it a 404.
 */
export function brandSlugRedirectTarget(slug: string): string | null {
  return BRAND_SLUG_OVERRIDES[rawBrandSlug(slug)] ?? null;
}
