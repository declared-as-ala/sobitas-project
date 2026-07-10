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
 * A tight red uppercase kicker + a condensed Oswald (font-display) title, so every section
 * reads as one art-directed sequence rather than assembled parts. Red is the single accent.
 */
export function SectionHeader({
  kicker,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'Voir tout',
}: SectionHeaderProps) {
  return (
    <div className="flex flex-row items-end justify-between gap-4 mb-8 sm:mb-10">
      <div className="min-w-0">
        {kicker && (
          <span className="inline-flex items-center gap-2 mb-2 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400">
            <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
            {kicker}
          </span>
        )}
        <h2 className="font-display uppercase tracking-tight leading-[0.95] font-bold text-gray-900 dark:text-white text-3xl sm:text-4xl lg:text-[2.75rem]">
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
            className="group inline-flex items-center gap-1.5 font-display uppercase tracking-wide text-sm font-semibold text-gray-900 dark:text-white transition-colors hover:text-red-600 dark:hover:text-red-400"
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
