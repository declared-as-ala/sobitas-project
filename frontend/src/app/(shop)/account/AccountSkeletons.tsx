import { Skeleton } from '@/app/components/ui/skeleton';

/** Kicker + display-face title placeholder that mirrors <PageHeader>. */
function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-9 w-56" />
    </div>
  );
}

function OrderCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-24" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}

/** Layout-matching placeholder for the account hub (profile/orders tabs) while auth resolves. */
export function AccountPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <PageHeaderSkeleton />
        <div className="mt-8 space-y-8">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}

/** Layout-matching placeholder for the orders list while auth/orders resolve. */
export function OrdersPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-8">
          <PageHeaderSkeleton />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}

/** Layout-matching placeholder for a single order detail while it loads. */
export function OrderDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Skeleton className="h-9 w-24 mb-6" />
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <PageHeaderSkeleton />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
