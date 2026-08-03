import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * The ONLY place a section heading size is decided (DESIGN_SYSTEM.md v5 §2).
 *
 * ── WHY THIS COMPONENT OWNS THE SCALE ─────────────────────────────────────────────────────
 * The homepage shipped SEVEN section-heading sizes on desktop (13, 24, 26, 30, 40, 52, 60px)
 * and SIX on mobile, measured. Nobody chose seven sizes; seven sizes HAPPENED, because five
 * components each hardcoded their own clamp — this one, CategoryRail, VentesFlashSection,
 * PromoBanner and the homepage SEO block. Intermediate sizes with no rule behind them are
 * exactly what makes a page look like a purchased theme.
 *
 * They collapse to THREE, and which one you get is decided by COMMERCIAL ROLE, not by taste and
 * not by what surface the band happens to sit on:
 *
 *   scale="1"  56 / 40px   THE RAILS THAT SELL — Les plus vendus, Ventes flash,
 *                          Nouveaux produits, Nos packs. Reserved to those four.
 *   scale="2"  40 / 30px   Support bands — Acheter par objectif, Nos derniers articles.
 *   scale="3"  28 / 22px   Bands that sell nothing directly — Nos marques partenaires — and
 *                          the DEFAULT, which is what keeps ProductDetailClient's "Produits
 *                          similaires" from out-ranking the product's own H1 across 391 PDPs.
 *
 * A logo wall getting a bigger heading than the best-seller rail is a real failure mode of any
 * "consistent" scale that keys off background colour. Here the brand wall is deliberately the
 * SMALLEST heading on the page and the highest-intent rail is the largest.
 *
 * ── THE TYPE ITSELF ───────────────────────────────────────────────────────────────────────
 * Hierarchy is carried by Archivo's VARIABLE WIDTH AXIS, not by more sizes. A 12px kicker at
 * wdth 112 with 0.22em tracking, over a 56px headline at wdth 82 with -0.02em tracking, is a
 * 4.7x size ratio AND a 30-point width delta AND a 0.24em tracking delta — three axes of
 * contrast out of two type sizes. That width contrast is the brand's signature and it is only
 * possible because the display face has a real width axis.
 *
 * ── BAND-AGNOSTIC ─────────────────────────────────────────────────────────────────────────
 * Every `gray-*` and `red-*` literal is gone. Because this renders purely in tokens, the SAME
 * component is correct on canvas, on sand, on the black slab and on the orange strip, in both
 * themes, with no variant prop and no `dark:` class.
 */

/** 1 = the rails that sell · 2 = support bands · 3 = everything else (default). */
export type SectionHeaderScale = '1' | '2' | '3';

const TITLE_SCALE: Record<SectionHeaderScale, string> = {
  '1': 'text-[2.5rem] lg:text-[3.5rem]',
  '2': 'text-[1.875rem] lg:text-[2.5rem]',
  '3': 'text-[1.375rem] lg:text-[1.75rem]',
};

interface SectionHeaderProps {
  /** Small uppercase brand-coloured label above the title (e.g. "Nouveautés"). */
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Optional right-aligned "Voir tout" link. */
  viewAllHref?: string;
  viewAllLabel?: string;
  /** See the table above. Defaults to the SMALLEST — opting up is a deliberate act. */
  scale?: SectionHeaderScale;
  /** Rendered before the kicker text (a lucide glyph, e.g. Flame on Ventes flash). */
  icon?: React.ReactNode;
  /** Set when the heading is referenced by an `aria-labelledby` on the band. */
  id?: string;
}

export function SectionHeader({
  kicker,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'Voir tout',
  scale = '3',
  icon,
  id,
}: SectionHeaderProps) {
  return (
    /* 24 / 32 / 40 — one 8px unit per breakpoint, matching the band scale's own growth in
       Section.tsx. The heading block is part of the band's body, not a third thing floating
       between the band's padding and its content, so its bottom margin must always be strictly
       smaller than the band's own `pt` (32/40/64 at `default`). It is, at every breakpoint. */
    <div className="mb-6 flex flex-row items-end justify-between gap-4 sm:mb-8 lg:mb-10">
      <div className="min-w-0">
        {kicker && (
          <span className="pt-kicker mb-2.5 inline-flex items-center gap-2.5 text-brand">
            {icon ?? <span className="h-px w-7 bg-brand" aria-hidden="true" />}
            {kicker}
          </span>
        )}
        <h2
          id={id}
          className={`font-display font-compressed font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 ${TITLE_SCALE[scale]}`}
        >
          {title}
        </h2>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-ink-2 sm:text-base">{subtitle}</p>}
      </div>

      {viewAllHref && (
        // min-h-[44px]: this was a ~34px pill, below the 44px tap floor. It is also the only
        // control in the band, so it is worth being reachable.
        <div className="hidden shrink-0 pb-1 sm:block">
          <Link
            href={viewAllHref}
            aria-label={viewAllLabel}
            className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-hairline px-5 font-display font-extended text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            {viewAllLabel}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      )}
    </div>
  );
}
