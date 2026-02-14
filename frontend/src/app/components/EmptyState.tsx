'use client';

import Link from 'next/link';
import { Package, ShoppingBag } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  /** Link to shop for "Voir tous les produits" */
  showShopLink?: boolean;
  className?: string;
}

export function EmptyState({
  title = 'Aucun produit trouvé',
  description = 'Aucun produit dans cette catégorie pour le moment.',
  showShopLink = true,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center',
        className
      )}
    >
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
        <Package className="h-10 w-10 text-gray-400 dark:text-gray-500" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mb-6">{description}</p>
      {showShopLink && (
        <Button asChild variant="outline" size="lg" className="gap-2">
          <Link href="/shop">
            <ShoppingBag className="h-4 w-4" />
            Voir tous les produits
          </Link>
        </Button>
      )}
    </div>
  );
}
