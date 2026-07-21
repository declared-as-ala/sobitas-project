import { Skeleton } from '@/app/components/ui/skeleton';

// Layout-matching skeleton for /contact — mirrors ContactPageClient (info card + form card).
export default function ContactLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-10 sm:mb-12 flex flex-col items-center text-center">
          <Skeleton className="mb-3 h-3 w-20 rounded" />
          <Skeleton className="mb-3 h-9 w-72 max-w-full rounded" />
          <Skeleton className="h-4 w-96 max-w-full rounded" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Contact info */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-11 w-11 flex-shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-40 max-w-full rounded" />
                  </div>
                </div>
              ))}
            </div>
            {/* Localisation map placeholder (rendered when coordinates exist) */}
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
