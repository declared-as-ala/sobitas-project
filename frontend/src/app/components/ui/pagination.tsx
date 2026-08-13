'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /**
   * Turn the pager into real links.
   *
   * ── WHY THIS IS NOT COSMETIC ────────────────────────────────────────────────────────────────
   * Every control here was a <button onClick>. That is correct when pagination is client state, and
   * it is a dead end the moment the page number lives in the URL:
   *
   *   • A crawler cannot follow an onClick. With 10,669 products at 12 a page, pages 2–890 — the
   *     only route to 99% of the catalogue — were invisible to Google, whatever the sitemap said.
   *   • A shopper cannot middle-click, cmd-click, or copy the link to page 4.
   *   • The browser cannot show where the control goes on hover.
   *
   * Given a builder, each control renders as <Link href> instead. onPageChange still fires (Next's
   * client navigation handles the click), so callers keep their scroll and optimistic-state
   * behaviour — this adds the href, it does not replace the handler.
   *
   * Omitted, the component behaves exactly as it did. Existing callers are untouched.
   */
  buildHref?: (page: number) => string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  buildHref,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) {
    return null;
  }

  /**
   * One control, rendered as a link when we know its URL and as a button when we do not.
   *
   * `asChild` is what makes this safe: the Button's classes land on the anchor, so a linked pager is
   * pixel-identical to the button one. Rendering a <Link> inside a <Button> instead would nest an
   * <a> in a <button> — invalid HTML that browsers resolve inconsistently and screen readers
   * announce twice.
   *
   * A disabled control is never a link. `<a disabled>` does nothing: the arrow at page 1 would look
   * greyed out and still navigate, and it would hand crawlers a self-link on every first page.
   */
  const control = (
    page: number,
    opts: {
      active?: boolean;
      disabled?: boolean;
      /** Render as a button even when hrefs are available, without the disabled styling. */
      noLink?: boolean;
      label: string;
      className?: string;
      children: React.ReactNode;
    }
  ) => {
    const shared = {
      variant: (opts.active ? 'default' : 'outline') as 'default' | 'outline',
      size: 'sm' as const,
      className: cn(opts.className, opts.active && 'bg-red-600 hover:bg-red-700 text-white border-red-600'),
      'aria-label': opts.label,
      'aria-current': opts.active ? ('page' as const) : undefined,
    };

    if (buildHref && !opts.disabled && !opts.noLink) {
      return (
        <Button {...shared} asChild>
          <Link href={buildHref(page)} onClick={() => onPageChange(page)} scroll={false}>
            {opts.children}
          </Link>
        </Button>
      );
    }

    return (
      <Button {...shared} onClick={() => onPageChange(page)} disabled={opts.disabled}>
        {opts.children}
      </Button>
    );
  };

  return (
    <nav
      className={cn('flex items-center justify-center gap-2', className)}
      aria-label="Pagination"
    >
      {/* Previous Button */}
      {control(currentPage - 1, {
        disabled: currentPage === 1,
        label: 'Page précédente',
        className: 'h-10 w-10 p-0',
        children: <ChevronLeft className="h-4 w-4" />,
      })}

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 py-1 text-gray-500 dark:text-gray-400"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;

          return (
            <React.Fragment key={pageNumber}>
              {control(pageNumber, {
                active: isActive,
                // The current page is not a link to itself — a self-referencing anchor on every
                // paginated URL is crawl budget spent on nothing. `noLink` rather than `disabled`:
                // disabling it would grey out the one control that must look SELECTED.
                noLink: isActive,
                label: `Page ${pageNumber}`,
                className: 'h-10 min-w-10',
                children: pageNumber,
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* Next Button */}
      {control(currentPage + 1, {
        disabled: currentPage === totalPages,
        label: 'Page suivante',
        className: 'h-10 w-10 p-0',
        children: <ChevronRight className="h-4 w-4" />,
      })}
    </nav>
  );
}
