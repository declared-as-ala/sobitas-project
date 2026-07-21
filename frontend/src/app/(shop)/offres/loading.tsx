import { ProductsSkeleton } from '@/app/components/ProductsSkeleton';

export default function OffresLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <ProductsSkeleton showBreadcrumb={false} showFilters={false} />
      </main>
    </div>
  );
}
