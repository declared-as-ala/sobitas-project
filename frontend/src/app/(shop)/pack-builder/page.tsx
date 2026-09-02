import type { Metadata } from 'next';
import { fetchCategoryOrSubCategory, getStorageUrl } from '@/services/api';
import { buildCanonicalUrl } from '@/util/canonical';
import { loadForCache } from '@/util/loadForCache';
import type { Product } from '@/types';
import { getStockDisponible } from '@/util/cartStock';
import { PackBuilderClient, type PackBuilderGroup } from './PackBuilderClient';

const TITLE = 'Composez votre pack — Protéine Tunisie';
const DESC =
  'Créez votre pack sur mesure parmi nos protéines, produits santé, perte de poids, prise de masse, performance et équipements. Plus vous ajoutez, plus vous économisez.';

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

/** The six real shop departments. Each is fetched independently and failures are skipped. */
const BUILDER_CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'sante-vitalite', label: 'Santé & vitalité' },
  { slug: 'proteines', label: 'Protéines' },
  { slug: 'perte-de-poids', label: 'Perte de poids' },
  { slug: 'prise-de-masse', label: 'Prise de masse' },
  { slug: 'performance', label: 'Performance' },
  { slug: 'equipement', label: 'Équipement' },
];

/** The builder combines individual products; pre-built bundles must never appear as ingredients. */
function isPackBuilderProduct(product: Product): boolean {
  const isMarkedPack = Number(product.pack ?? 0) === 1;
  const hasLegacyPackName = /^\s*pack(?:\s|[-–—_:])/i.test(product.designation_fr ?? '');

  return !isMarkedPack && !hasLegacyPackName && getStockDisponible(product as never) > 0;
}

async function getGroups(): Promise<PackBuilderGroup[]> {
  const results = await Promise.allSettled(
    BUILDER_CATEGORIES.map(async ({ slug, label }) => {
      const res = await fetchCategoryOrSubCategory(slug);
      const products = ((res.data.products ?? []) as Product[]).filter(isPackBuilderProduct);

      /** Keep the department's own admin cover available to richer future presentations. */
      const rawCover =
        res.type === 'category'
          ? (res.data.category?.cover ?? null)
          : ((res.data.sous_category?.cover as string | null | undefined) ?? null);

      return {
        slug,
        label,
        cover: rawCover ? getStorageUrl(rawCover) : null,
        // The pack builder is a catalogue tool, not a promotional shelf. Capping this list at 12
        // made valid in-stock products impossible to add even though their category endpoint had
        // already returned them. Product images are lazy-loaded in ProductPicker, so keeping the
        // complete eligible list does not eagerly download every photograph.
        products,
      };
    })
  );

  // Partial failures are tolerated (a category that 404s or is empty is simply skipped). But if EVERY
  // category fetch rejected, that's an outage — throw so loadForCache() can avoid caching an empty
  // builder (e.g. a 403 during `next build`) instead of baking a product-less page.
  if (results.length > 0 && results.every((r) => r.status === 'rejected')) {
    throw new Error('pack-builder: all category fetches failed');
  }

  const groups = results
    .filter(
      (r): r is PromiseFulfilledResult<PackBuilderGroup> =>
        r.status === 'fulfilled' && Array.isArray(r.value.products) && r.value.products.length > 0
    )
    .map((r) => r.value);

  /** A product appears in exactly one department, keeping the recap and selection state honest. */
  const claimed = new Set<number>();
  return groups
    .map((group) => ({
      ...group,
      products: group.products.filter((p) => {
        if (claimed.has(p.id)) return false;
        claimed.add(p.id);
        return true;
      }),
    }))
    // A group whose every product was claimed by an earlier one has nothing left to show, and an
    // empty step is a step the visitor pays a click for and gets nothing from.
    .filter((group) => group.products.length > 0);
}

export default async function PackBuilderPage() {
  const groups = await loadForCache(() => getGroups(), [] as PackBuilderGroup[]);
  return <PackBuilderClient groups={groups} />;
}
