import { Metadata } from 'next';
import { getFAQs } from '@/services/api';
import { FAQsPageClient } from './FAQsPageClient';
import type { FAQ } from '@/types';

export const metadata: Metadata = {
  title: 'FAQ – Livraison, Paiement, Protéines | Sobitas Tunisie',
  description: 'Réponses sur commande, livraison, paiement et produits. Tout savoir sur l’achat de compléments alimentaires en Tunisie.',
};

function buildFAQPageSchema(faqs: FAQ[]) {
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs
      .filter((f) => f.question && f.reponse)
      .map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.reponse },
      })),
  };
}

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

  return (
    <>
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <FAQsPageClient faqs={faqs} />
    </>
  );
}
