import { Skeleton } from '@/app/components/ui/skeleton';
import { Section } from '@/app/components/layout/Section';

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
    <div className="rounded-xl border border-hairline bg-elevated shadow-sm p-6 space-y-4">
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

/**
 * Layout-matching placeholder for the account hub while auth resolves.
 *
 * The geometry is copied from `AccountPage`, step for step, because this skeleton is what a
 * returning customer sees on EVERY visit — the auth check is a round trip, and `/account` is not
 * reachable without it. A skeleton that does not match is CLS on a guaranteed path, not a rare one.
 *
 *   mt-6  + summary strip   three stacked rows on a phone, one row of three cells from `sm`
 *   mt-6  + tab list        p-1 around a 44px trigger = 52px, both widths
 *   mb-6  + the first cards the orders tab is the default, so order cards are what to draw
 */
export function AccountPageSkeleton() {
  return (
    <main className="min-h-dvh bg-sunken">
      <Section as="div" spacing="default" first last>
        <PageHeaderSkeleton />
        <Skeleton className="mt-6 h-[14.5rem] w-full rounded-2xl sm:h-[5.75rem]" />
        <Skeleton className="mt-6 h-[3.25rem] w-full rounded-xl" />
        <div className="mt-6 space-y-4">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      </Section>
    </main>
  );
}

/** Layout-matching placeholder for the orders list while auth/orders resolve. */
export function OrdersPageSkeleton() {
  return (
    <main className="min-h-dvh bg-sunken">
      <Section as="div" spacing="default" first last>
        <div className="mb-8">
          <PageHeaderSkeleton />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </Section>
    </main>
  );
}

/** Layout-matching placeholder for a single order detail while it loads. */
export function OrderDetailSkeleton() {
  return (
    <main className="min-h-dvh bg-sunken">
      <Section as="div" spacing="default" first last>
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
      </Section>
    </main>
  );
}
