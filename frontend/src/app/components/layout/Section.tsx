import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';
import { Container, type ContainerWidth } from './Container';

/**
 * A BAND (DESIGN_SYSTEM.md v5 §3–4). Server component.
 *
 * ── WHY THE OLD SCALE PRODUCED 1,004px OF NOTHING ─────────────────────────────────────────
 * Measured on the live homepage at 1440px: 1,004px of dead vertical space between bands — 11%
 * of the whole document — including three separate 160px voids. Every one of those was two
 * adjacent `py-20` paddings on two identical WHITE backgrounds: 80 + 80, with no colour change
 * to justify it. The old `flagship` token (py-16/20/24) was the top of that ladder.
 *
 * The fix is not "use smaller padding". It is that SEPARATION IS A COLOUR CHANGE PLUS A 1px
 * RULE, NEVER EMPTINESS. Once no two adjacent bands share a surface, a band needs only enough
 * padding to breathe inside its own colour and the seam does the separating.
 *
 * ── THREE RULES ───────────────────────────────────────────────────────────────────────────
 * 1. Spacing is ALWAYS this component's padding, never a margin. A margin between two bands
 *    paints the PARENT's colour, which reintroduces exactly the gap this removes.
 * 2. No two adjacent bands may share a surface. The `data-band` seam (globals.css) then draws a
 *    rule on every boundary automatically, in both themes, resolved in the lower band's scope.
 * 3. No local `py-*` on a section. If a band needs a value that isn't here, the scale is wrong —
 *    fix the scale, don't add a fifth number in a call site.
 *
 * `flagship` is DELETED rather than kept for compatibility. Verified before removing:
 * `grep -rn flagship src/` returned this file's definition and nothing else — zero call sites —
 * so no surface can silently keep the 96px that produced the 160px gaps.
 */
/**
 * ── THE SCALE IS FOUR STEPS AND EVERY NUMBER IS A MULTIPLE OF 8 ────────────────────────────
 *
 * v5's scale was 12/14/16 · 24/32/36 · 32/40/48 · 40/48/56. Three of those twelve numbers (14,
 * 36, 56) are not multiples of 8, so no two bands on the page were ever an exact multiple of
 * each other's rhythm and the eye read the whole column as slightly arbitrary — the owner's
 * "bad spacings / bad calculation". Snapping to an 8px grid is not pedantry: it is what makes
 * band padding, the 8px grid gaps, the 8px card padding steps and the 4px icon insets all land
 * on the same lattice, so vertical relationships resolve as ratios instead of as near-misses.
 *
 *   strip     12 / 16            one row tall
 *   tight     24 / 32            navigation & prose
 *   default   32 / 40            every product or content grid
 *   feature   40 / 48            the band that must dominate its neighbours
 *
 * ── THE SCALE CAME DOWN BY A THIRD (owner, 2026-08-03, with the gaps circled) ─────────────
 * "Those white spaces make the page look messy — the sections are not uniform, not connected."
 *
 * They circled three boundaries and they were the three biggest sums in the page. THE GAP
 * BETWEEN TWO BANDS IS THE UPPER BAND'S `pb` PLUS THE LOWER BAND'S `pt` — this file's own rule,
 * three paragraphs down — and the previous values made that arithmetic ugly at desktop:
 *
 *     hero(48)      + catégories(48)   =  96px
 *     catégories(48)+ plus vendus(64)  = 112px
 *     ventes flash(80) + nouveautés(64)= 144px   ← the one they circled hardest
 *
 * 144px of nothing between two sections reads as a mistake no matter how carefully each number
 * was chosen, and that is the trap in "make the spacing bigger and consistent": consistency in
 * the SCALE does not give you consistency in the GAPS, because gaps are sums.
 *
 * The correct amount of padding is however much the band needs to breathe INSIDE its own colour,
 * and no more — the fill change plus the 1px seam is what separates it from its neighbour, not
 * the emptiness. At these values the same three boundaries are 64 / 72 / 88px.
 *
 * Every value is still a multiple of 8, and each step is still exactly one 8px unit above the
 * previous at mobile and two at desktop.
 *
 * ── ON PHONES A BAND HAS NO BOTTOM PADDING AT ALL ─────────────────────────────────────────
 * The owner opened DevTools on the live page and removed the bottom padding from the hero and
 * from the category rail by hand — "so it looks like it's connected" — and set the best-seller
 * rail's top padding to 1em. Three separate edits, but they are one rule, so this is where it
 * lives rather than as three overrides in three call sites:
 *
 *     BELOW `sm`, THE GAP BETWEEN TWO BANDS IS THE LOWER BAND'S `pt`, AND NOTHING ELSE.
 *
 * That was the logical end of this file's own doctrine. Separation is a fill change plus a 1px
 * seam; emptiness was never doing the work. On a 390px screen the sum of two paddings is a much
 * larger fraction of the viewport than the same sum at 1440 — 64px is 7.6% of a phone screen and
 * 4.4% of a laptop — so the boundary that reads as "considered" on desktop reads as "disconnected"
 * on a phone. Halving both numbers would have kept the sum arithmetic; removing one side removed
 * the arithmetic entirely.
 *
 * ── REVISED 10/08/2026: ZERO WENT ONE UNIT TOO FAR ────────────────────────────────────────
 * Owner, on the live phone layout: *"in mobile between the section make a padding bottom of .5em
 * or more little"*.
 *
 * Zero was the logical end of the doctrine and one unit past the useful end of it. The bands did
 * read as connected — but a band's last row of content sat flush against the seam, so the 1px rule
 * looked like it was underlining that content rather than closing the band.
 *
 * Mobile `pb` is now **8px** (`pb-2` = 0.5rem, the requested 0.5em) on the three content steps.
 * Deliberately the smallest value on the lattice this file insists on: one 8px unit keeps the grid
 * intact, and every mobile boundary grows by exactly 8 rather than by a new arbitrary number. The
 * mobile gap is still one value per step, now plus that 8:
 *
 *     strip  12   ·   tight  24+8   ·   default  16+8   ·   feature  24+8
 *
 * `strip` is unchanged: it is one row tall, symmetric already, and was never part of the
 * complaint. `stage` stays `py-0` because the hero owns its own internal frame.
 *
 * From `sm` up the symmetric scale returns unchanged — desktop was not the complaint, and the
 * circled gaps were fixed there in the previous pass.
 *
 * The page's LAST band is the exception and takes `last` (below), or its final line of copy would
 * butt straight into the footer with nothing between them.
 */
