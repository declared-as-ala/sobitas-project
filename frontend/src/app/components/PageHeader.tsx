import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Small red uppercase eyebrow above the title (e.g. "Boutique"). */
  kicker?: string;
  /** The page H1. Rendered in the condensed display face (Archivo at wdth 82%), uppercase. */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Optional slot below the header — breadcrumbs, filters, count, CTA, etc. */
  children?: ReactNode;
  /**
   * A single control that belongs BESIDE the title rather than under it — the page's secondary
   * door (e.g. "Accès Pro" on the pack builder), never its primary action.
   *
   * It sits on the title's baseline row from `sm` up and drops to its own row on a phone, because
   * below 640px a title and a button on one line leaves ~140px for a compressed 30px headline and
   * the headline is what the page is. Use `children` for anything that is a group of things;
   * this slot is deliberately singular so a page cannot grow a toolbar here by accident.
   */
  action?: ReactNode;
  /** Center the header (used on auth / marketing pages). Defaults to left-aligned. */
  align?: 'left' | 'center';
  /** Render the title as an <h1> (default) or <h2> for secondary page sections. */
  as?: 'h1' | 'h2';
}

/**
 * The interior-page counterpart to {@link SectionHeader} — the design-system anchor for the top of
 * every non-home page (shop, category, blog, content, account…). Red display kicker + condensed
 * uppercase title, one accent, flat. Keeps page tops visually identical across the site.
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  children,
  action,
  align = 'left',
  as = 'h1',
}: PageHeaderProps) {
  const Title = as;
  const centered = align === 'center';

  return (
    <header className={centered ? 'text-center' : ''}>
      {kicker && (
        <span
          className={`pt-kicker inline-flex items-center gap-2 mb-2 text-brand ${
            centered ? 'justify-center' : ''
          }`}
        >
          <span className="h-px w-5 bg-brand" aria-hidden="true" />
          {kicker}
        </span>
      )}
      <div
        className={
          action
            ? 'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6'
            : undefined
        }
      >
        <Title className="font-display font-compressed uppercase tracking-tight leading-[0.95] font-extrabold text-ink-1 text-3xl sm:text-4xl lg:text-5xl">
          {title}
        </Title>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {subtitle && (
        <p
          className={`mt-3 text-sm sm:text-base text-ink-2 ${
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
