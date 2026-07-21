import { Metadata } from 'next';
import { getCoordinates } from '@/services/api';
import { loadForCache } from '@/util/loadForCache';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema } from '@/util/structuredData';
import ContactPageClient from './ContactPageClient';

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
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+21627612500',
        email: 'contact@protein.tn',
        contactType: 'customer service',
        areaServed: 'TN',
        availableLanguage: 'French',
      },
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
      <ContactPageClient coordinates={coordinates} />
    </>
  );
}
