import Link from 'next/link';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
import { getBrandSeoEntry } from '@/config/brandSeoConfig';
import type { Brand, Product } from '@/types';
import { brandNameToSlug } from '@/util/brandSlug';
import { isInStock } from '@/util/cartStock';

type BrandLink = { slug: string; label: string };

export function resolveCategoryBrandLinks(
  products: Product[],
  brands: Brand[],
  brandSlugs?: string[]
): BrandLink[] {
  if (brandSlugs?.length) {
    return [...new Set(brandSlugs)].slice(0, 8).flatMap((slug) => {
      const entry = getBrandSeoEntry(slug);
      if (!entry) return [];
      // The curated heading supplies one stable label to both category renders.
      const headingLabel = entry.h1.split(':')[0];
      const name = headingLabel.replace(/(?: en)? Tunisie$/, '');
      const servedSlug = brandNameToSlug(name);
      if (servedSlug !== slug) return [];
      return [{ slug: servedSlug, label: headingLabel === `${name} Tunisie` ? headingLabel : name }];
    });
  }

  const byId = new Map(brands.map((brand) => [brand.id, brand]));
  const counts = new Map<string, { name: string; buyable: number; total: number }>();
  for (const product of products) {
    const brand = (product.brand_id != null ? byId.get(product.brand_id) : undefined) ?? product.brand;
    if (!brand?.designation_fr) continue;
    const slug = brandNameToSlug(brand.designation_fr);
    if (!getBrandSeoEntry(slug)) continue;
    const row = counts.get(slug) ?? { name: brand.designation_fr, buyable: 0, total: 0 };
    row.total += 1;
    if (isInStock(product)) row.buyable += 1;
    counts.set(slug, row);
  }
  return [...counts]
    .sort((a, b) => b[1].buyable - a[1].buyable || b[1].total - a[1].total || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([slug, row]) => ({
      slug,
      label: getBrandSeoEntry(slug)!.h1.startsWith(`${row.name} Tunisie`)
        ? `${row.name} Tunisie`
        : row.name,
    }));
}

export function CategoryBrandLinks({ links }: { links: BrandLink[] }) {
  if (!links.length) return null;
  const headingId = 'marques-de-ce-rayon';
  return (
    <Section spacing="tight" surface="base" width="wide" aria-labelledby={headingId}>
      <SectionHeader id={headingId} title="Marques de ce rayon" scale="3" />
      <ul className="flex flex-wrap gap-2">
        {links.map(({ slug, label }) => (
          <li key={slug}>
            <Link href={`/${slug}`} prefetch={false} className="inline-flex min-h-11 items-center rounded-lg border border-hairline bg-elevated px-4 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
