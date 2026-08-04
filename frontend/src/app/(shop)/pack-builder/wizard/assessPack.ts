/**
 * "Is this pack any good?" — answered honestly, which means answering a narrower question than
 * the one that was asked.
 *
 * ── WHAT THIS CAN AND CANNOT JUDGE ─────────────────────────────────────────────────────────
 * It judges the pack as a PURCHASE: does it contain the categories the stated goal is usually
 * built from, does it contain more than one kind of thing, and where does it sit on the discount
 * ladder. Those are facts about a basket, checkable by anyone, and wrong answers are visibly wrong.
 *
 * It does not judge the pack as a NUTRITION PLAN. That would need protein-per-serving, servings
 * per tub and the customer's intake from food — none of which this project holds. A verdict like
 * "this covers your protein needs" would be a fabricated claim wearing the costume of a
 * calculation, and people act on those.
 *
 * The distinction is load-bearing rather than pedantic: everything below could be recomputed by
 * hand from the cart and the category list. If a rule here cannot be, it does not belong here.
 */

import { GOAL_CATEGORY_EMPHASIS, GOAL_LABELS, type Goal } from '@/util/nutritionTargets';

export type Verdict = 'empty' | 'thin' | 'good' | 'complete';

export interface AssessmentPoint {
  ok: boolean;
  text: string;
}

export interface Assessment {
  verdict: Verdict;
  headline: string;
  points: AssessmentPoint[];
  /** Category slugs worth adding, best first. Empty when there is nothing useful to suggest. */
  suggestions: string[];
}

export interface AssessInput {
  goal: Goal | null;
  /** Slugs with at least one product in the pack. */
  coveredSlugs: string[];
  /** Every slug the builder offers, so a suggestion never points at a category that isn't there. */
  availableSlugs: string[];
  /** Human labels, for the sentences. */
  labelBySlug: Record<string, string>;
  itemCount: number;
  subtotal: number;
  discountPercent: number;
  nextTier: { percent: number; remaining: number } | null;
  /**
   * Whether a server quote has actually been received.
   *
   * Without this, `nextTier === null` is ambiguous and the ambiguity is expensive: it means EITHER
   * "the top tier is reached" OR "no quote has arrived yet / the request failed". Read only as the
   * first, a failed quote produced the headline "Votre pack est complet" over a pack with one item
   * and no discount — the page congratulating the customer for a purchase that had not been priced.
   */
  hasQuote: boolean;
}

/** Mirrors the threshold announced in the site's utility bar ("Livraison gratuite à partir de 300 DT"). */
const FREE_DELIVERY_FROM = 300;

const list = (items: string[]): string =>
  items.length <= 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;

export function assessPack({
  goal,
  coveredSlugs,
  availableSlugs,
  labelBySlug,
  itemCount,
  subtotal,
  discountPercent,
  nextTier,
  hasQuote,
}: AssessInput): Assessment {
  if (itemCount === 0) {
    return {
      verdict: 'empty',
      headline: 'Votre pack est encore vide',
      points: [],
      suggestions: availableSlugs.slice(0, 3),
    };
  }

  const points: AssessmentPoint[] = [];

  // 1 — does the pack contain what this goal is usually built from?
  const emphasis = goal ? GOAL_CATEGORY_EMPHASIS[goal].filter((s) => availableSlugs.includes(s)) : [];
  const keyCovered = emphasis.filter((s) => coveredSlugs.includes(s));
  const keyMissing = emphasis.filter((s) => !coveredSlugs.includes(s));

  if (goal && emphasis.length > 0) {
    /* Every category name is wrapped in "la catégorie …" rather than dropped into the sentence
       bare. Several category labels are word-for-word identical to goal labels — "Prise de masse"
       is both — and "Vous avez Prise de masse" then reads as a statement about the visitor's
       objective rather than about their basket. */
    const named = (slugs: string[]) => list(slugs.map((s) => `« ${labelBySlug[s] ?? s} »`));

    if (keyMissing.length === 0) {
      points.push({
        ok: true,
        text: `Votre pack couvre les catégories habituelles pour ${GOAL_LABELS[goal].label.toLowerCase()} : ${named(keyCovered)}.`,
      });
    } else {
      points.push({
        ok: keyCovered.length > 0,
        text:
          keyCovered.length > 0
            ? `Vous avez ${named(keyCovered)}. Pour ${GOAL_LABELS[goal].label.toLowerCase()}, on y ajoute souvent ${named(keyMissing)}.`
            : `Pour ${GOAL_LABELS[goal].label.toLowerCase()}, un pack part généralement de ${named(keyMissing)}.`,
      });
    }
  }

  // 2 — variety. Three tubs of the same whey is an order, not a pack, and the bundle discount is
  // the only reason this page exists.
  const variety = coveredSlugs.length;
  points.push({
    ok: variety >= 2,
    text:
      variety >= 2
        ? `${variety} catégories différentes — c'est ce qui fait un pack plutôt qu'une commande.`
        : "Une seule catégorie pour l'instant. Un pack devient intéressant à partir de deux.",
  });

  /* 3 — where the money sits. Every branch here is gated on `hasQuote`, because the discount is the
     server's answer and this module must never narrate one it has not been given. With no quote the
     money line is simply absent: saying nothing is correct, and it is the only option that cannot
     be wrong. */
  if (hasQuote) {
    if (discountPercent > 0) {
      points.push({
        ok: true,
        text: nextTier
          ? `Remise de −${discountPercent}% acquise. Encore ${nextTier.remaining.toFixed(2)} DT pour −${nextTier.percent}%.`
          : `Remise maximale atteinte : −${discountPercent}%.`,
      });
    } else if (nextTier) {
      points.push({
        ok: false,
        text: `Ajoutez ${nextTier.remaining.toFixed(2)} DT pour débloquer −${nextTier.percent}%.`,
      });
    }
  }

  // 4 — delivery. A fact about this basket that changes what the visitor pays, so it belongs in a
  // verdict about the basket. 300 DT mirrors the threshold announced in the site's utility bar.
  points.push(
    subtotal >= FREE_DELIVERY_FROM
      ? { ok: true, text: 'Livraison gratuite incluse.' }
      : {
          ok: false,
          text: `Encore ${(FREE_DELIVERY_FROM - subtotal).toFixed(2)} DT pour la livraison gratuite.`,
        }
  );

  const suggestions = [...keyMissing, ...availableSlugs.filter((s) => !coveredSlugs.includes(s) && !keyMissing.includes(s))].slice(0, 3);

  /* The verdict thresholds. `complete` requires the goal's key categories AND a real quote AND the
     top tier reached — three conditions, so it stays rare enough to mean something; a label
     everyone earns is decoration.

     `hasQuote &&` is the part that is not cosmetic. Without it, a failed or pending quote makes
     `nextTier` null, which read as "top tier reached" and headlined an unpriced one-item pack as
     "Votre pack est complet". */
  let verdict: Verdict;
  if (variety < 2) verdict = 'thin';
  else if (keyMissing.length === 0 && hasQuote && !nextTier) verdict = 'complete';
  else verdict = 'good';

  const headline =
    verdict === 'complete'
      ? 'Votre pack est complet'
      : verdict === 'good'
        ? 'Votre pack tient la route'
        : 'Votre pack est un bon début';

  return { verdict, headline, points, suggestions };
}
