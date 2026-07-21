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
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-3 sm:py-6 lg:py-12 pb-40 sm:pb-44 lg:pb-12">
        {/* Breadcrumb */}
        <div className="mb-3 sm:mb-4">
          <SkeletonLine className="h-4 w-64 max-w-full rounded" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 xl:gap-10 mb-6 sm:mb-8 lg:mb-10">
          {/* Image column — matches ProductDetailClient col-span-5 + sticky */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
            <div
              className="relative bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse aspect-square max-w-[520px]"
            />
          </div>

          {/* Mobile image */}
          <div className="lg:hidden w-full max-w-[260px] sm:max-w-[320px] mx-auto rounded-xl overflow-hidden">
            <div
              className="relative bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse w-full aspect-square"
            />
          </div>

          {/* Content column */}
          <div className="lg:col-span-7 min-w-0 space-y-4 sm:space-y-6 lg:space-y-8">
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
            <div className="py-4 sm:py-5 border-y border-gray-100 dark:border-gray-800 px-1 flex flex-wrap items-baseline gap-2">
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
          <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
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
                  'flex flex-col overflow-hidden rounded-xl',
                  'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800'
                )}
              >
                <div className="aspect-square w-full bg-gray-100 dark:bg-gray-800 animate-pulse min-h-[140px]" />
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

      {/* Sticky CTAs placeholder (mobile) — matches ProductDetailClient fixed bottom bar */}
      <div
        className="lg:hidden fixed bottom-tabbar left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-2.5 sm:p-3 z-50"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-full mx-auto px-4 sm:px-6 max-w-7xl flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between gap-2">
            <SkeletonLine className="h-4 w-12" />
            <SkeletonLine className="h-6 w-24" />
          </div>
          <SkeletonLine className="h-11 w-full rounded-lg" />
          <SkeletonLine className="h-11 w-full rounded-lg" />
        </div>
      </div>

      <Footer />
    </div>
  );
}
