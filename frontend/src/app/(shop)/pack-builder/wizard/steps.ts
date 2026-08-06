/**
 * The pack builder's step machine.
 *
 * ── WHY A WIZARD REPLACED A PAGE ───────────────────────────────────────────────────────────
 * Owner: *"there is a lot of text and a lot of numbers and a lot of icons, and that's bad for the
 * user. I want the whole experience of creating a pack to be steps — guided steps, so the user
 * feels he's going in steps."*
 *
 * They are describing the real defect. The previous layout showed, simultaneously: a heading block,
 * a goal question, a discount ladder with three thresholds, a running total, a saving, a next-tier
 * nudge, a selection tray, a completion prompt, and five categories of twelve products. Every one
 * of those earns its place individually. Shown at once they compete, and the visitor's first job
 * becomes *deciding what to look at* rather than *choosing a whey*.
 *
 * A wizard is not decoration here — it is the only structure that lets each of those things be the
 * single most important thing on the screen at the moment it matters.
 *
 * ── THE SHAPE, AND WHY THIS SHAPE ──────────────────────────────────────────────────────────
 *   welcome   what this is and what it earns you — three numbers, one button
 *   goal      one question, four answers, no typing
 *   category  one category per step, ordered by the goal
 *   recap     what you built, whether it holds together, and an optional needs check
 *
 * Categories are STEPS rather than a scroll because "then, and then, and then" is exactly how the
 * owner described the flow they wanted, and because it makes the ordering meaningful: the goal
 * decides which category you are asked about FIRST, which is a recommendation you experience
 * rather than read.
 *
 * ── THE RULE THIS FILE ENFORCES ────────────────────────────────────────────────────────────
 * Steps are DERIVED, never stored. Storing a list would let the index and the content drift apart
 * the moment the goal reorders the categories — you would be on "step 4 of 7" showing a category
 * that had moved to position 2. `buildSteps()` is a pure function of (groups, order), and the
 * current position is a plain integer index into its result.
 */

import type { Product } from '@/types';

export interface PackGroup {
  slug: string;
  label: string;
  /** Absolute URL of the category's own cover photograph, or null when the admin has none. */
  cover: string | null;
  products: Product[];
}

export type Step =
  | { kind: 'welcome'; key: 'welcome' }
  | { kind: 'goal'; key: 'goal' }
  | { kind: 'category'; key: string; group: PackGroup; position: number; count: number }
  | { kind: 'recap'; key: 'recap' };

/**
 * Build the step list for a given category order.
 *
 * `order` is the advisor's emphasis list; groups not named in it keep their original relative
 * order and follow. A null order means "no goal chosen yet" and the catalogue order stands.
 */
export function buildSteps(groups: PackGroup[], order: string[] | null): Step[] {
  const ordered = order
    ? [...groups].sort((a, b) => {
        const rank = (s: string) => {
          const i = order.indexOf(s);
          return i === -1 ? 99 : i;
        };
        return rank(a.slug) - rank(b.slug);
      })
    : groups;

  const categorySteps: Step[] = ordered.map((group, i) => ({
    kind: 'category',
    key: `cat-${group.slug}`,
    group,
    position: i + 1,
    count: ordered.length,
  }));

  return [{ kind: 'welcome', key: 'welcome' }, { kind: 'goal', key: 'goal' }, ...categorySteps, { kind: 'recap', key: 'recap' }];
}

/**
 * The label shown in the progress rail.
 *
 * Deliberately short. The rail is a position indicator, not a summary — a rail whose labels wrap
 * stops being scannable, which is the only thing it is for.
 */
export function stepLabel(step: Step): string {
  switch (step.kind) {
    case 'welcome':
      return 'Départ';
    case 'goal':
      return 'Objectif';
    case 'recap':
      return 'Votre pack';
    default:
      return step.group.label;
  }
}

/**
 * How far through the flow a step sits, 0–1.
 *
 * The welcome step reports 0 rather than 1/n. Showing progress before the visitor has done
 * anything is a small lie, and it is the kind that makes every later reading of the bar feel
 * approximate.
 */
export function stepProgress(index: number, total: number): number {
  if (total <= 1) return 0;
  return Math.min(1, Math.max(0, index / (total - 1)));
}
