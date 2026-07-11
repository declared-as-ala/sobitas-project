import { Metadata } from 'next';
import { getFAQs } from '@/services/api';
import { buildFAQPageSchema, buildBreadcrumbListSchema, validateStructuredData } from '@/util/structuredData';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { FAQsPageClient } from './FAQsPageClient';

export const metadata: Metadata = {
  title: { absolute: 'FAQ – Livraison, Paiement, Protéines | Protéine Tunisie' },
  description: 'Réponses sur commande, livraison, paiement et produits. Tout savoir sur l’achat de compléments alimentaires en Tunisie.',
  alternates: { canonical: buildCanonicalUrl('/faqs') },
  openGraph: {
    title: { absolute: 'FAQ – Livraison, Paiement, Protéines | Protéine Tunisie' },
    description: 'Réponses sur commande, livraison, paiement et produits. Tout savoir sur l’achat de compléments alimentaires en Tunisie.',
    type: 'website',
    url: buildCanonicalUrl('/faqs'),
    images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: 'FAQ Protéine Tunisie' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ – Livraison, Paiement, Protéines',
    description: 'Réponses sur commande, livraison, paiement et produits en Tunisie.',
    images: ['/og-banner.jpg'],
  },
};

async function getFAQsData() {
  try {
    const faqs = await getFAQs();
    return { faqs };
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return { faqs: [] };
  }
}

export default async function FAQsPage() {
  const { faqs } = await getFAQsData();
  const faqSchema = buildFAQPageSchema(faqs);
  if (faqSchema) validateStructuredData(faqSchema, 'FAQPage');
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [{ name: 'Accueil', url: '/' }, { name: 'FAQ', url: '/faqs' }],
    getBaseUrl()
  );

  return (
    <>
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <FAQsPageClient faqs={faqs} />
    </>
  );
}
