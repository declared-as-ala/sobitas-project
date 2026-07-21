import { Skeleton } from '@/app/components/ui/skeleton';
import { BlogCardSkeleton } from '@/app/components/BlogCardSkeleton';

const CARD_COUNT = 9;
const PILL_COUNT = 6;

/**
 * Layout-matching skeleton for the blog index — same container, header rhythm and 1/2/3-col grid
 * as {@link BlogPageClient}, so there is zero shift when the real content mounts. Used by both
 * `blog/loading.tsx` and the `useSearchParams` Suspense fallback in `blog/page.tsx`.
 */
export function BlogListSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14">
        <div className="mb-10 sm:mb-12">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-9 sm:h-11 lg:h-14 w-full max-w-2xl" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
          <div className="mt-6 flex flex-wrap gap-2 md:gap-3">
            {Array.from({ length: PILL_COUNT }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-24 rounded-full" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {Array.from({ length: CARD_COUNT }).map((_, i) => (
            <BlogCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
