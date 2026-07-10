import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Skeleton } from '@/app/components/ui/skeleton';

// Layout-matching skeleton for /qui-sommes-nous — mirrors AboutPageClient (hero + stat tiles + prose cards).
export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main>
        {/* Hero */}
        <section className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
            <div className="flex flex-col items-center text-center">
              <Skeleton className="mb-3 h-3 w-24 rounded" />
              <Skeleton className="mb-4 h-10 w-80 max-w-full rounded" />
              <Skeleton className="mb-2 h-4 w-full max-w-xl rounded" />
              <Skeleton className="mb-6 h-4 w-2/3 max-w-md rounded" />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Skeleton className="h-10 w-36 rounded-xl" />
                <Skeleton className="h-10 w-36 rounded-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 text-center"
                >
                  <Skeleton className="mx-auto mb-4 h-12 w-12 sm:h-14 sm:w-14 rounded-lg" />
                  <Skeleton className="mx-auto mb-2 h-9 w-24 rounded" />
                  <Skeleton className="mx-auto h-4 w-28 rounded" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content cards */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 sm:p-8"
              >
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <Skeleton className="h-6 w-1 rounded-full" />
                  <Skeleton className="h-6 w-48 max-w-full rounded" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-11/12 rounded" />
                  <Skeleton className="h-4 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
