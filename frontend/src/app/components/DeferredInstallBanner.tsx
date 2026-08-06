'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const InstallAppBanner = dynamic(
  () => import('@/app/components/InstallAppBanner').then((m) => ({ default: m.InstallAppBanner })),
  { ssr: false }
);

/**
 * Keeps the PWA install prompt off the critical path.
 *
 * InstallAppBanner is 240 lines of client component and it was imported eagerly in the root
 * layout, so it shipped in the first-load bundle of EVERY route. Nothing about it belongs there:
 * it cannot decide whether to render until the browser fires `beforeinstallprompt`, so it is
 * never part of first paint, and server-rendering it emits markup that is always discarded.
 *
 * Profiling the homepage under 4x CPU / Slow 4G showed 218.9 kB of JavaScript across ~20 parallel
 * requests landing before FCP (2276ms) — at that point each removed request removes connection
 * contention as well as bytes.
 *
 * Same shape as DeferredToaster deliberately: `ssr: false` is illegal inside a Server Component,
 * so the layout imports this thin client wrapper and the wrapper owns the dynamic import. Mounting
 * on `requestIdleCallback` means the chunk is fetched after the main thread has gone quiet rather
 * than while it is still competing with hydration.
 */
/**
 * Routes where the install prompt does not appear, because the screen is already full of fixed
 * chrome that the visitor needs.
 *
 * Owner, about the pack builder specifically: *"the screen on mobile looks so filled… take them
 * off from that page, make the screen free."* WhatsAppFab and ScrollToTop were suppressed there for
 * exactly this reason and this banner was missed. Measured at 390×746 on a category step: the
 * banner is 81px, the step bar ~70px and MobileTabBar 56px — 207px, 28% of the viewport, on the
 * one screen whose entire job is showing products.
 *
 * The install prompt is a growth surface and this costs installs on one route. It is the right
 * trade here and nowhere else: every other page keeps it, and reversing this is deleting one line.
 */
const HIDDEN_ON = ['/pack-builder', '/checkout', '/cart'];

export function DeferredInstallBanner() {
  const pathname = usePathname() || '/';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const schedule = (): void => {
      if (!cancelled) setMounted(true);
    };
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(schedule, { timeout: 2000 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = setTimeout(schedule, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  // Checked AFTER the hooks, never before — an early return above `useEffect` would change the hook
  // count between routes and break the rules of hooks on every client navigation.
  if (!mounted) return null;
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  return <InstallAppBanner />;
}
