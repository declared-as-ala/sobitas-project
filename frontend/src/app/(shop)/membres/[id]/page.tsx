import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMemberProfile } from '@/services/api';
import MemberProfileView from './MemberProfileView';

/**
 * ── A MEMBER'S PUBLIC PAGE ──────────────────────────────────────────────────────────────────
 * Owner, 21/08/2026: *"make user profiles can be visible since we will make users, when click on
 * them shows profile and how much reviews."*
 *
 * ── IT IS A SERVER COMPONENT BECAUSE THE STATUS CODE MATTERS ────────────────────────────────
 * The first version fetched on the client and rendered a "Profil introuvable" panel when the API
 * 404'd. `check-url-contract` failed the build over it, correctly: a client-rendered miss is an
 * HTTP **200**, and `/membres/{anything}` answering 200 mints an unbounded family of near-identical
 * pages for Google to crawl forever. `noindex` does not fix that — a crawler still has to fetch
 * each one to find out.
 *
 * So the fetch happens here and a miss calls `notFound()`, which is a real 404. That also removes
 * the loading state, the error state and the `'use client'` from the view below it: the page either
 * exists and renders, or it does not exist.
 *
 * ── AND WHY MOST IDS ARE MISSES ─────────────────────────────────────────────────────────────
 * `/members/{id}` 404s for anybody with no PUBLISHED review — see `ReviewThreadController`. A
 * profile exists only once its owner has chosen to write in public, and it carries a display name
 * and their reviews: never an email, never an order, never a points balance. Customers here
 * registered to buy protein, not to have a public page.
 *
 * `robots: index false, follow true` is a deliberate pair. NOT indexed, because the page is thin by
 * construction — a name, a date, and review text that already lives on the product pages those
 * reviews belong to; thousands of those would dilute a domain whose blog already has 184 of 224
 * articles unindexed. STILL followed, because every review here links back to a product and that
 * link is worth passing.
 */
export const metadata: Metadata = {
  title: 'Profil membre',
  description: 'Les avis publiés par ce membre sur Protein.tn.',
  robots: { index: false, follow: true },
};

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const numeric = Number(id);
  if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isInteger(numeric)) {
    notFound();
  }

  try {
    const profile = await getMemberProfile(numeric);
    return <MemberProfileView profile={profile} />;
  } catch {
    /*
     * Every failure is a 404, including a backend that is down.
     *
     * Deliberate: the alternative is a 500 on a page nobody is entitled to see in the first place,
     * and "this profile is not available" is true either way. It also keeps the answer for a
     * missing member indistinguishable from the answer for a member with nothing published —
     * whether an account exists is not a fact worth confirming to somebody typing ids into the
     * address bar.
     */
    notFound();
  }
}
