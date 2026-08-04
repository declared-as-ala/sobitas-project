/**
 * The pack builder's motion layer — no library, and that is a decision rather than a shortcut.
 *
 * ── WHY NOT FRAMER MOTION ──────────────────────────────────────────────────────────────────
 * `motion` is not in package.json. It was removed as dead weight once `ScrollToTop` stopped
 * importing it, and re-adding it costs ~34 kB gzip of client JavaScript on the one route whose
 * entire purpose is to load fast and convert. Everything this page needs is a transform and an
 * opacity over ~500ms, which is precisely what `Element.animate()` does natively, on the
 * compositor, for zero bytes.
 *
 * The rule every animation here obeys: **transform and opacity only.** Those two are the only
 * properties the browser can animate without touching layout or paint, which is what keeps this
 * off the main thread on a page that is already running 56 images and a debounced network quote.
 * Animating `width`, `top` or `height` here would be a frame-rate bug, not a style choice.
 *
 * ── REDUCED MOTION IS HANDLED HERE, NOT ONLY IN CSS ────────────────────────────────────────
 * `globals.css` clamps animation durations under `prefers-reduced-motion`, but a clamped duration
 * still *runs* — a WAAPI clone would flash for 0.01ms and get removed, and DOM churn is exactly
 * what someone with a vestibular disorder is asking us to avoid. So these functions return early
 * and never create the element at all.
 */

/** True when the visitor has asked their OS for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fly a product image into the pack summary.
 *
 * This is the single most important piece of feedback on the page. Adding an item on a phone
 * otherwise changes two numbers in a bar the thumb is covering — the tap registers as "nothing
 * happened", which is how people tap twice and end up with a quantity they did not want. The flight
 * answers both questions a tap raises: *did it work*, and *where did it go*.
 *
 * @param source the element to clone — the product's <img>.
 * @param target where it lands — the pack bar on mobile, the summary rail on desktop.
 */
export function flyToPack(source: HTMLElement | null, target: HTMLElement | null): void {
  if (!source || !target) return;
  if (prefersReducedMotion()) return;
  // A tab that is not visible cannot paint, and `getBoundingClientRect` on a hidden layout returns
  // zeros — which would fling a clone from the top-left corner when the visitor came back.
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return;

  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  // The clone is decoration. Announcing a duplicate product name to a screen reader mid-flight is
  // noise on top of the live region that already reports the new total.
  clone.setAttribute('aria-hidden', 'true');
  clone.style.cssText = [
    'position:fixed',
    `left:${from.left}px`,
    `top:${from.top}px`,
    `width:${from.width}px`,
    `height:${from.height}px`,
    'margin:0',
    'padding:0',
    'object-fit:contain',
    'pointer-events:none',
    // Above the page, below the header (z-50) and the modal layer — a flying thumbnail must never
    // cross over the site chrome.
    'z-index:45',
    'will-change:transform,opacity',
  ].join(';');

  document.body.appendChild(clone);

  // Land on the target's centre, scaled down to roughly a thumbnail. Translation is expressed
  // relative to the clone's own fixed origin, so no layout read happens during the animation.
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const endScale = Math.min(0.32, Math.max(0.12, to.width / from.width / 3));

  const animation = clone.animate(
    [
      { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
      // The arc: lift, then fall. A straight line reads as a glitch; one control point reads as an
      // object being thrown, which is the metaphor the whole gesture is borrowing.
      { transform: `translate3d(${dx * 0.5}px, ${dy * 0.32 - 44}px, 0) scale(0.72)`, opacity: 0.95, offset: 0.55 },
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${endScale})`, opacity: 0.15 },
    ],
    { duration: 520, easing: 'cubic-bezier(0.32, 0.72, 0.24, 1)', fill: 'forwards' }
  );

  const cleanup = () => clone.remove();
  animation.addEventListener('finish', cleanup, { once: true });
  // `cancel` fires if the tab is backgrounded mid-flight. Without this the clone is orphaned in the
  // DOM at full opacity, and it is `position: fixed` — it would sit over the page until reload.
  animation.addEventListener('cancel', cleanup, { once: true });
}

/**
 * A one-shot ring on the tier bar when a discount tier is reached.
 *
 * Applied by toggling a class and removing it on `animationend` rather than by leaving the class on
 * — an animation that stays declared replays on any re-render that remounts the node, and this
 * component re-renders on every quantity change.
 */
export function pulseTierUnlocked(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove('pt-tier-hit');
  // Force a reflow so removing and re-adding within one frame restarts the animation. Reading
  // offsetWidth is the standard way to do this and is the one deliberate layout read in this file.
  void el.offsetWidth;
  el.classList.add('pt-tier-hit');
  el.addEventListener('animationend', () => el.classList.remove('pt-tier-hit'), { once: true });
}
