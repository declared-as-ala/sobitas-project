import { Metadata } from 'next';
import { getPacks } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { PacksPageClient } from './PacksPageClient';

// Refocused on bundle intent (reserve "offres/promos" wording for /offres so the two
// listing pages don't cannibalize each other) + a self-canonical.
const PACKS_TITLE = 'Packs Protéines & Compléments – Économisez en Tunisie | Protéine Tunisie';
const PACKS_DESC = 'Nos packs protéines et compléments à prix groupé : whey, créatine, gainer. Économisez en une seule commande, livraison partout en Tunisie.';

export const metadata: Metadata = {
  title: { absolute: PACKS_TITLE },
  description: PACKS_DESC,
  alternates: { canonical: buildCanonicalUrl('/packs') },
  openGraph: {
    title: { absolute: PACKS_TITLE },
    description: PACKS_DESC,
    type: 'website',
  },
};

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getPacksData() {
  try {
    const packs = await getPacks();
    return { packs };
  } catch (error) {
    console.error('Error fetching packs:', error);
    return { packs: [] };
  }
}

export default async function PacksPage() {
  const { packs } = await getPacksData();
  return <PacksPageClient packs={packs} />;
}
