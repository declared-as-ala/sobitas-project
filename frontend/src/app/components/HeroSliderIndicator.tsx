'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface HeroSliderControlsProps {
  /** Number of slides in the track — one dot each. Hero passes slides.length. */
  count: number;
  /** id of the scroll-snap track to observe and control. */
  trackId?: string;
  /** Optional autoplay dwell in ms. Omit = manual only (no autoplay, no progress line). */
  autoplayMs?: number;
}

/**
 * Hero slider controls: prev/next arrows, an "01 — 03" counter with a progress rule, and dots.
 *
 * It owns NO slide markup, so the Hero stays a server component and the LCP path ships no carousel
 * JavaScript. This client island observes the existing CSS scroll-snap track (`#hero-track`): it
 * derives the active index from scrollLeft (rAF-throttled) so a manual swipe stays in sync, and
 * drives track.scrollTo on click/keys.
 *
 * PLACEMENT (the owner's "better placement of the buttons and the text"):
 *   - arrows are vertically centred on the left/right EDGES, out of the caption's way entirely
 *   - counter + progress rule sit bottom-LEFT, under the caption column
 *   - dots sit bottom-RIGHT on phones and centre-bottom from sm up
 * Nothing overlaps the headline or the CTA at any width, which is what the previous centred
 * capsule did on a phone (the caption needed pb-20 purely to dodge it).
 *
 * MOBILE CLAMP: globals.css force-clamps every transition/animation to 0.2s on <=768px unless the
 * node carries `data-motion`. The dot transition carries it. The autoplay progress line is NOT a CSS
 * transition at all — its width is written every frame from requestAnimationFrame, so the clamp
 * physically cannot truncate it.
 *
 * REDUCED MOTION: prefers-reduced-motion (live) disables autoplay and switches scrolling to instant
 * 'auto'; the globals.css `*` reduced-motion rule also kills the dot transition.
 *
 * HIT AREAS: every control is >=44x44 CSS px (WCAG 2.5.8), including the dots — their visible bar is
 * small but the button padding carries the target.
 */
