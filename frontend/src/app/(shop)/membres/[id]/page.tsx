import type { Metadata } from 'next';
import MemberProfileClient from './MemberProfileClient';

/**
 * ── A MEMBER'S PUBLIC PAGE, AND WHY IT IS noindex ───────────────────────────────────────────
 * Owner, 21/08/2026: *"make user profiles can be visible since we will make users, when click on
 * them shows profile and how much reviews."*
 *
 * The page is public — anybody with the link reads it, which is what "visible" asks for. It is
 * `robots: index false, follow true`, and that is a deliberate pair rather than caution:
 *
 *   NOT INDEXED, because a member page is thin by construction — a name, a date and a handful of
 *   reviews whose text is already on the product pages those reviews belong to. Letting Google
 *   crawl one per customer would add thousands of near-duplicate pages to a site whose blog
 *   already has 184 of its 224 articles unindexed. Thin pages do not sit inertly; they dilute how
 *   the domain is read, and the pages being diluted here are the ones that sell.
 *
 *   STILL FOLLOWED, because every review on a profile links back to a product, and those links are
 *   worth passing. `follow` keeps the crawl value without asking for the page itself to rank.
 *
 * The privacy side is enforced in the API rather than here: `/members/{id}` 404s for anybody with
 * no PUBLISHED review, so a page exists only once its owner has chosen to write in public, and it
 * carries a display name and reviews — never an email, an order, or a points balance. See
 * `ReviewThreadController::publicProfile`.
 */
export const metadata: Metadata = {
  title: 'Profil membre',
  description: 'Les avis publiés par ce membre sur Protein.tn.',
  robots: { index: false, follow: true },
};

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberProfileClient id={id} />;
}
