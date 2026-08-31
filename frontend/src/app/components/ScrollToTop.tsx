'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';

/**
 * "Back to top" floating button.
 *
 * ── IT WAS PARKED 96px ABOVE THE TAB BAR FOR A NEIGHBOUR THAT NO LONGER EXISTS ──────────────
 * Owner, 20/08/2026, looking at /shop on a phone: *"the button of the scroll to top — fix its
 * place"*. In their screenshot it floats in the middle of the right-hand product column, over a
 * card's price and its Ajouter button.
 *
 * The offset was `bottom-[calc(6rem+var(--tabbar-h))]`, and 6rem was the WhatsApp FAB's slot:
 * this button sat ABOVE it as a tidy vertical stack. The WhatsApp bubble was deleted on
 * 10/08/2026 (owner: "take off the popup button of whatsapp from mobile") and WhatsAppFab.tsx
 * went with it — leaving this one hovering 96px over an empty space, which on a 390px phone is
 * squarely on top of the second card in the right column.
 *
 * It now sits one 12px step above the tab bar, which is where a single FAB belongs: out of the
 * grid, adjacent to the chrome it belongs to, and still clear of the raised Boutique tile because
 * `--tabbar-h` already describes the bar's real footprint including the safe-area inset.
 *
 * Colour is tokens now, not `bg-red-600 text-white`. That literal pairing was two design-system
 * violations in one class string (DS011 + a hardcoded foreground) and it renders the same in both
 * themes, which the accent deliberately does not — `--c-brand` lightens in dark mode and
 * `--c-on-brand` flips to near-black to keep the pairing above 4.5:1.
 *
 * Uses a cheap CSS opacity/translate transition — no framer-motion (design system §4 + it was the
 * only importer of `motion`, so dropping it here removes the whole lib from the client bundle).
 */
export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = window.scrollY > 500;
      if (next === visibleRef.current) return;
      visibleRef.current = next;
      setIsVisible(next);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div
      className={cn(
        /* `transition-[opacity,transform]`, not `transition-all`: `all` also tweens the ring
           colour and the shadow on a element that is animating in and out on every scroll. */
        'fixed right-4 sm:right-6 bottom-[calc(0.75rem+var(--tabbar-h))] max-md:[body[data-install-banner]_&]:bottom-[calc(4.75rem+var(--tabbar-h))] z-[45] transition-[opacity,transform] duration-200 motion-reduce:transition-none',
        isVisible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
      )}
      /* The `marginBottom: env(safe-area-inset-bottom)` that used to be here was the inset counted
         twice — `--tabbar-h` already contains it (tokens.css). On a notched iPhone it pushed this
         button ~34px higher than the offset above asks for. */
      aria-hidden={!isVisible}
    >
      <Button
        onClick={scrollToTop}
        size="icon"
        tabIndex={isVisible ? 0 : -1}
        className="h-11 w-11 rounded-full bg-brand text-on-brand shadow-card transition-colors hover:bg-brand-hover hover:shadow-card-hover"
        aria-label="Retour en haut"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}
