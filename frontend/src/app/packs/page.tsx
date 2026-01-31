import { Metadata } from 'next';
import { getPacks } from '@/services/api';
import { PacksPageClient } from './PacksPageClient';

export const metadata: Metadata = {
  title: 'Packs & Offres Compléments Alimentaires Tunisie | SOBITAS',
  description: 'Packs protéines et compléments à prix réduits. Économisez sur whey, créatine et gainer en Tunisie.',
  openGraph: {
    title: 'Packs & Offres Compléments Alimentaires Tunisie | SOBITAS',
    description: 'Packs protéines et compléments à prix réduits. Économisez sur whey, créatine et gainer en Tunisie.',
    type: 'website',
  },
};

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
