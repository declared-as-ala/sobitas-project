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
  tight: 'py-6 lg:py-8',
  /** Every canvas/sunken product or content grid. */
  default: 'py-8 lg:py-10',
  /**
   * Reserved for the band that must out-weigh its neighbours — Ventes flash, and nothing else.
   * Emphasis now comes from padding + a live countdown rather than from a black fill, so this
   * step is what replaces the slab it used to be. If a second section asks for `feature`, the
   * answer is no: two dominant bands is zero dominant bands.
   */
  feature: 'py-10 lg:py-12',
} as const;

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
  children,
  ...rest
}: SectionProps) {
  return (
    <Tag
      // `data-band` is what globals.css keys the automatic 1px seam off. Every band carries it,
      // so a boundary can never be forgotten, and the adjacent-sibling selector means the first
      // band on a page correctly has no rule above it.
      data-band=""
      {...(first ? { 'data-band-first': '' } : {})}
      className={cn(SPACING[spacing], SURFACES[surface], defer && 'pt-defer', className)}
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
