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
  /** Reduce the top padding — used when this section directly follows the compact H1 lede so there
   *  isn't a big empty gap between them. */
  tightTop?: boolean;
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
  tightTop = false,
}: ProductSectionProps) {
  return (
    <section
      id={id}
      className={
        (tightTop ? 'pt-3 sm:pt-4 pb-12 sm:pb-16 lg:pb-20' : 'py-12 sm:py-16 lg:py-20') +
        ' bg-white dark:bg-gray-950'
      }
    >
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
