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
  /** Image presentation context for product cards. */
  imageContext?: 'default' | 'packs';
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
  imageContext = 'default',
}: ProductSectionProps) {
  return (
    <section id={id} className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-row items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1.5 text-sm sm:text-base text-gray-600 dark:text-gray-400">
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

        {/* Products Grid - Optimized responsive layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showBadge={showBadge}
              badgeText={badgeText}
              imageContext={imageContext}
            />
          ))}
        </div>
      </div>
    </section>
  );
});
