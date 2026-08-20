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
      /* `bg-brand`, not `bg-red-600`. #DC2626 is a signal red and this site's accent is #D03B04;
         the selected page was rendering in a colour that appears nowhere else on the page. The
         tokens also carry their own dark values, so the two hand-written `dark:` twins this line
         used to need are gone. (This directory is excluded from lint:design as vendored shadcn,
         which is exactly why the wrong colour survived here and nowhere else.) */
      className: cn(opts.className, opts.active && 'bg-brand text-on-brand border-brand hover:bg-brand-hover'),
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
    /*
      ── THE NUMBERED PAGER DOES NOT FIT ON A PHONE, AND NEVER DID ─────────────────────────────
      Owner, 20/08/2026: *"the paginator, make it responsive on mobile."*

      MEASURED against /shop, which is 470 pages. Deep in the series the pager renders
      `‹ 1 … 234 235 236 … 470 ›` — seven 44px controls, two ellipses and eight gaps, 404px of
      content in a 390px viewport. `flex-wrap` caught it, so it did not overflow; it broke into
      two ragged rows with the arrows stranded beside a half-row of numbers.

      Below `sm` the numbers become "Page 235 sur 470" between the two arrows: one line, always,
      at any page count, with both arrows at a full 44px where a thumb expects them.

      ── THE NUMBERS ARE HIDDEN, NOT REMOVED ─────────────────────────────────────────────────
      `hidden sm:flex`, deliberately, rather than a `useMediaQuery` that renders one or the other.
      Those links are the only crawl path to 99% of the catalogue (see `buildHref` above), and
      Googlebot renders at 412px wide — a JS branch keyed on viewport width would have served the
      crawler the phone layout and removed pages 2–470 from the site's link graph. `display:none`
      changes nothing about whether a link is followed.
    */
    <nav
      className={cn('flex items-center justify-center gap-1.5 sm:gap-2', className)}
      aria-label="Pagination"
    >
      {/* Previous Button */}
      {control(currentPage - 1, {
        disabled: currentPage === 1,
        label: 'Page précédente',
        className: 'h-11 w-11 p-0',
        children: <ChevronLeft className="h-4 w-4" />,
      })}

      {/* Page Numbers */}
      {/* 44px targets and gap-1.5. DESIGN_SYSTEM sets a hard 44x44 floor with no pointer
          carve-out, and this is the control that walks a 470-page series on a phone. */}
      <div className="hidden flex-wrap items-center justify-center gap-1.5 sm:flex">
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-1 py-1 text-ink-3 sm:px-2"
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
                className: 'h-11 min-w-11',
                children: pageNumber,
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* The phone's page indicator. `tabular-nums` so the width does not jitter as the number
          changes, and `aria-hidden` because the numbered list beside it already announces the
          same thing to a screen reader — reading both is a stutter. */}
      <span
        className="flex h-11 min-w-[7.5rem] items-center justify-center rounded-lg border border-hairline bg-sunken px-3 text-[13px] font-semibold tabular-nums text-ink-1 sm:hidden"
        aria-hidden="true"
      >
        Page {currentPage} sur {totalPages}
      </span>

      {/* Next Button */}
      {control(currentPage + 1, {
        disabled: currentPage === totalPages,
        label: 'Page suivante',
        className: 'h-11 w-11 p-0',
        children: <ChevronRight className="h-4 w-4" />,
      })}
    </nav>
  );
}
