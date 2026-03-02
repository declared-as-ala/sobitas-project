'use client';

export function BlogCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm h-full flex flex-col animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-200 dark:bg-gray-700 min-h-[200px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px]">
        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
      </div>
      
      {/* Content skeleton */}
      <div className="p-4 sm:p-5 md:p-6 lg:p-7 flex flex-col flex-1 min-w-0">
        {/* Title skeleton */}
        <div className="h-6 sm:h-7 md:h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2 sm:mb-3 md:mb-4 w-3/4" />
        <div className="h-6 sm:h-7 md:h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2 sm:mb-3 md:mb-4 w-1/2" />
        
        {/* Excerpt skeleton */}
        <div className="space-y-2 mb-3 sm:mb-4 md:mb-5 flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
        
        {/* Meta skeleton */}
        <div className="flex items-center gap-3 sm:gap-4 md:gap-5 mt-auto">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}
