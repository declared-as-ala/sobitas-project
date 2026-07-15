import type { Metadata } from 'next';
import { fetchCategoryOrSubCategory } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { loadForCache } from '@/util/loadForCache';
import type { Product } from '@/types';
import { PackBuilderClient, type PackBuilderGroup } from './PackBuilderClient';

const TITLE = 'Composez votre pack — Protéine Tunisie';
const DESC =
  'Créez votre pack sur mesure : whey, créatine, gainers et plus. Plus vous ajoutez, plus vous économisez grâce à nos remises groupées progressives. Livraison partout en Tunisie.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: buildCanonicalUrl('/pack-builder') },
  openGraph: {
    title: { absolute: TITLE },
    description: DESC,
    type: 'website',
    url: buildCanonicalUrl('/pack-builder'),
    images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESC,
    images: ['/og-banner.jpg'],
  },
};

// Bundle catalog is cache-safe; refresh in the background every 10 min.
export const revalidate = 600;

/** Key categories offered in the builder. Each is fetched independently and failures are skipped. */
const BUILDER_CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'whey-proteine', label: 'Whey protéine' },
  { slug: 'creatine', label: 'Créatine' },
  { slug: 'gainers-proteines', label: 'Gainers' },
  { slug: 'prise-de-masse', label: 'Prise de masse' },
  { slug: 'pre-workout', label: 'Pre-workout' },
];

async function getGroups(): Promise<PackBuilderGroup[]> {
  const results = await Promise.allSettled(
    BUILDER_CATEGORIES.map(async ({ slug, label }) => {
      const res = await fetchCategoryOrSubCategory(slug);
      const products = (res.data.products ?? []) as Product[];
      return { slug, label, products: products.slice(0, 12) };
    })
  );

  // Partial failures are tolerated (a category that 404s or is empty is simply skipped). But if EVERY
  // category fetch rejected, that's an outage — throw so loadForCache() can avoid caching an empty
  // builder (e.g. a 403 during `next build`) instead of baking a product-less page.
  if (results.length > 0 && results.every((r) => r.status === 'rejected')) {
    throw new Error('pack-builder: all category fetches failed');
  }

  return results
    .filter(
      (r): r is PromiseFulfilledResult<PackBuilderGroup> =>
        r.status === 'fulfilled' && Array.isArray(r.value.products) && r.value.products.length > 0
    )
    .map((r) => r.value);
}

export default async function PackBuilderPage() {
  const groups = await loadForCache(() => getGroups(), [] as PackBuilderGroup[]);
  return <PackBuilderClient groups={groups} />;
}
