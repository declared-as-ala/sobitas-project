import { Skeleton } from '@/app/components/ui/skeleton';
import { Section } from '@/app/components/layout/Section';

/**
 * Layout-matching skeleton for /contact — mirrors ContactPageContent.
 *
 * It had been mirroring the previous page (centred heading, a sidebar of four rows, a form taking
 * two thirds), which is a different shape from what now renders. A skeleton that predicts the
 * wrong layout is worse than none: it reserves space in the wrong places and then everything
 * moves.
 */
export default function ContactLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      <main>
        <Section as="div" spacing="feature" width="wide" first>
          <div className="max-w-2xl">
            <Skeleton className="mb-3 h-3 w-20 rounded" />
            <Skeleton className="mb-4 h-12 w-96 max-w-full rounded" />
            <Skeleton className="mb-2 h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:mt-9 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[7.5rem] w-full rounded-2xl" />
            ))}
          </div>
        </Section>

        <Section surface="sunken" spacing="default" width="wide">
          <Skeleton className="mb-3 h-3 w-24 rounded" />
          <Skeleton className="mb-6 h-9 w-80 max-w-full rounded" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
            <Skeleton className="h-[27rem] w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
