import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Small red uppercase eyebrow above the title (e.g. "Boutique"). */
  kicker?: string;
  /** The page H1. Rendered in condensed Oswald, uppercase. */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Optional slot below the header — breadcrumbs, filters, count, CTA, etc. */
  children?: ReactNode;
  /** Center the header (used on auth / marketing pages). Defaults to left-aligned. */
  align?: 'left' | 'center';
  /** Render the title as an <h1> (default) or <h2> for secondary page sections. */
  as?: 'h1' | 'h2';
}

/**
 * The interior-page counterpart to {@link SectionHeader} — the design-system anchor for the top of
 * every non-home page (shop, category, blog, content, account…). Red Oswald kicker + condensed
 * uppercase title, one accent, flat. Keeps page tops visually identical across the site.
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  children,
  align = 'left',
  as = 'h1',
}: PageHeaderProps) {
  const Title = as;
  const centered = align === 'center';

  return (
    <header className={centered ? 'text-center' : ''}>
      {kicker && (
        <span
          className={`inline-flex items-center gap-2 mb-2 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400 ${
            centered ? 'justify-center' : ''
          }`}
        >
          <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
          {kicker}
        </span>
      )}
      <Title className="font-display uppercase tracking-tight leading-[0.95] font-bold text-gray-900 dark:text-white text-3xl sm:text-4xl lg:text-5xl">
        {title}
      </Title>
      {subtitle && (
        <p
          className={`mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 ${
            centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'
          }`}
        >
          {subtitle}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </header>
  );
}
