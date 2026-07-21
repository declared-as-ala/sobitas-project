import { Skeleton } from '@/app/components/ui/skeleton';

// Layout-matching skeleton for /page/[slug] — mirrors PageContentClient (hero band + prose block).
export default function PageLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* Hero band */}
      <section className="relative bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:pt-14 sm:pb-16">
          <div className="flex items-center gap-1.5 mb-7">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <Skeleton className="mb-3 h-3 w-14 rounded" />
          <Skeleton className="mb-5 h-10 w-2/3 max-w-md rounded" />
          <Skeleton className="mb-2 h-4 w-full max-w-xl rounded" />
          <Skeleton className="mb-5 h-4 w-1/2 max-w-sm rounded" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
      </section>

      {/* Content */}
      <main className="relative bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
          <div className="space-y-4">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-11/12 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
            <Skeleton className="my-6 h-7 w-1/3 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-11/12 rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
        </div>
      </main>

    </div>
  );
}