const SPACING = {
  none: '',
  /**
   * Sub-bands fused into one continuous surface, where the separation is a 1px rule rather than
   * space. The hero owns its own internal frame; this is how it gets no band padding at all.
   */
  stage: 'py-0',
  /** Anything exactly one row tall: the trust/COD strip, the orange promo strip. */
  strip: 'py-3 sm:py-4',
  /** Support bands carrying navigation or prose: the category rail, brand wall, SEO block. */
  tight: 'pb-2 pt-5 sm:py-5 lg:py-6',
  /** Every canvas/sunken product or content grid. */
  default: 'pb-2 pt-4 sm:py-6 lg:py-8',
  /**
   * The step for a band that must out-weigh its neighbours. At most ONE per page: two dominant
   * bands is zero dominant bands.
   *
   * VENTES FLASH GAVE THIS UP. It held this step, and this docblock used to name it as the sole
   * owner. The owner asked three times for that band to stop reading as a section — "make it like
   * a banner, not a wall", then "make the card smaller", then "make it a banner not a full section,
   * just a small part of the landing page" — and it now runs at `tight` with a row card, 245px
   * instead of 736px. A reservation nobody holds is worse than none, because the next band that
   * wants emphasis reads this and assumes the slot is taken.
   *
   * Currently held by: nothing on the homepage. `/partenaires` uses it for its application band,
   * which is a different page and therefore not a conflict.
   */
  feature: 'pb-2 pt-6 sm:py-8 lg:py-10',
} as const;

/*
 * ── THE DESKTOP STEP CAME DOWN ON 18/08/2026 ────────────────────────────────────────────────
 * Owner, having tightened the homepage's section spacing in DevTools and screenshotted the
 * result: *"this is how i want the website to look on desktop — measured sections spacings, and
 * looks super good"*.
 *
 * A screenshot is a target, not a specification, so this was measured on both sides rather than
 * eyeballed. Their screen is 1920 at 125% Windows scaling — a 1536 CSS viewport — where the page
 * ran 6,828px and their edit brought it to roughly 6,490. Eight bands, ~340px: 16px off each
 * band's desktop padding is 128 of it, and the rest comes from the category rail's tile aspect
 * and the flash band, both changed in the same commit.
 *
 * Every step moved by ONE notch of the 8px lattice and the ladder's shape is unchanged —
 * tight < default < feature, still 8px apart at `lg`. That matters more than the absolute values:
 * the whole reason this scale exists is that three bands agreeing is what makes a page read as one
 * document, and a "just make this one tighter" edit at a call site is what it was written to
 * prevent. If the page needs to come down again, it comes down HERE, again, for all of it.
 *
 * The PHONE is deliberately almost untouched (`tight` loses 4px, `default` nothing). It was
 * retuned two days ago against its own measurements and was not part of this note — the owner's
 * screenshot and their words both say desktop.
 */

