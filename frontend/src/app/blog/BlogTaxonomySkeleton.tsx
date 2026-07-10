import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Skeleton } from '@/app/components/ui/skeleton';
import { BlogCardSkeleton } from '@/app/components/BlogCardSkeleton';

const CARD_COUNT = 9;

/**
 * Layout-matching skeleton for the blog category & tag listing pages — same container, breadcrumb
 * row, header and 1/2/3-col grid so there is zero shift when the server data resolves.
 */
export function BlogTaxonomySkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="mb-6 flex items-center gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="mb-8 sm:mb-10">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-9 sm:h-11 lg:h-14 w-3/4 max-w-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {Array.from({ length: CARD_COUNT }).map((_, i) => (
            <BlogCardSkeleton key={i} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
