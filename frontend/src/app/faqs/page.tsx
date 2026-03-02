import { Metadata } from 'next';
import { getFAQs } from '@/services/api';
import { buildFAQPageSchema, validateStructuredData } from '@/util/structuredData';
import { FAQsPageClient } from './FAQsPageClient';

export const metadata: Metadata = {
  title: 'FAQ – Livraison, Paiement, Protéines | Sobitas Tunisie',
  description: 'Réponses sur commande, livraison, paiement et produits. Tout savoir sur l’achat de compléments alimentaires en Tunisie.',
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

  return (
    <>
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <FAQsPageClient faqs={faqs} />
    </>
  );
}
