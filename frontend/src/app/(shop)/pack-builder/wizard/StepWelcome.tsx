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
 */

import Link from 'next/link';
import { m } from 'motion/react';
import { ArrowRight, ShieldCheck, Truck } from 'lucide-react';
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
    <div className="mx-auto max-w-2xl text-center">
      {/* `.pt-kicker` is the site's shared kicker — the same class, the same 28px brand rule and
          the same wdth 112 / 0.22em tracking that sits above every heading on the landing page.
          It used to be a hand-rolled `text-[11px] tracking-[0.2em]`, which is how a page ends up
          with seven kicker styles nobody chose. */}
      <m.p variants={child} className="pt-kicker inline-flex items-center gap-2.5 text-brand">
        <span className="h-px w-7 bg-brand" aria-hidden="true" />
        Pack sur mesure
      </m.p>

      {/* The h1 is NOT here. It is rendered by PackWizard, outside AnimatePresence, so that
          unmounting this step does not leave the document without a top-level heading. See the
          note there. This spacer keeps the rhythm the h1 used to occupy. */}
      <div className="mt-2" aria-hidden="true" />

      <m.p variants={child} className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-2 sm:text-base">
        Répondez à une question, choisissez vos produits, et la remise s&apos;applique toute seule.
        Plus votre pack grandit, plus elle augmente.
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
        <p className="mt-2.5 text-xs text-ink-3">Moins d&apos;une minute. Aucune inscription.</p>
      </m.div>

      <m.ul variants={child} className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-2">
        <li className="inline-flex items-center gap-1.5">
          <Truck className="h-4 w-4 text-brand" aria-hidden="true" />
          Livraison gratuite dès 300 DT
        </li>
        <li className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
          Produits 100% authentiques
        </li>
      </m.ul>

      {/* Real anchors. See the note at the top of this file — these are the page's internal links,
          and they must exist in the server-rendered HTML rather than behind a step change. */}
      {groups.length > 0 && (
        <m.nav variants={child} aria-label="Catégories du composeur" className="mt-8 border-t border-hairline pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Au programme</p>
          <ul className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            {groups.map((group) => (
              <li key={group.slug}>
                <Link
                  href={`/${group.slug}`}
                  className="inline-flex min-h-[36px] items-center rounded-full border border-hairline px-3.5 text-xs font-semibold text-ink-2 transition-colors [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
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
