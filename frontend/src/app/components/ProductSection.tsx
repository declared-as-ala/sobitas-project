'use client';

import { memo } from 'react';
import { ProductCard } from './ProductCard';
import { ProductGrid } from './ProductGrid';
import { SectionHeader } from './SectionHeader';
import type { Product as DataProduct } from '@/data/products';
import type { Product as ApiProduct } from '@/types';

type Product = ApiProduct | DataProduct;

interface ProductSectionProps {
  title: string;
  /** Small red uppercase kicker above the title. */
  kicker?: string;
  subtitle?: string;
  products: Product[];
  showBadge?: boolean;
  badgeText?: string;
  id?: string;
  /** Link for "Voir tout" button (default /shop). Use e.g. /packs for packs section. */
  viewAllHref?: string;
  /** Label for "Voir tout" button (default "Voir tout"). */
  viewAllLabel?: string;
  /** Image presentation context for product cards. */
  imageContext?: 'default' | 'packs';
}

export const ProductSection = memo(function ProductSection({
  title,
  kicker,
  subtitle,
  products,
  showBadge,
  badgeText,
  id,
  viewAllHref = '/shop',
  viewAllLabel = 'Voir tout',
  imageContext = 'default',
}: ProductSectionProps) {
  return (
    /* One rhythm, no exceptions. This carried a `tightTop` prop (`pt-3 sm:pt-4`) that existed
       solely to absorb the CategoryRail's undersized `py-7` above it — its own JSDoc described
       "the compact H1 lede", a component that no longer exists. The rail now uses the shared
       `Section spacing="tight"` token and owns its own bottom padding, so the compensation is
       gone. See DESIGN_SYSTEM §3: the gap between two bands is the upper band's `pb` plus the
       lower band's `pt` — never add a prop here to fix a neighbour's spacing. */
    <section id={id} className="bg-white py-12 dark:bg-gray-950 sm:py-16 lg:py-20">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          kicker={kicker}
          title={title}
          subtitle={subtitle}
          viewAllHref={viewAllHref}
          viewAllLabel={viewAllLabel}
        />

        {/* Products grid — shared canonical ProductGrid (2 → 3 → 4, no orphan rows) */}
        <ProductGrid>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showBadge={showBadge}
              badgeText={badgeText}
              imageContext={imageContext}
            />
          ))}
        </ProductGrid>
      </div>
    </section>
  );
});
