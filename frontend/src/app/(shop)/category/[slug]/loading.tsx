import { CategorySkeleton } from '@/app/components/ProductsSkeleton';

export default function CategoryLoading() {
  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <CategorySkeleton />
      </main>
    </>
  );
}
