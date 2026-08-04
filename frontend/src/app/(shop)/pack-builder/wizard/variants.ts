'use client';

/**
 * The wizard's motion vocabulary — one file, so every step moves the same way.
 *
 * ── WHY FRAMER MOTION IS HERE AT ALL ───────────────────────────────────────────────────────
 * The rest of this site animates in CSS, deliberately, and an earlier version of this page did
 * too. A wizard is the case where that stops working: the thing that makes stepping feel like
 * stepping is the OUTGOING step leaving, and a CSS transition cannot animate an element that React
 * has already removed from the DOM. `AnimatePresence` exists precisely for that, and hand-rolling
 * it means reimplementing a mount/unmount queue with timers — the version of this that is always
 * subtly wrong.
 *
 * It is imported through `LazyMotion` + the `m` component (see PackWizard), so the route pays for
 * the `domAnimation` feature set (~6 kB gzip) instead of the whole library (~34 kB).
 *
 * ── DIRECTION IS PASSED, NOT INFERRED ──────────────────────────────────────────────────────
 * Going forward, the new step arrives from the right; going back, from the left. That means the
 * variants need to know which way we are travelling, so `custom` carries a +1/−1 and every variant
 * below is a FUNCTION of it. Inferring it from the index inside the component fails on the one case
 * that matters — jumping several steps at once from the progress rail.
 *
 * ── REDUCED MOTION ─────────────────────────────────────────────────────────────────────────
 * `useReducedMotion()` is read once in the shell and threaded down as `calm`. Under it, every
 * variant collapses to a plain opacity crossfade: no travel, no stagger, no spring. Not "faster" —
 * a fast slide is still a slide, and translation is the specific thing that triggers vestibular
 * symptoms. Opacity is the safe channel, so opacity is what is left.
 */

import type { Transition, Variants } from 'motion/react';

/** How far a step travels on its way in or out. */
const TRAVEL = 28;

/**
 * The house spring. Slightly over-damped, so a step settles rather than wobbling — a bouncy
 * wizard reads as a toy, and this one is asking for money.
 */
export const SPRING: Transition = { type: 'spring', stiffness: 320, damping: 34, mass: 0.85 };

/** For anything that must not overshoot: progress fills, bar widths, number swaps. */
export const EASE: Transition = { duration: 0.32, ease: [0.32, 0.72, 0.24, 1] };

export function stepVariants(calm: boolean): Variants {
  if (calm) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: { duration: 0.18 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    enter: (dir: number) => ({ opacity: 0, x: dir * TRAVEL }),
    center: { opacity: 1, x: 0, transition: { ...SPRING, staggerChildren: 0.045, delayChildren: 0.04 } },
    exit: (dir: number) => ({ opacity: 0, x: dir * -TRAVEL, transition: { duration: 0.16, ease: 'easeIn' } }),
  };
}

/**
 * Children of a step, revealed in sequence.
 *
 * The stagger is 45ms, which is short on purpose: long enough that the eye reads an order, short
 * enough that a twelve-product grid finishes revealing before a fast reader has finished the
 * heading. Anything above ~80ms and the last row arrives after the visitor has already reached for
 * it — an animation that makes the interface slower to use is a bug with a nice easing curve.
 */
export function childVariants(calm: boolean): Variants {
  if (calm) {
    return { enter: { opacity: 0 }, center: { opacity: 1, transition: { duration: 0.15 } } };
  }
  return {
    enter: { opacity: 0, y: 12 },
    center: { opacity: 1, y: 0, transition: SPRING },
  };
}

/** A value that changed — the total, a count, a percentage. Swap the node via `key` to replay it. */
export function popVariants(calm: boolean): Variants {
  if (calm) return { enter: { opacity: 1 }, center: { opacity: 1 } };
  return {
    enter: { opacity: 0, y: 6, scale: 0.92 },
    center: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 520, damping: 26 } },
  };
}

/** Press feedback on a card or button. Skipped entirely under reduced motion. */
export function tap(calm: boolean) {
  return calm ? undefined : { scale: 0.975 };
}
