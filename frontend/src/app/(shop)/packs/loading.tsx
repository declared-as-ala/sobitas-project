import { Skeleton } from '@/app/components/ui/skeleton';
import { ProductGrid } from '@/app/components/ProductGrid';
import { ProductCardSkeleton } from '@/app/components/ProductCardSkeleton';

// Matches PacksPageClient: centered header + product grid, no search/filter row (packs has none).
export default function PacksLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="mb-8 sm:mb-10 flex flex-col items-center text-center">
          <Skeleton className="mb-3 h-3 w-20 rounded" />
          <Skeleton className="mb-3 h-9 w-64 max-w-full rounded" />
          <Skeleton className="h-4 w-80 max-w-full rounded" />
        </div>
        <ProductGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </ProductGrid>
      </main>
    </div>
  );
}
