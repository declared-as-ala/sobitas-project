'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react';

const Toaster = dynamic(
  () => import('sonner').then((mod) => mod.Toaster),
  { ssr: false }
);

/**
 * Renders Toaster after the first paint / first idle to avoid blocking INP.
 * Sonner stays available for toasts; deferring its init reduces main-thread work during initial load.
 */
export function DeferredToaster() {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const updatePosition = () => setIsDesktop(mediaQuery.matches);
    updatePosition();
    mediaQuery.addEventListener('change', updatePosition);
    return () => mediaQuery.removeEventListener('change', updatePosition);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const schedule = (): void => {
      if (cancelled) return;
      setMounted(true);
    };
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(schedule, { timeout: 500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = setTimeout(schedule, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!mounted) return null;
  return (
    <Toaster
      /*
        ── BOTTOM, ON BOTH BREAKPOINTS, AND THAT IS A MEASUREMENT ──────────────────────────
        Owner, 07/09/2026: *"the toasts are broken — show them in a good place that doesn't
        noise the user."*

        It was `top-right` / `top-center` at a 10-20px offset. Measured on a product page, the
        sticky header spans y=36→101 on a 390px phone and ends at y=150 at 1440 — so the toast
        was landing squarely ON it. Screenshotted at 390: "Produit ajouté au panier" sitting
        across the logo and the search field, with its own top edge against the viewport edge.
        The header is the one strip that has to stay legible while a shopper decides what to
        do next, and it is also the strip the toast was covering every single time.

        The bottom is free. The only fixed furniture down there is the 57px MobileTabBar, and
        the offsets below clear it explicitly rather than hoping. It is also nearer the action:
        on a phone, add-to-cart is the sticky bar, so the confirmation now appears beside the
        control that produced it instead of a screen away from it.
      */
      position={isDesktop ? 'bottom-right' : 'bottom-center'}
      dir="ltr"
      className="sonner-toaster"
      /*
        THE ONLY PLACE THE TOAST'S WIDTH CAN BE SET.

        Sonner writes `--width` as an INLINE style on the toaster element, so the
        `.sonner-toaster { --width: 21rem }` rule that used to live in globals.css never applied
        once — every toast has been sonner's default 356px. Sonner spreads `...style` after its
        own defaults, so this prop is the one thing that wins.

        368px, because the phone plate is `100vw - 24px` = 366px at 390: the toast is then the
        same object at both breakpoints rather than two sizes that happen to look similar. It is
        also the width at which the three-line description clamp stops cutting a French sentence
        after four words.
      */
      style={{ '--width': '368px' } as CSSProperties}
      duration={4400}
      gap={8}
      visibleToasts={2}
      expand={false}
      closeButton
      offset={{ bottom: 24, right: 24 }}
      /*
        64px clears the 57px tab bar with a 7px gap, plus whatever the device reserves for its
        home indicator. /checkout hides the tab bar and puts its own ~74px CTA footer there
        instead, so the toast rides just above that too rather than needing a per-route value.
      */
      mobileOffset={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))', left: '12px', right: '12px' }}
      swipeDirections={isDesktop ? ['right'] : ['left', 'right']}
      toastOptions={{
        classNames: {
          toast: 'pt-toast shadow-card',
          icon: 'pt-toast__icon',
          content: 'pt-toast__content',
          title: 'pt-toast__title',
          description: 'pt-toast__description',
          actionButton: 'pt-toast__action',
          cancelButton: 'pt-toast__cancel',
          closeButton: 'pt-toast__close',
        },
      }}
      icons={{
        success: <CircleCheck aria-hidden="true" />,
        error: <CircleX aria-hidden="true" />,
        warning: <TriangleAlert aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        /*
          NOT `animate-spin`, AND THE ATTRIBUTE IS THE POINT.

          globals.css clamps `animation-duration` to 0.2s on `*:not([data-motion])` below 768px,
          so Tailwind's 1s rotation became FIVE rotations a second on every phone — screenshotted
          at 390 as a vibrating smear rather than a spinner. `data-motion` is the sanctioned
          opt-out from that clamp, and `.pt-toast__spinner` owns the timing (900ms, and 2.4s under
          prefers-reduced-motion — a progress indicator is essential feedback, so it slows rather
          than stops).
        */
        loading: <LoaderCircle className="pt-toast__spinner" data-motion aria-hidden="true" />,
        close: <X aria-hidden="true" />,
      }}
      containerAriaLabel="Notifications Protein.tn"
    />
  );
}
