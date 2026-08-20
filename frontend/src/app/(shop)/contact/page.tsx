import { Metadata } from 'next';
import { getCoordinates } from '@/services/api';
import { loadForCache } from '@/util/loadForCache';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema } from '@/util/structuredData';
import { OPENING_HOURS } from '@/util/company';
import ContactPageContent from './ContactPageContent';

/**
 * schema.org wants E.164; the coordonnees record stores "+216 27 612 500" with spaces. Returns
 * null rather than a mangled string when the field is absent, so the caller's `||` fallback fires.
 */
function normalisePhone(raw: string | null | undefined): string | null {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '');
  return digits.length >= 8 ? digits : null;
}

export const metadata: Metadata = {
  // `absolute` so the layout template doesn't append a 2nd " | Protéine Tunisie".
  title: { absolute: 'Contact – Protéine Tunisie, Sousse | Compléments & Whey' },
  description: 'Nous contacter à Sousse : adresse, téléphone, email. Questions sur nos protéines, créatine et compléments en Tunisie.',
  alternates: { canonical: buildCanonicalUrl('/contact') },
  openGraph: {
    title: { absolute: 'Contact – Protéine Tunisie, Sousse | Compléments & Whey' },
    description: 'Nous contacter à Sousse : adresse, téléphone, email. Questions sur nos protéines, créatine et compléments en Tunisie.',
    type: 'website',
    url: buildCanonicalUrl('/contact'),
    /*
      `siteName` and `locale` are repeated here because Next SHALLOW-merges metadata: a page-level
      `openGraph` object REPLACES the root one from layout.tsx wholesale rather than merging into
      it. So this page was silently shipping OG tags with no siteName and no locale, and nobody
      would ever see that in a diff — the fields are simply absent from the output.
    */
    siteName: 'Protéine Tunisie',
    locale: 'fr_FR',
    images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: 'Contact Protéine Tunisie' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact – Protéine Tunisie, Sousse',
    description: 'Nous contacter à Sousse : adresse, téléphone, email.',
    images: ['/og-banner.jpg'],
  },
};

// ISR so the email / address / map (from /coordonnees) are server-rendered — previously fetched in
// a client useEffect, so they popped in after hydration (CLS) and were invisible to crawlers.
export const revalidate = 3600;

export default async function ContactPage() {
  // loadForCache: address / phone / map come from /coordonnees; a failed fetch during `next build`
  // must not bake a contact page missing them — noStore() defers the render to runtime.
  const coordinates = await loadForCache(() => getCoordinates(), null as Awaited<ReturnType<typeof getCoordinates>> | null);
  const baseUrl = getBaseUrl();
  // ContactPage referencing the sitewide LocalBusiness/Organization by @id — do NOT re-emit a
  // full LocalBusiness (layout.tsx already outputs one).
  const contactPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact — Protéine Tunisie',
    url: `${baseUrl}/contact`,
    inLanguage: 'fr-TN',
    about: { '@id': `${baseUrl}/#localbusiness` },
    mainEntity: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      /*
        FOUR CHANNELS, FROM THE SAME SOURCE THE PAGE RENDERS. This was a single ContactPoint with a
        hardcoded telephone and email, sitting in the same scope as an already-awaited
        `coordinates` object that the page body reads for exactly those two fields — so the visible
        page and its own markup could drift the moment somebody edited the record in the admin.

        The array now mirrors what the page actually offers. `contactType` is the vocabulary
        Google reads to tell a sales line from a support line; `hoursAvailable` comes from the one
        OPENING_HOURS constant, so the schema cannot say something different from the panel a
        reader is looking at.
      */
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: normalisePhone(coordinates?.phone_1) || '+21627612500',
          email: coordinates?.email || 'contact@protein.tn',
          contactType: 'customer service',
          areaServed: 'TN',
          availableLanguage: 'French',
          hoursAvailable: OPENING_HOURS.spec.map((slot) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: slot.days,
            opens: slot.opens,
            closes: slot.closes,
          })),
        },
        {
          '@type': 'ContactPoint',
          telephone: normalisePhone(coordinates?.phone_2) || '+21673200169',
          contactType: 'sales',
          areaServed: 'TN',
          availableLanguage: 'French',
        },
      ],
    },
  };
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [{ name: 'Accueil', url: '/' }, { name: 'Contact', url: '/contact' }],
    baseUrl
  );
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ContactPageContent coordinates={coordinates} />
    </>
  );
}
