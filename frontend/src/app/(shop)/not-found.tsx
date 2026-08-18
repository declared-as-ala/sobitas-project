import { NotFoundContent } from '@/app/components/NotFoundContent';

/**
 * Storefront 404 — the boundary every `notFound()` inside the (shop) group resolves to.
 *
 * ── WHY THIS FILE HAD TO EXIST ────────────────────────────────────────────────────────────────
 * It did not, and that was a five-route SEO outage that no browser check could see.
 *
 * `app/not-found.tsx` (the root one) has always documented this file — "Storefront 404s (a
 * notFound() from inside the group) are handled by app/(shop)/not-found.tsx instead, which
 * inherits chrome from the group layout." The file was never actually added. Next then had no
 * not-found boundary inside the group, and a `notFound()` raised under (shop)/ rendered an EMPTY
 * main region with HTTP **200**.
 *
 * MEASURED 18/08/2026, identically on production and on a local production build:
 *
 *     /blog/{any-invented-slug}         200   header + footer, no content, cached for a year
 *     /blog/tag/{anything}              200
 *     /blog/category/{anything}         200
 *     /shop/{cat}/{invented-slug}       200   robots "index, follow", homepage <title>
 *     /shop/{invented}/reviews          200
 *
 * That shape is Google's textbook soft 404: the URL is never dropped, never indexed, and
 * re-crawled forever. Because the slug space is unbounded, it is an unbounded supply of them —
 * which is what the "Crawled - currently not indexed" (860) and "Duplicate without user-selected
 * canonical" (31) buckets in Search Console are made of.
 *
 * The status code is the entire point of this file. The visible content is secondary; a 404 that
 * renders nothing is still correct, a 200 that renders "not found" never is.
 *
 * No <Header>/<Footer> here, unlike the root not-found: this file is INSIDE the group, so
 * (shop)/layout.tsx already supplies the chrome. Rendering them again would duplicate the header.
 */
export default function ShopNotFound() {
  return <NotFoundContent />;
}
