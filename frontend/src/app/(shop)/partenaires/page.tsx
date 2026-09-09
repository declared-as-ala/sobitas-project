import type { Metadata } from 'next';
import { buildCanonicalUrl } from '@/util/canonical';
import { AffiliateLanding } from './AffiliateLanding';

/**
 * The public door to the affiliate programme.
 *
 * The module behind it (Partner / PartnerCode / PartnerTransaction / PartnerPayout, plus its own
 * Filament panel at `/affilie`) has existed and worked for some time — but entirely inside the
 * admin. Every affiliate had to be typed in by hand, which is why the programme has the
 * affiliates it has and no more. This route is the missing half.
 *
 * It is a SERVER page with static metadata because it is also an acquisition page — "devenir
 * partenaire salle de sport tunisie" is a query with real intent and no incumbent.
 *
 * ── ON THE TITLE ──────────────────────────────────────────────────────────────────────────
 * "Partenaire" is kept alongside "Affilié". The owner's rename ("I don't want to see partner",
 * docs/affiliate-ecosystem-plan.md §6) governs tables, models, the panel and the admin nav — not
 * a public URL that has been indexed since August and not the query people actually type. The
 * page's own language is "affilié" throughout; the title carries both so the change costs
 * nothing in Search Console.
 *
 * The PATH is untouched for the same reason, and for two mechanical ones: /partenaires is
 * submitted in util/sitemapSources.ts, and it is listed in `isReservedRouteSlug`, without which
 * middleware rewrites it to /x-crawler/category/partenaires and serves Googlebot a 404 for a page
 * that answers 200 to every human.
 */

const TITLE = 'Programme Affilié & Partenaire — Coachs, Salles de Sport | Protein.tn';
const DESC =
  'Coach, salle de sport, créateur ou passionné en Tunisie ? Devenez affilié Protein.tn : code de réduction à votre nom, commission sur chaque commande livrée, suivi en temps réel. Inscription gratuite, ou connexion à votre espace affilié.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: buildCanonicalUrl('/partenaires') },
  openGraph: {
    title: { absolute: TITLE },
    description: DESC,
    type: 'website',
    url: buildCanonicalUrl('/partenaires'),
    images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/og-banner.jpg'] },
};

export default function PartenairesPage() {
  return <AffiliateLanding />;
}
