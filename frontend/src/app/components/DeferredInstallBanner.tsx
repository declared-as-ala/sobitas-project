'use client';

import { useState, useEffect } from 'react';
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
export function DeferredInstallBanner() {
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

  if (!mounted) return null;
  return <InstallAppBanner />;
}
