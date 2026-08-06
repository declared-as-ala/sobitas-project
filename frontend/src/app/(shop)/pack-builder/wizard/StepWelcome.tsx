'use client';

/**
 * Step 0 — what this is, and what it earns you.
 *
 * ── THIS STEP IS ALSO THE PAGE'S SEO SURFACE ───────────────────────────────────────────────
 * The wizard is a client component whose initial state is step 0, so THIS is what is in the
 * server-rendered HTML and therefore what a crawler reads. That makes three things non-negotiable
 * here, none of which are about the visitor in front of it:
 *
 *   - the `<h1>` renders at full size (it is `sr-only` on later steps, still in the DOM);
 *   - the descriptive paragraph is real prose, not a chip;
 *   - the category links are real `<a href>`s to the category pages.
 *
 * That last one matters most. The previous layout rendered 56 product tiles, but their controls
 * were `<button>`s — it emitted no product links at all. The only internal links it contributed
 * were the per-category "Voir tout" anchors, and those are preserved here rather than lost to the
 * step machine. Nothing SEO-bearing moved behind a click.
 *
 * ── THREE NUMBERS, ONE BUTTON ──────────────────────────────────────────────────────────────
 * Owner: *"maybe in the first, say welcome, you're now creating a pack. Give him numbers — when
 * you do this you will get this remise."* The tier ladder was previously a progress bar with three
 * thresholds shown while the pack was empty, i.e. a progress bar reading zero: it stated the
 * mechanic without ever being persuasive. Stated as three plain figures before anything exists, it
 * is an offer. It becomes a progress bar the moment there is progress to show.
 *
 * ── WHAT CAME OFF THIS STEP ────────────────────────────────────────────────────────────────
 * Owner: *"make it simpler, take off the texts that aren't needed."* Four things went, and each
 * was already stated somewhere the visitor was going to read anyway:
 *
 *   the kicker            moved to the shell, ABOVE the h1 where it belongs — it had been
 *                         rendering underneath it. See the note in PackWizard.
 *   a second sentence     "Répondez à une question, choisissez vos produits, et la remise
 *                         s'applique toute seule." The three −5/−8/−12% cards directly below say
 *                         the second half in figures, and the button says the first half.
 *   "Moins d'une minute.  Reassurance about a form nobody has seen yet. It answers an objection
 *    Aucune inscription." the visitor has not had time to form.
 *   two trust chips       "Livraison gratuite dès 300 DT" is in the utility strip at the top of
 *                         THIS page (HeaderClient.tsx:75) and "Produits 100% authentiques" is in
 *                         the footer. Repeating site chrome inside a step is how a screen fills up
 *                         with words that cost attention and carry nothing new.
 */

import Link from 'next/link';
import { m } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { childVariants, tap } from './variants';
import type { PackGroup } from './steps';

export interface StepWelcomeProps {
  tiers: { min: number; percent: number }[];
  groups: PackGroup[];
  onStart: () => void;
  calm: boolean;
}

export function StepWelcome({ tiers, groups, onStart, calm }: StepWelcomeProps) {
  const child = childVariants(calm);

  return (
    /* No `mx-auto max-w-2xl` — the shell owns the rail now, for every step. See PackWizard. */
    <div className="text-center">
      {/* The kicker and the h1 are both rendered by PackWizard, above this, outside
          AnimatePresence — the h1 so that unmounting this step never leaves the document without a
          top-level heading, the kicker so that it sits ABOVE the h1 rather than under it. */}
      <m.p variants={child} className="mx-auto max-w-md text-sm leading-relaxed text-ink-2 sm:text-base">
        Plus votre pack grandit, plus la remise augmente.
      </m.p>

      {/* The offer, as three figures. Cards rather than a bar because there is nothing to measure
          yet — a progress indicator at zero communicates less than the numbers it is hiding. */}
      <m.ul variants={child} className="mt-7 grid grid-cols-3 gap-2.5 sm:gap-4">
        {tiers.map((tier, i) => (
          <m.li
            key={tier.min}
            variants={child}
            className={`rounded-xl border p-3 sm:p-4 ${
              i === tiers.length - 1 ? 'border-brand bg-brand/5' : 'border-hairline bg-elevated'
            }`}
          >
            <p className="font-display text-2xl font-extrabold tabular-nums leading-none tracking-tight text-brand sm:text-3xl">
              −{tier.percent}%
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-ink-2 sm:text-xs">
              dès <span className="font-semibold tabular-nums text-ink-1">{tier.min} DT</span>
            </p>
          </m.li>
        ))}
      </m.ul>

      <m.div variants={child} className="mt-7">
        <m.button
          type="button"
          onClick={onStart}
          whileTap={tap(calm)}
          className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-8 font-display text-base font-bold uppercase tracking-wide text-on-brand transition-colors sm:w-auto [@media(hover:hover)]:hover:bg-brand-hover"
        >
          Commencer
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </m.button>
      </m.div>

      {/* Real anchors, and they stay. See the note at the top of this file — these are the page's
          internal links and they must exist in the server-rendered HTML rather than behind a step
          change, so cutting them to save a row would be a silent SEO regression.

          The "Au programme" label above them is what went. A row of category names under a
          "Commencer" button does not need to be told it is a list of categories, and the `<nav>`
          keeps its `aria-label` so the one reader who genuinely cannot see that still hears it.
          `min-h-[44px]`, up from 36 — these were the last controls on the page under the site's
          own tap floor. */}
      {groups.length > 0 && (
        <m.nav variants={child} aria-label="Catégories du composeur" className="mt-8 border-t border-hairline pt-6">
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {groups.map((group) => (
              <li key={group.slug}>
                <Link
                  href={`/${group.slug}`}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-hairline px-4 text-xs font-semibold text-ink-2 transition-colors [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
                >
                  {group.label}
                </Link>
              </li>
            ))}
          </ul>
        </m.nav>
      )}
    </div>
  );
}
