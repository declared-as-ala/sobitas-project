import { Skeleton } from '@/app/components/ui/skeleton';

/**
 * Placeholder for {@link BlogCard} — same 16:10 cover, `p-4 sm:p-5` body, two title lines, excerpt
 * lines and meta row, so swapping skeleton → card produces zero layout shift.
 */
export function BlogCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-sm">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <Skeleton className="mb-2 h-5 sm:h-6 w-3/4" />
        <Skeleton className="mb-2 sm:mb-3 h-5 sm:h-6 w-1/2" />
        <div className="mb-4 flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="mt-auto flex items-center justify-between gap-4 border-t border-hairline pt-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}
