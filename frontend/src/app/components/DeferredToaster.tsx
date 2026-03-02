'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

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
  return <Toaster position="top-center" richColors className="sonner-toaster" />;
}
