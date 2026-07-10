import { Metadata } from 'next';
import { getCoordinates } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema } from '@/util/structuredData';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  // `absolute` so the layout template doesn't append a 2nd " | Protéine Tunisie".
  title: { absolute: 'Contact – Protéine Tunisie, Sousse | Compléments & Whey' },
  description: 'Nous contacter à Sousse : adresse, téléphone, email. Questions sur nos protéines, créatine et compléments en Tunisie.',
  alternates: { canonical: buildCanonicalUrl('/contact') },
};

// ISR so the email / address / map (from /coordonnees) are server-rendered — previously fetched in
// a client useEffect, so they popped in after hydration (CLS) and were invisible to crawlers.
export const revalidate = 3600;

export default async function ContactPage() {
  const coordinates = await getCoordinates().catch(() => null);
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
