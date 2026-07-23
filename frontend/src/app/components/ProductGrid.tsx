import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

/**
 * The one canonical product grid for the whole catalog (home rails, shop, category, brand,
 * offres, packs, favoris…). Fixed responsive columns + gaps so every product surface lines up
 * and skeletons match exactly (zero CLS).
 *
 * ONE card per row on phones (owner request): the redesigned card is rich (brand, rating, chips)
 * and reads far better full-width than squeezed into a 2-column phone grid. 1 → 2 → 3 → 4 columns.
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
        'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
