import { Skeleton } from '@/app/components/ui/skeleton';

// Layout-matching skeleton for /faqs — mirrors FAQsPageClient (centered header + accordion card).
export default function FAQsLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col items-center text-center mb-10 sm:mb-12">
          <Skeleton className="mb-5 h-14 w-14 rounded-xl" />
          <Skeleton className="mb-3 h-3 w-16 rounded" />
          <Skeleton className="mb-3 h-9 w-72 max-w-full rounded" />
          <Skeleton className="h-4 w-96 max-w-full rounded" />
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 sm:px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-5 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
            >
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-4 flex-shrink-0 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
