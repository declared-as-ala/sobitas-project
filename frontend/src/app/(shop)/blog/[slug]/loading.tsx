import { Skeleton } from '@/app/components/ui/skeleton';

/**
 * Layout-matching skeleton for a blog article — mirrors {@link ArticleDetailClient}: the
 * `max-w-4xl` column, breadcrumb/back row, title block, cover image and prose lines.
 */
export default function ArticleLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <Skeleton className="mb-4 sm:mb-6 h-9 w-40 rounded-full" />
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-10 sm:h-12 lg:h-14 w-full" />
            <Skeleton className="mt-3 h-10 sm:h-12 lg:h-14 w-2/3" />
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
          <Skeleton className="h-48 sm:h-64 md:h-80 lg:h-96 w-full rounded-none" />
          <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12 pt-6 sm:pt-8 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className={`h-4 ${i % 4 === 3 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
