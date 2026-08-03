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
const SPACING = {
  none: '',
  /**
   * Sub-bands fused into one continuous surface, where the separation is a 1px rule rather than
   * space. The hero stage and the trust strip below it are one black mass; this is how.
   */
  stage: 'py-0',
  /** Anything exactly one row tall: the trust/COD strip, the orange promo strip. */
  strip: 'py-3 sm:py-3.5 lg:py-4',
  /** Support bands carrying navigation or prose: the category rail, brand wall, SEO block. */
  tight: 'py-6 sm:py-8 lg:py-9',
  /** Every canvas/sunken product or content grid. Down from the old 48/64/80. */
  default: 'py-8 sm:py-10 lg:py-12',
  /**
   * The two SLAB merchandising bands — Ventes flash and Nos packs — and nothing else. Black
   * needs more internal air than white or it reads as cramped, and inside a coloured band that
   * padding reads as the band's own body rather than as a gap between things. If a third
   * section asks for `feature`, the answer is no.
   */
  feature: 'py-10 sm:py-12 lg:py-14',
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
  base: '',
  sunken: 'bg-sunken',
  elevated: 'bg-elevated',
  /** Near-black in light (#0E0E12); charcoal proud of black in dark (#2A2A30). */
  slab: 'pt-slab',
  /** The single orange band. #D53B04 light / #8A2E0C dark. */
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
