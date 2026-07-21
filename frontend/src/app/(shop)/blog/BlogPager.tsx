import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BlogPagerProps {
  page: number;
  totalPages: number;
  /** Path without query, e.g. "/blog/category/whey". Page is appended as ?page=N. */
  basePath: string;
}

const arrowBase =
  'flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition-colors dark:border-gray-800 dark:text-gray-300';
const arrowEnabled =
  'hover:border-red-600 hover:text-red-600 dark:hover:border-red-400 dark:hover:text-red-400';
const arrowDisabled = 'pointer-events-none opacity-50';

function hrefFor(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

/**
 * Server-safe compact pager for the category/tag listing pages — matches the blog index style
 * ("‹ {page} / {totalPages} ›") but renders as `<Link>`s so the pages stay server components.
 * Tap targets are 44×44px.
 */
export function BlogPager({ page, totalPages, basePath }: BlogPagerProps) {
  if (totalPages <= 1) return null;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav className="mt-8 sm:mt-12 flex items-center justify-center gap-4" aria-label="Pagination">
      {hasPrev ? (
        <Link href={hrefFor(basePath, page - 1)} aria-label="Page précédente" className={`${arrowBase} ${arrowEnabled}`}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={`${arrowBase} ${arrowDisabled}`}>
          <ChevronLeft className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-[4rem] text-center font-display font-semibold tabular-nums text-gray-900 dark:text-white">
        {page} / {totalPages}
      </span>
      {hasNext ? (
        <Link href={hrefFor(basePath, page + 1)} aria-label="Page suivante" className={`${arrowBase} ${arrowEnabled}`}>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={`${arrowBase} ${arrowDisabled}`}>
          <ChevronRight className="h-5 w-5" />
        </span>
      )}
    </nav>
  );
}
