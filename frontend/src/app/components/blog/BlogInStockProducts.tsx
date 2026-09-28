import { unstable_cache } from 'next/cache';
import { getCategoryHighlights } from '@/services/api';
import { taxonomyLabel } from '@/config/catalogTaxonomy';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { Section } from '@/app/components/layout/Section';
import { isInStock } from '@/util/cartStock';
import { blogCommercialCategory } from '@/util/blogCommercialCategory';
import { humanProductHeading } from '@/util/productMetaDescription';
import { formatTnd, getPriceDisplay } from '@/util/productPrice';
import { getProductLink } from '@/util/productUrl';

interface Props {
  slug: string;
  arabic: boolean;
}

export async function BlogInStockProducts({ slug, arabic }: Props) {
  const categorySlug = blogCommercialCategory(slug);
  if (!categorySlug) return null;

  const getCachedProducts = unstable_cache(
    async () => {
      const list = await getCategoryHighlights(categorySlug, 6);
      // Never cache an empty answer: a transient API failure also comes back as [], and storing it
      // would hide the block on every article of this category for ten minutes.
      if (list.length === 0) throw new Error(`no in-stock highlights for ${categorySlug}`);
      return list;
    },
    ['blog-in-stock-products', categorySlug],
    { revalidate: 600, tags: ['shop', 'products'] }
  );
  const products = (await getCachedProducts().catch(() => [])).filter(
    (product) => product.slug && isInStock(product)
  );
  if (products.length === 0) return null;

  const categoryLabel = taxonomyLabel(categorySlug);
  return (
    <Section as="section" container={false} spacing="tight" surface="sunken" className="mt-8 rounded-xl border border-hairline px-4 sm:px-6" aria-labelledby="blog-in-stock-heading">
      <div dir={arabic ? 'rtl' : 'ltr'}>
        <h2 id="blog-in-stock-heading" className="mb-4 font-display text-xl font-bold text-ink-1 sm:text-2xl">
          {arabic ? 'متوفر الآن في Protein.tn' : 'Disponibles maintenant chez Protein.tn'}
        </h2>
        <ul className="divide-y divide-rule">
          {products.map((product) => (
            <li key={product.id}>
              <LinkWithLoading href={getProductLink(product)} className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg py-3 text-ink-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                <span>{humanProductHeading(product)}</span>
                <span className="whitespace-nowrap font-display font-semibold text-brand">{formatTnd(getPriceDisplay(product).finalPrice)}</span>
              </LinkWithLoading>
            </li>
          ))}
        </ul>
        <LinkWithLoading href={`/${categorySlug}`} className="mt-3 inline-flex min-h-11 items-center rounded-lg font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          {arabic ? `شاهد كل منتجات ${categoryLabel}` : `Voir tout le rayon ${categoryLabel}`}
        </LinkWithLoading>
      </div>
    </Section>
  );
}
