import { Metadata } from 'next';
import { getPacks } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildCollectionPageSchema, buildItemListSchema, buildBreadcrumbListSchema } from '@/util/structuredData';
import { buildProductUrlPath } from '@/util/productUrl';
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
  const baseUrl = getBaseUrl();
  const list = Array.isArray(packs) ? packs : [];

  const collectionSchema = buildCollectionPageSchema(PACKS_TITLE, '/packs', baseUrl, { description: PACKS_DESC });
  const itemListSchema = list.length > 0
    ? buildItemListSchema(
        list.slice(0, 20).map((p: { designation_fr?: string; slug?: string }) => ({
          name: p.designation_fr || p.slug || 'Pack',
          url: buildProductUrlPath(p as never),
        })),
        baseUrl,
        { name: 'Packs' }
      )
    : null;
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [{ name: 'Accueil', url: '/' }, { name: 'Packs', url: '/packs' }],
    baseUrl
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <PacksPageClient packs={packs} />
    </>
  );
}
