import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

/**
 * The one canonical product grid for the whole catalog (home rails, shop, category, brand,
 * offres, packs, favoris…). Fixed responsive columns + gaps so every product surface lines up
 * and skeletons match exactly (zero CLS). 2 → 3 → 4 columns, no orphan rows at lg.
 */
export function ProductGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