/**
 * A surface is a TOKEN SCOPE, not a background utility.
 *
 * `slab` and `promo` map to a scope class ONLY — never to a `bg-*` utility alongside it. That is
 * load-bearing: styles/tokens.css is imported at globals.css line 5, BEFORE `@tailwind
 * utilities`, so a `bg-*` utility at equal specificity would win on source order and you would
 * get a band whose tokens flipped but whose background did not. `.pt-slab` paints its own
 * `background-color`, so nothing at the utility layer ever competes with it.
 *
 * The scopes re-point `--c-*` for the whole subtree, which is why a component written in
 * `bg-elevated text-ink-1 border-hairline` renders correctly on all four surfaces in both themes
 * with no `dark:` variant and no `onSlab` prop.
 */
const SURFACES = {
  /** White in light, near-black in dark. The page's default. */
  base: '',
  /** Warm sand (#F7F6F4). The ONLY alternate a content band may use. */
  sunken: 'bg-sunken',
  elevated: 'bg-elevated',
  /**
   * Near-black. RETAINED but BANNED for content bands as of v6 — see the head of tokens.css.
   * It survives because the footer and the utility bar legitimately need a dark scope and they
   * reach for it directly; routing a `<Section surface="slab">` through here is what produced a
   * page the owner described as hurting to look at. Alternation is canvas ⇄ sunken.
   */
  slab: 'pt-slab',
  /** The single orange band. #D53B04 light / #8A2E0C dark. One per page, no exceptions. */
  promo: 'pt-promo',
} as const;

export interface SectionProps {
  as?: 'section' | 'div' | 'article' | 'aside';
  spacing?: keyof typeof SPACING;
  surface?: keyof typeof SURFACES;
  /** Set false for full-bleed sections (e.g. the hero) that own their rail. */
  container?: boolean;
  width?: ContainerWidth;
  className?: string;
  containerClassName?: string;
  id?: string;
  /**
   * Skip rendering this band while it is off-screen (`content-visibility: auto`).
   *
   * It belongs HERE rather than on a wrapper div, and that is not a style preference:
   * `content-visibility: auto` skips the DESCENDANTS' paint but not the element's own box
   * decoration. Put the surface on a Section and `.pt-defer` on its parent and the band paints
   * as a white rectangle until it scrolls in — every black band would flash white on scroll.
   * Same element, always.
   */
  defer?: boolean;
  /**
   * Opt OUT of the automatic 1px top seam. Set on the first band of a page, which sits against
   * the header and needs no rule of its own. Everything else keeps it — see globals.css for why
   * the seam is not an adjacent-sibling rule.
   */
  first?: boolean;
  /**
   * Set on the LAST band of a page. Below `sm` every band has `pb-0` so it reads as connected to
   * the one beneath it (see the scale above) — but the last band's neighbour is the footer, and
   * copy that touches a dark slab with zero space reads as a rendering fault rather than as
   * connection. This restores the band's own mobile top value on its bottom edge. It is the one
   * exception, and it is a prop rather than a `:last-child` rule because bands are rendered by
   * seven different components and the page, not the component, knows which one is last.
   */
  last?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  children: ReactNode;
}

export function Section({
  as: Tag = 'section',
  spacing = 'default',
  surface = 'base',
  container = true,
  width = 'default',
  className,
  containerClassName,
  defer = false,
  first = false,
  last = false,
  children,
  ...rest
}: SectionProps) {
  // Mirrors the mobile `pt` of each step, so the last band is symmetric on a phone instead of
  // being open at the bottom. Deliberately UNPREFIXED and appended after the scale: `cn` is
  // tailwind-merge, so it replaces the scale's `pb-0` at mobile, while the scale's own `sm:py-*`
  // still wins from `sm` up (a responsive variant beats a base utility). No fifth padding value
  // ever reaches desktop.
  const LAST_PB: Record<keyof typeof SPACING, string> = {
    none: '',
    stage: '',
    strip: '',
    tight: 'pb-6',
    default: 'pb-4',
    feature: 'pb-6',
  };

  return (
    <Tag
      // `data-band` is what globals.css keys the automatic 1px seam off. Every band carries it,
      // so a boundary can never be forgotten, and the adjacent-sibling selector means the first
      // band on a page correctly has no rule above it.
      data-band=""
      {...(first ? { 'data-band-first': '' } : {})}
      className={cn(
        SPACING[spacing],
        last && LAST_PB[spacing],
        SURFACES[surface],
        defer && 'pt-defer',
        className
      )}
      {...rest}
    >
      {container ? (
        <Container width={width} className={containerClassName}>
          {children}
        </Container>
      ) : (
        children
      )}
    </Tag>
  );
}
