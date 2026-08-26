'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useCartDrawer } from '@/app/contexts/CartContext';

/**
 * The cart drawer's mount point — a leaf, on purpose.
 *
 * ── WHY IT IS NOT IN HeaderClient ANY MORE ────────────────────────────────────────────────
 * <CartDrawer> used to be the last element of HeaderClient, which meant the drawer's open state
 * had to live in a context HeaderClient subscribed to. HeaderClient is ~1,050 lines — the nav row,
 * both dropdowns, the search island, the mobile sheet — so EVERY add-to-cart re-rendered all of
 * it, inside the tap handler, because adding an item opens the drawer.
 *
 * Here, the only thing that re-renders when the drawer opens is this component, which renders one
 * element. The header keeps the cart badge and reads it from `useCartCount()`, a number, so it
 * re-renders only when the count itself changes.
 *
 * ── AND WHY THE CHUNK IS WARMED ───────────────────────────────────────────────────────────
 * `ssr: false` is right — the drawer is interaction-gated, carries no SEO content, and its `vaul`
 * dependency has no business in any page's first-load JS. But it has a sharp edge that showed up
 * as the site's worst measured interaction: the FIRST add-to-cart has to download and evaluate the
 * chunk before anything can paint. Measured at 4x CPU throttle, that tap cost 848 ms against
 * 56-80 ms for every other interaction on the page.
 *
 * So the module is imported during idle time, after the page has settled. By the time anyone taps
 * "Ajouter" it is already in memory, and the import inside `dynamic` resolves from cache. Nothing
 * is added to the critical path: `requestIdleCallback` only fires when the main thread has nothing
 * better to do, and the 2s timeout is a ceiling for a browser that never goes idle.
 *
 * The `setTimeout` fallback is for Safari, which only shipped `requestIdleCallback` in 17.4 — and
 * iOS is a large share of this shop's traffic, so "modern browsers have it" is not good enough.
 */
const CartDrawer = dynamic(() => import('./CartDrawer').then((m) => ({ default: m.CartDrawer })), {
  ssr: false,
});

export function CartDrawerHost() {
  const { open, setOpen } = useCartDrawer();
  const [keepMounted, setKeepMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const warm = () => {
      if (!cancelled) void import('./CartDrawer');
    };

    // Read off a widened alias rather than testing `'requestIdleCallback' in window` directly:
    // that form narrows `window` to `never` in the else-branch under this tsconfig, so the
    // Safari fallback below stops type-checking.
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(warm, { timeout: 2000 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }

    const id = window.setTimeout(warm, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setKeepMounted(true);
      return;
    }

    // Keep the panel for its short Vaul exit animation, then remove its full-cart subscription.
    const id = window.setTimeout(() => setKeepMounted(false), 320);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!open && !keepMounted) return null;
  return <CartDrawer open={open} onOpenChange={setOpen} />;
}
