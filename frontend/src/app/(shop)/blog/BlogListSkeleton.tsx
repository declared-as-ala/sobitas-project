import { Skeleton } from '@/app/components/ui/skeleton';
import { BlogCardSkeleton } from '@/app/components/BlogCardSkeleton';
import { Section } from '@/app/components/layout/Section';

const CARD_COUNT = 6;
const PILL_COUNT = 5;

/**
 * Layout-matching skeleton for the blog index — same container, header rhythm and 1/2/3-col grid
 * as {@link BlogPageClient}, so there is zero shift when the real content mounts. Used by both
 * `blog/loading.tsx` and the `useSearchParams` Suspense fallback in `blog/page.tsx`.
 */
export function BlogListSkeleton() {
  return (
    <>
      <Section first spacing="default" width="wide">
        <div className="grid gap-7 lg:grid-cols-2 lg:items-end lg:gap-12">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-20 w-full max-w-2xl sm:h-24" />
            <Skeleton className="mt-4 h-5 w-full max-w-xl" />
            <div className="mt-5 flex gap-2"><Skeleton className="h-8 w-20 rounded-full" /><Skeleton className="h-8 w-28 rounded-full" /></div>
          </div>
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </Section>
      <Section surface="sunken" spacing="default" width="wide">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-9 w-72 max-w-full" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_0.85fr] lg:gap-6">
          <Skeleton className="h-[28rem] rounded-2xl" />
          <div className="grid gap-4"><Skeleton className="h-[13.5rem] rounded-2xl" /><Skeleton className="h-[13.5rem] rounded-2xl" /></div>
        </div>
      </Section>
      <Section spacing="default" width="wide">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-9 w-48" /></div>
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
        <div className="mb-5 rounded-2xl border border-hairline bg-elevated p-3 sm:p-4">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: PILL_COUNT }).map((_, i) => <Skeleton key={i} className="h-11 w-24 shrink-0 rounded-xl" />)}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:gap-6">
          {Array.from({ length: CARD_COUNT }).map((_, i) => <BlogCardSkeleton key={i} />)}
        </div>
      </Section>
    </>
  );
}
