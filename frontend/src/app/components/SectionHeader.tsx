import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
  /** Small red uppercase label above the title (e.g. "Nouveautés"). */
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Optional right-aligned "Voir tout" link. */
  viewAllHref?: string;
  viewAllLabel?: string;
}

/**
 * Shared section header for the landing page — the anchor of the design system.
 *
 * The type here carries the whole brand: a WIDE letterspaced kicker (Archivo at wdth 112%) set
 * against a COMPRESSED headline (wdth 82%). That width contrast is the signature — it is what
 * makes a section read as art-directed rather than as a heading with a label stuck on top, and
 * it is only possible because the display face has a real width axis. Red stays the one accent,
 * spent on the kicker rule alone.
 */
export function SectionHeader({
  kicker,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'Voir tout',
}: SectionHeaderProps) {
  return (
    <div className="flex flex-row items-end justify-between gap-4 mb-9 sm:mb-12">
      <div className="min-w-0">
        {kicker && (
          <span className="pt-kicker mb-3 inline-flex items-center gap-2.5 text-red-600 dark:text-red-400">
            <span className="h-px w-7 bg-red-600 dark:bg-red-400" aria-hidden="true" />
            {kicker}
          </span>
        )}
        {/* Capped at 2.5rem (40px) on desktop, not 3.25rem. SectionHeader is NOT a landing-page
            component — ProductDetailClient renders it for "Produits similaires", where a 52px
            section heading was visually larger than the product's own H1 and inverted the page's
            hierarchy. 40px still reads as a display headline against 16px body. */}
        <h2 className="font-display font-compressed uppercase tracking-[-0.015em] leading-[0.94] font-extrabold text-gray-950 dark:text-white text-[1.75rem] sm:text-[2.125rem] lg:text-[2.5rem]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 max-w-xl text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>

      {viewAllHref && (
        <div className="hidden sm:block flex-shrink-0 pb-1">
          <Link
            href={viewAllHref}
            aria-label={viewAllLabel}
            className="group inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 font-display font-extended uppercase tracking-[0.12em] text-[11px] font-semibold text-gray-900 transition-colors hover:border-red-600 hover:text-red-600 dark:border-gray-800 dark:text-white dark:hover:border-red-400 dark:hover:text-red-400"
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
