import { Skeleton } from '@/app/components/ui/skeleton';
import { Section } from '@/app/components/layout/Section';

/**
 * Layout-matching skeleton for /qui-sommes-nous — mirrors AboutPageContent.
 *
 * A skeleton is only worth rendering if it occupies the same space the real thing will: this one
 * had been mirroring a page that no longer exists (a centred hero on a `max-w-4xl` rail, three
 * stat cards, two prose cards), so it was pre-drawing a layout the reader would never see and
 * then jumping to a different one. Same rail, same bands, same block heights as the page.
 */
export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      <main>
        <Section as="div" spacing="feature" width="wide" first>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-14">
            <div className="min-w-0">
              <Skeleton className="mb-3 h-3 w-28 rounded" />
              <Skeleton className="mb-4 h-12 w-80 max-w-full rounded" />
              <Skeleton className="mb-2 h-4 w-full max-w-2xl rounded" />
              <Skeleton className="mb-2 h-4 w-11/12 max-w-2xl rounded" />
              <Skeleton className="mb-7 h-4 w-2/3 max-w-md rounded" />
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-12 w-40 rounded-xl" />
                <Skeleton className="h-12 w-40 rounded-xl" />
              </div>
            </div>
            <Skeleton className="h-[19rem] w-full rounded-2xl" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline lg:mt-10 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-canvas p-4 sm:p-5">
                <Skeleton className="mb-2 h-8 w-24 rounded" />
                <Skeleton className="mb-1 h-3.5 w-28 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            ))}
          </div>
        </Section>

        <Section surface="sunken" spacing="default" width="wide">
          <Skeleton className="mb-3 h-3 w-24 rounded" />
          <Skeleton className="mb-6 h-9 w-96 max-w-full rounded" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[minmax(0,14rem)_minmax(0,46rem)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full rounded" />
              ))}
            </div>
            <div className="min-w-0 space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2.5">
                  <Skeleton className="h-6 w-3/5 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-11/12 rounded" />
                  <Skeleton className="h-4 w-4/5 rounded" />
                </div>
              ))}
            </div>
            <Skeleton className="hidden h-56 w-full rounded-2xl xl:block" />
          </div>
        </Section>
      </main>
    </div>
  );
}
