import { Metadata } from 'next';
import { getPageBySlug, getCoordinates } from '@/services/api';
import { loadForCache } from '@/util/loadForCache';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema } from '@/util/structuredData';
import AboutPageClient from './AboutPageClient';

const ABOUT_TITLE = 'À propos | Protéine Tunisie';
const ABOUT_DESCRIPTION =
  'Proteine Tunisie, distributeur de compléments alimentaires et matériel de sport à Sousse. Protéines, whey, créatine depuis des années en Tunisie.';

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
      <AboutPageClient initialPage={page} initialCoordinates={coordinates} />
    </>
  );
}
