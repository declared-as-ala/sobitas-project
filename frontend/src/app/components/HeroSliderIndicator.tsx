'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/app/components/ui/utils';

const ACCENT = '#FF5A00';

interface HeroSliderIndicatorProps {
  /** Number of slides in the track — one tick each. Hero passes slides.length. */
  count: number;
  /** id of the scroll-snap track to observe and control. */
  trackId?: string;
  /** Optional autoplay dwell in ms. Omit = manual only (no autoplay, no progress line). */
  autoplayMs?: number;
  /** Tiny "n/N" counter, shown on mobile only for legibility when ticks get small. */
  showCounter?: boolean;
}

/**
 * Hero slider state indicator — "minimal-active-bar".
 *
 * A centered capsule of short ticks. Inactive ticks are short white bars; the active tick grows and
 * turns accent orange (#FF5A00), so the current slide reads instantly by BOTH size and colour. A
 * compact translucent-black backing (bg-black/45, NO blur) keeps the white ticks at >=3:1 over any
 * banner, light or dark.
 *
 * It owns NO slide markup — the Hero stays a server component. This client island observes the
 * existing CSS scroll-snap track (`#hero-track`): it derives the active index from scrollLeft
 * (rAF-throttled) so a manual swipe stays in sync, and drives track.scrollTo on click/keys.
 *
 * MOBILE CLAMP: globals.css force-clamps every transition/animation to 0.2s on <=768px unless the
 * node carries `data-motion`. The tick grow/colour transition carries `data-motion` so its 300ms is
 * honoured. The autoplay progress line is NOT a CSS transition at all — its width is written every
 * frame from requestAnimationFrame, so the clamp physically cannot touch or truncate it.
 *
 * REDUCED MOTION: prefers-reduced-motion (live) disables autoplay and switches scrolling to instant
 * 'auto'; the globals.css `*` reduced-motion rule also kills the tick transition.
 */
export function HeroSliderIndicator({
  count,
  trackId = 'hero-track',
  autoplayMs,
  showCounter = true,
}: HeroSliderIndicatorProps) {
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
  // updates the indicator, and recompute on resize (clientWidth changes the snap math).
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
      const target = Math.max(0, Math.min(count - 1, i));
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

  // Optional autoplay + a very subtle progress line. rAF-driven: progress width is written as an
  // INLINE style every frame — no CSS transition/animation — so the mobile 0.2s clamp has nothing to
  // shorten. Restarts whenever `active` changes (a swipe/click resets the dwell), on pause, or when
  // reduced-motion toggles.
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
        goTo((activeRef.current + 1) % count); // scroll -> active changes -> effect restarts
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoplayMs, count, paused, reduced, active, goTo]);

  if (count <= 1) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4 sm:bottom-8">
      <div
        role="group"
        aria-label="Sélecteur de diapositive"
        onKeyDown={onKeyDown}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        className="pointer-events-auto relative flex items-center gap-2 font-poppins"
      >
        {/* The ONLY dark chip — compact, no blur. bg-black/45 holds the white ticks at >=3:1 even
            over a light banner (WCAG 1.4.11). */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45"
        />

        {showCounter && (
          <span className="relative z-10 min-w-[2.25rem] pl-1 text-center text-xs font-semibold tabular-nums text-white sm:hidden">
            {active + 1}/{count}
          </span>
        )}

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
              className="group relative z-10 flex h-11 items-center justify-center px-1 outline-none"
            >
              <span
                data-motion
                className={cn(
                  'block h-1 rounded-full transition-[width,background-color] duration-300 ease-out',
                  'group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-black/50',
                  isActive ? 'w-8' : 'w-4 bg-white/70 group-hover:bg-white',
                )}
                style={isActive ? { backgroundColor: ACCENT } : undefined}
              />
            </button>
          );
        })}

        {autoplayMs ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 left-1/2 z-0 h-[2px] w-[calc(100%-1.5rem)] -translate-x-1/2 overflow-hidden rounded-full bg-white/25"
          >
            <span
              ref={progressRef}
              data-motion
              className="block h-full rounded-full"
              style={{ width: '0%', backgroundColor: ACCENT }}
            />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default HeroSliderIndicator;
