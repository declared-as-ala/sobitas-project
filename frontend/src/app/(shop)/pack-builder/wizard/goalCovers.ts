/**
 * Which landing-page photograph stands for each goal.
 *
 * ── WHY THIS MAP EXISTS AT ALL ─────────────────────────────────────────────────────────────
 * Owner: *"maybe you can use the photos of the category that we used on the landing page."*
 *
 * The obvious reading — put a photo on each category step — does not survive contact with the
 * data. The builder's five steps are the SUBcategories `whey-proteine`, `creatine`,
 * `gainers-proteines`, `prise-de-masse` and `pre-workout`, and four of those five carry
 * `cover: null` on the live API. Only the six TOP-LEVEL categories have photography, and those are
 * exactly the six the landing page's CategoryRail renders.
 *
 * So the photographs go where they map cleanly and change the most: the GOAL step, which was four
 * plain text cards and is the first screen after "Commencer". Each goal has one honest
 * counterpart among the six:
 *
 *   Prise de masse      → prise-de-masse     the same category, same picture
 *   Perte de poids      → perte-de-poids     the same category, same picture
 *   Force & performance → performance        the category that sells force products
 *   Entretien           → sante-vitalite     vitamins and daily health, which is what entretien is
 *
 * Four goals, four DISTINCT photographs, no repetition. That last property is why this is a hand-
 * written map rather than a lookup by name: a naive parent-of-subcategory walk would hand
 * `performance` to both créatine and pre-workout and `prise-de-masse` to two more, and a grid with
 * the same picture twice reads as a rendering fault rather than as a design.
 *
 * ── WHAT HAPPENS WHEN A COVER IS MISSING ───────────────────────────────────────────────────
 * Nothing breaks. The map is resolved server-side into `Partial<Record<Goal, string>>` and a goal
 * with no entry falls back to the same branded initial tile CategoryRail uses. Verified necessary:
 * covers are set in the admin and a new category arrives without one.
 */

import type { Goal } from '@/util/nutritionTargets';

/** Goal → the slug of the top-level category whose cover photograph represents it. */
export const GOAL_COVER_SLUG: Record<Goal, string> = {
  prise_de_masse: 'prise-de-masse',
  perte_de_poids: 'perte-de-poids',
  force: 'performance',
  entretien: 'sante-vitalite',
};

/** Resolved absolute image URLs, keyed by goal. A goal may legitimately be absent. */
export type GoalCovers = Partial<Record<Goal, string>>;
