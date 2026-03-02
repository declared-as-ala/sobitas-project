'use client';

import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { cn } from '@/app/components/ui/utils';

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse', className)}
      aria-hidden
    />
  );
}

/**
 * Skeleton for the product detail page.
 * Matches ProductDetailClient layout: back button, image + content grid, tabs, similar products.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-6 lg:py-12 pb-20 lg:pb-12">
        {/* Back button */}
        <div className="mb-4 sm:mb-6">
          <SkeletonLine className="h-11 w-24 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-10 mb-6 sm:mb-10 lg:mb-16">
          {/* Image column — matches ProductDetailClient aspect and sticky */}
          <div className="hidden lg:block lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
            <div
              className="relative bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden animate-pulse"
              style={{ aspectRatio: '1 / 1.15' }}
            />
          </div>

          {/* Mobile image */}
          <div className="lg:hidden w-full rounded-2xl overflow-hidden">
            <div
              className="relative bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden animate-pulse w-full"
              style={{ aspectRatio: '1 / 1' }}
            />
          </div>

          {/* Content column */}
          <div className="lg:col-span-3 min-w-0 space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="lg:hidden" />
            <div className="min-w-0 px-1">
              <SkeletonLine className="h-8 sm:h-9 w-4/5 max-w-xl mb-3" />
            </div>
            <div className="space-y-2 px-1">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-3 w-24" />
            </div>
            <div className="flex flex-wrap gap-2 px-1">
              <SkeletonLine className="h-6 w-20 rounded-full" />
              <SkeletonLine className="h-6 w-16 rounded-full" />
            </div>
            <div className="px-1 space-y-2">
              <SkeletonLine className="h-4 w-full" />
              <SkeletonLine className="h-4 w-full" />
              <SkeletonLine className="h-4 w-3/4" />
            </div>
            <div className="flex items-center gap-2 px-1">
              <SkeletonLine className="h-5 w-24 rounded" />
              <SkeletonLine className="h-4 w-16" />
            </div>
            {/* Price */}
            <div className="py-4 sm:py-5 border-y border-gray-200 dark:border-gray-800 px-1 flex flex-wrap items-baseline gap-2">
              <SkeletonLine className="h-10 w-28" />
              <SkeletonLine className="h-6 w-20" />
            </div>
            {/* Quantity + CTA */}
            <div className="space-y-3 px-1">
              <SkeletonLine className="h-4 w-16" />
              <div className="flex items-center gap-3">
                <SkeletonLine className="h-12 w-32 rounded-xl" />
                <SkeletonLine className="h-4 w-24" />
              </div>
              <div className="flex gap-3 pt-2">
                <SkeletonLine className="h-12 w-12 rounded-xl" />
                <SkeletonLine className="h-12 flex-1 rounded-xl max-w-[200px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
            <SkeletonLine className="h-9 w-24 rounded-lg" />
            <SkeletonLine className="h-9 w-28 rounded-lg" />
            <SkeletonLine className="h-9 w-20 rounded-lg" />
          </div>
          <div className="space-y-2">
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-2/3" />
          </div>
        </div>

        {/* Similar products */}
        <div>
          <SkeletonLine className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'flex flex-col overflow-hidden rounded-[14px] sm:rounded-xl',
                  'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="aspect-square w-full bg-gray-200 dark:bg-gray-700 animate-pulse min-h-[140px]" />
                <div className="p-3 space-y-2">
                  <SkeletonLine className="h-4 w-full" />
                  <SkeletonLine className="h-4 w-3/4" />
                  <SkeletonLine className="h-5 w-16 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
