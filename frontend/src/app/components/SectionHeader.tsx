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
 *   scale="1"  56 / 40px   THE RAILS THAT SELL — Les plus vendus, Nouveaux produits, Nos packs.
 *                          Reserved to those three.
 *   scale="2"  40 / 30px   Support bands — Acheter par objectif, Nos derniers articles, and
 *                          VENTES FLASH, which used to be a scale-1 rail and is now a banner.
 *                          The owner asked three times for that band to stop reading as a full
 *                          section; a 56px headline was the loudest single thing making it one.
 *                          Demoting it is the point, not an oversight — it keeps its urgency from
 *                          the brand edge and the live clock, not from type size.
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

/**
 * Scale 1's MOBILE step is 2rem, not 2.5rem — the owner set it by hand in DevTools on "Les plus
 * vendus" and it is the right call for a reason worth writing down. 40px in the compressed display
 * face put "LES PLUS VENDUS" within ~20px of the full 390px content width, so the four rail
 * headings were each one long word away from wrapping to two lines, and a heading that wraps is
 * a heading whose size is deciding the page's rhythm for it. At 32px the longest of them
 * ("NOUVEAUX PRODUITS") clears the rail with room to spare, and the 1.75x ratio to scale 3 (22px)
 * is preserved — the hierarchy is intact, it is just no longer fighting the viewport.
 *
 * Desktop is untouched: 56 / 40 / 28 was never the complaint.
 */
const TITLE_SCALE: Record<SectionHeaderScale, string> = {
  '1': 'text-[2rem] lg:text-[3.5rem]',
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
  /**
   * An extra control on the heading row, left of "Tout voir" (e.g. Ventes flash's countdown pill).
   *
   * ── WHY THIS IS A PROP RATHER THAN THE CALLER RENDERING ITS OWN ROW ───────────────────────
   * Ventes flash used to hand-roll its whole header so it could sit a countdown next to the title.
   * That is how it drifted four copies of this component's internals — and how it shipped a bug:
   * its clock and its CTA formed a 321px unbreakable run that overflowed a 254px box at 320px and
   * was silently clipped, because a hand-rolled row does not inherit the `hidden … sm:block` guard
   * below.
   *
   * Rendering here means `trailing` is inside that guard by construction: it CANNOT be the thing
   * that overflows a phone, because on a phone it does not exist. Anything a caller puts here must
   * therefore be genuinely optional at small widths — which is the right constraint for a heading
   * row anyway.
   */
  trailing?: React.ReactNode;
  /** Set when the heading is referenced by an `aria-labelledby` on the band. */
  id?: string;
  /**
   * Centre the heading block below `sm` (owner set this by hand on "Acheter par objectif").
   *
   * Only correct for a band whose CONTENT is also symmetric — the category rail is a full-bleed
   * 2-up grid on phones, so a left-aligned label sat on a rail that nothing else in the band
   * shares. Every other band is a left-aligned grid or list, and a centred heading over
   * left-aligned content is the thing that makes a page look like a template. Hence a prop with
   * one call site rather than a change to the component.
   */
  centerOnMobile?: boolean;
  /**
   * Render `trailing` at EVERY width instead of hiding it below `sm`.
   *
   * The guard above exists because a hand-rolled heading row once shipped a 321px unbreakable run
   * into a 254px box at 320px. That is a real hazard and it stays the default. This opt-in is for
   * a trailing node that has been MEASURED at the narrow widths — Ventes flash's countdown, whose
   * own layout stacks its label onto a second line below `sm` and is asserted at 280px by
   * `measure-flash.mjs`.
   *
   * It is one prop rather than a second render position on purpose: rendering the node twice
   * (once mobile, once desktop) would mount it twice, and this particular node owns an
   * IntersectionObserver and a 1s interval. `display: none` does not stop either of them.
   */
  trailingAllWidths?: boolean;
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
  trailing,
  centerOnMobile = false,
  trailingAllWidths = false,
}: SectionHeaderProps) {
  return (
    /* 20 / 24 — down from 24/32/40 along with the band scale.
       The heading block is part of the band's body, not a third thing floating between the band's
       padding and its content, so its bottom margin must stay strictly SMALLER than the band's
       own `pt` (32/40 at `default`). At the old 40px it was larger than `tight`'s 24px top
       padding, which is precisely why the category band read as a heading adrift in a field. */
    /* COLUMN below `sm`, ROW from there. With no trailing node — every band but one — the
       container has a single child and the direction changes nothing, so this is not a change to
       the other nine headings on the homepage. With one, the node sits UNDER the title on a phone
       and BESIDE it on a desktop, from a single element in the tree. */
    <div
      className={`mb-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 lg:mb-6 ${
        centerOnMobile ? 'max-sm:justify-center' : ''
      }`}
    >
      <div className={`min-w-0 ${centerOnMobile ? 'max-sm:text-center' : ''}`}>
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

      {(viewAllHref || trailing) && (
        // min-h-[44px]: this was a ~34px pill, below the 44px tap floor. It is also the only
        // control in the band, so it is worth being reachable.
        <div
          className={`shrink-0 items-center gap-3 sm:flex sm:pb-1 ${
            trailingAllWidths ? 'flex' : 'hidden'
          }`}
        >
          {trailing}
          {viewAllHref && (
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
          )}
        </div>
      )}
    </div>
  );
}
