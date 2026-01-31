'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ProductCard } from './ProductCard';
import { Product as DataProduct } from '@/data/products';
import type { Product as ApiProduct } from '@/types';
import { Button } from '@/app/components/ui/button';
import { ArrowRight } from 'lucide-react';

type Product = ApiProduct | DataProduct;

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  showBadge?: boolean;
  badgeText?: string;
  id?: string;
  /** Link for "Voir tout" button (default /shop). Use e.g. /packs for packs section. */
  viewAllHref?: string;
  /** Label for "Voir tout" button (default "Voir tout"). */
  viewAllLabel?: string;
}

export const ProductSection = memo(function ProductSection({
  title,
  subtitle,
  products,
  showBadge,
  badgeText,
  id,
  viewAllHref = '/shop',
  viewAllLabel = 'Voir tout',
}: ProductSectionProps) {
  return (
    <section id={id} className="py-8 sm:py-12 md:py-20 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 md:mb-14">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm sm:text-lg md:text-xl text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="hidden sm:block">
            <Button variant="outline" className="group min-h-[44px]" asChild>
              <Link href={viewAllHref} aria-label={viewAllLabel}>
                {viewAllLabel}
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Products Grid - Optimized for mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showBadge={showBadge}
              badgeText={badgeText}
            />
          ))}
        </div>
      </div>
    </section>
  );
});
