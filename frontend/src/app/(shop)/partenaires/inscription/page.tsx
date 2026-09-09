import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildCanonicalUrl } from '@/util/canonical';
import { AffiliateSignupClient } from './AffiliateSignupClient';

/**
 * /partenaires/inscription — the five-step affiliate signup.
 *
 * ── A CHILD OF /partenaires, NOT A NEW TOP-LEVEL ROUTE ────────────────────────────────────
 * Deliberate, and it is what keeps the build green. `scripts/check-reserved-routes.mjs` and
 * `scripts/check-sitemap-routes.mjs` both enumerate TOP-LEVEL segments; a new one fails the build
 * until somebody registers it in `isReservedRouteSlug` and decides whether it belongs in the
 * sitemap. Nesting under a segment that is already reserved answers both questions correctly —
 * and it matters for more than CI: middleware rewrites `/{a}/{b}` to `/x-crawler/product/{a}/{b}`
 * unless `a` is reserved, which is how /avis/{token} spent months answering 200 to a browser and
 * 404 to Googlebot. `partenaires` is on that list.
 *
 * ── NOINDEX, FOLLOW ───────────────────────────────────────────────────────────────────────
 * This is a form, not content. There is nothing here to rank and a thin duplicate of the landing
 * page's intent would compete with the page that IS meant to rank. `follow` so the links out of
 * it still pass, and a self-canonical so a stray `?type=` variant cannot be indexed as a separate
 * URL — the flow reads that parameter, so it will exist in the wild.
 */

const TITLE = 'Devenir affilié Protein.tn — Inscription';
const DESC =
  'Inscription au programme d’affiliation Protein.tn : votre profil, vos coordonnées, votre pièce d’identité et deux codes de confirmation. Environ 5 minutes.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  robots: { index: false, follow: true },
  alternates: { canonical: buildCanonicalUrl('/partenaires/inscription') },
};

export default function AffiliateSignupPage() {
  return (
    /*
     * `useSearchParams` opts a route out of static rendering unless it sits under a Suspense
     * boundary. The fallback is deliberately the page's own frame rather than a spinner: the
     * client's first paint is a skeleton in the same shell, so the two states are the same
     * shape and nothing jumps.
     */
    <Suspense fallback={<div className="min-h-screen bg-canvas" aria-hidden />}>
      <AffiliateSignupClient />
    </Suspense>
  );
}
