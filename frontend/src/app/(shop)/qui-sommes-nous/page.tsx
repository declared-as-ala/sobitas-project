import { Metadata } from 'next';
import { getPageBySlug, getCoordinates } from '@/services/api';
import { loadForCache } from '@/util/loadForCache';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema } from '@/util/structuredData';
import AboutPageContent from './AboutPageContent';

/**
 * THE ONE PAGE WHERE THE LEGAL NAME BELONGS IN THE TITLE.
 *
 * The consumer rebrand to Protein.tn is not being reversed — every commercial page keeps its
 * Protein.tn title. But after it, "SOBITAS" appeared in zero indexed text on the entire site, and
 * it is still the single biggest query the site receives (589 clicks / 927 impressions / 63.5% CTR
 * over three months, average position 2.42). "Who are we" is exactly the page whose job is to say
 * that the shop people know as SOBITAS is the shop now called Protein.tn — a sentence that
 * currently exists nowhere Google can read.
 *
 * Deliberately NOT applied to /, /shop or any category page: on those the trading name is what the
 * shopper is looking for, and stacking a second brand into an already 60-70 character title costs
 * more in truncation than it wins in recognition.
 */
const ABOUT_TITLE = 'À propos de SOBITAS — Protein.tn | Protéine Tunisie';
/*
 * 154 characters, and both halves of that matter.
 *
 * The previous one was 161 — past the point Google truncates a desktop snippet, so the last words
 * were being cut. It also ended "créatine depuis des années en Tunisie", a vagueness the page
 * itself contradicts: company.ts and the CMS excerpt both say 2010, and a founding year is the
 * single most credible thing an About description can carry.
 */
const ABOUT_DESCRIPTION =
  'SOBITAS, aujourd’hui Protein.tn : compléments alimentaires et matériel de sport à Sousse depuis 2010. Whey, créatine, vitamines livrés partout en Tunisie.';

export const metadata: Metadata = {
  title: { absolute: ABOUT_TITLE },
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: buildCanonicalUrl('/qui-sommes-nous') },
  openGraph: {
    title: { absolute: ABOUT_TITLE },
    description: ABOUT_DESCRIPTION,
    url: buildCanonicalUrl('/qui-sommes-nous'),
    type: 'website',
    siteName: 'Protéine Tunisie',
    locale: 'fr_FR',
    images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: 'À propos — Protéine Tunisie' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'À propos — Protéine Tunisie',
    description: ABOUT_DESCRIPTION,
    images: ['/og-banner.jpg'],
  },
};

// ISR so the "À propos" CMS body is server-rendered (previously fetched in a client useEffect,
// so the unique About content was invisible to crawlers).
export const revalidate = 3600;

export default async function QuiSommesNousPage() {
  // loadForCache on the CMS body (primary content): a failed fetch during `next build` must not bake
  // a bodyless About page — noStore() defers to runtime. Coordinates are incidental (fail soft).
  const [page, coordinates] = await Promise.all([
    loadForCache(() => getPageBySlug('qui-sommes-nous'), null as Awaited<ReturnType<typeof getPageBySlug>> | null),
    getCoordinates().catch(() => null),
  ]);

  const baseUrl = getBaseUrl();
  const canonical = buildCanonicalUrl('/qui-sommes-nous');
  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: page?.title || 'Qui sommes-nous',
    url: canonical,
    inLanguage: 'fr-TN',
    mainEntity: { '@id': `${baseUrl}/#organization` },
  };
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [{ name: 'Accueil', url: '/' }, { name: 'À propos', url: '/qui-sommes-nous' }],
    baseUrl
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <AboutPageContent page={page} coordinates={coordinates} />
    </>
  );
}
