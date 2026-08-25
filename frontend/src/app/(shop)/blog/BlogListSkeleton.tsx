import { Skeleton } from '@/app/components/ui/skeleton';
import { BlogCardSkeleton } from '@/app/components/BlogCardSkeleton';
import { Section } from '@/app/components/layout/Section';

const CARD_COUNT = 9;
const PILL_COUNT = 6;

/**
 * Layout-matching skeleton for the blog index — same container, header rhythm and 1/2/3-col grid
 * as {@link BlogPageClient}, so there is zero shift when the real content mounts. Used by both
 * `blog/loading.tsx` and the `useSearchParams` Suspense fallback in `blog/page.tsx`.
 */
export function BlogListSkeleton() {
  return (
    <div className="min-h-screen bg-canvas">
      <main>
        <Section first spacing="tight" width="wide">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-9 w-full max-w-2xl sm:h-11 lg:h-14" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
          <div className="mt-6 rounded-2xl border border-hairline bg-elevated p-3 sm:p-4">
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: PILL_COUNT }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-24 shrink-0 rounded-full" />
              ))}
            </div>
          </div>
        </Section>
        <Section surface="sunken" spacing="default" width="wide">
          <div className="mb-5 flex items-end justify-between gap-4 lg:mb-6">
            <div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-48" />
            </div>
            <Skeleton className="h-11 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:gap-6">
            {Array.from({ length: CARD_COUNT }).map((_, i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}