export function HeroSliderControls({
  count,
  trackId = 'hero-track',
  autoplayMs,
}: HeroSliderControlsProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  const trackRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(0);
  const reducedRef = useRef(false);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const progressRef = useRef<HTMLSpanElement | null>(null);

  activeRef.current = active;
  reducedRef.current = reduced;

  // prefers-reduced-motion, kept live.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Observe the track: derive the active index from scrollLeft (rAF-throttled) so a manual swipe
  // updates the controls, and recompute on resize (clientWidth changes the snap math).
  useEffect(() => {
    const track = document.getElementById(trackId);
    trackRef.current = track;
    if (!track) return;

    const compute = () => {
      rafRef.current = null;
      const w = track.clientWidth;
      if (w === 0) return;
      const next = Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / w)));
      setActive((prev) => (prev === next ? prev : next));
    };
    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(compute);
    };

    track.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    compute();

    return () => {
      track.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [trackId, count]);

  // Pause autoplay while the user is dragging the track itself (touch swipe / mouse drag).
  useEffect(() => {
    const track = trackRef.current ?? document.getElementById(trackId);
    if (!track) return;
    const down = () => setPaused(true);
    const up = () => setPaused(false);
    track.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    return () => {
      track.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [trackId]);

  const goTo = useCallback(
    (i: number) => {
      const track = trackRef.current ?? document.getElementById(trackId);
      if (!track) return;
      // Wrap, so the arrows are never dead ends on a looping banner.
      const target = ((i % count) + count) % count;
      track.scrollTo({
        left: target * track.clientWidth,
        behavior: reducedRef.current ? 'auto' : 'smooth',
      });
      setActive(target);
    },
    [trackId, count],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let target: number | null = null;
      if (e.key === 'ArrowRight') target = Math.min(count - 1, active + 1);
      else if (e.key === 'ArrowLeft') target = Math.max(0, active - 1);
      else if (e.key === 'Home') target = 0;
      else if (e.key === 'End') target = count - 1;
      if (target == null) return;
      e.preventDefault();
      goTo(target);
      btnRefs.current[target]?.focus();
    },
    [active, count, goTo],
  );

  // Autoplay + progress rule. rAF-driven: the width is written as an INLINE style every frame — no
  // CSS transition/animation — so the mobile 0.2s clamp has nothing to shorten. Restarts whenever
  // `active` changes (a swipe/click resets the dwell), on pause, or when reduced-motion toggles.
  useEffect(() => {
    if (progressRef.current) progressRef.current.style.width = '0%';
    if (!autoplayMs || count <= 1 || paused || reduced) return;

    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const pct = Math.min(1, (now - start) / autoplayMs);
      if (progressRef.current) progressRef.current.style.width = `${pct * 100}%`;
      if (pct >= 1) {
        goTo(activeRef.current + 1); // scroll -> active changes -> effect restarts
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoplayMs, count, paused, reduced, active, goTo]);

  if (count <= 1) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  /**
   * `.pt-scrim` (tokens.css), not `bg-black/45`.
   *
   * These controls sit over ARTWORK THE ADMIN UPLOADS, so their contrast is only knowable if the
   * surface underneath them is. /45 over a pure-white banner composites to #8C8C8C, where the
   * white chevron measures 2.90:1 — under the 3:1 floor for a graphical control (WCAG 1.4.11) on
   * exactly the kind of bright banner a supplement brand ships. The scrim is 86%, composites to
   * at worst #2B2B2C, and puts the chevron at 12.6:1 whatever the photograph does.
   *
   * It also carries the slab TOKEN scope, so the ring, the ink and the accent inside these
   * controls all resolve against a dark surface instead of being hand-written literals.
   *
   * No `backdrop-blur` (DESIGN_SYSTEM §9): each instance forces its own compositing layer, and
   * these sit directly over the LCP image on every page load.
   */
  const arrow =
    'pt-scrim pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-ink-1 ' +
    'transition-colors duration-200 hover:border-brand focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none';

  return (
    <div
      role="group"
      aria-label="Contrôles du carrousel"
      onKeyDown={onKeyDown}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      /* pointer-events-none on the overlay so the slide underneath stays clickable everywhere the
         controls are not; each control re-enables them for itself. */
      className="pointer-events-none absolute inset-0 z-30"
    >
      {/* Prev / next — vertically centred on the edges, clear of the caption column. */}
      <button
        type="button"
        onClick={() => goTo(active - 1)}
        aria-label="Diapositive précédente"
        className={cn(arrow, 'absolute left-2 top-1/2 -translate-y-1/2 sm:left-4')}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => goTo(active + 1)}
        aria-label="Diapositive suivante"
        className={cn(arrow, 'absolute right-2 top-1/2 -translate-y-1/2 sm:right-4')}
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Bottom rail: counter + progress on the left, dots on the right.

          BOTH CLUSTERS SIT ON THEIR OWN SCRIM PILL. They used to be bare white type and bare
          white dots with a `text-shadow` doing the legibility work — and a text-shadow is exactly
          the kind of "looks fine on the banner I tested" fix that fails silently on the next
          upload. On a white banner the counter measured 1.08:1 and the inactive dots were
          invisible. A pill is 8px of extra chrome and makes both provable. */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-5 pb-5 sm:px-8 sm:pb-6 lg:px-12 xl:px-14">
        <div className="pt-scrim pointer-events-none flex items-center gap-3 rounded-full px-4 py-2">
          <span className="font-display text-sm font-bold tabular-nums text-ink-1 sm:text-base">
            {pad(active + 1)}
          </span>
          {/* The rule doubles as the autoplay progress bar, so the dwell is visible rather than a
              surprise. Fixed width keeps the counter from shifting as the index changes. */}
          <span className="relative block h-[2px] w-12 overflow-hidden rounded-full bg-rule sm:w-16">
            <span
              ref={progressRef}
              data-motion
              className="absolute inset-y-0 left-0 block rounded-full bg-brand"
              style={{ width: '0%' }}
            />
          </span>
          <span className="font-display text-sm font-bold tabular-nums text-ink-3 sm:text-base">
            {pad(count)}
          </span>
        </div>

        <div className="pt-scrim flex items-center gap-1 rounded-full px-2">
          {Array.from({ length: count }).map((_, i) => {
            const isActive = i === active;
            return (
              <button
                key={i}
                ref={(el) => {
                  btnRefs.current[i] = el;
                }}
                type="button"
                aria-label={`Aller à la diapositive ${i + 1} sur ${count}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => goTo(i)}
                className="pointer-events-auto group flex h-11 w-5 items-center justify-center outline-none"
              >
                <span
                  data-motion
                  className={cn(
                    'block h-[6px] rounded-full transition-[width,background-color] duration-300 ease-out',
                    'group-focus-visible:ring-2 group-focus-visible:ring-focus group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-transparent',
                    isActive ? 'w-5 bg-brand' : 'w-[6px] bg-ink-3 group-hover:bg-ink-1',
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default HeroSliderControls;
