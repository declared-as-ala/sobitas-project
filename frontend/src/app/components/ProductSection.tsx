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
    <section id={id} className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
