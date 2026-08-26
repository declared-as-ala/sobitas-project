'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert } from 'lucide-react';

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
  return (
    <Toaster
      position="top-center"
      dir="ltr"
      className="sonner-toaster"
      duration={4200}
      gap={8}
      visibleToasts={3}
      offset={{ top: 16 }}
      mobileOffset={{ top: 12, left: 12, right: 12 }}
      toastOptions={{
        classNames: {
          toast: 'pt-toast shadow-card',
          icon: 'pt-toast__icon',
          content: 'pt-toast__content',
          title: 'pt-toast__title',
          description: 'pt-toast__description',
          actionButton: 'pt-toast__action',
          cancelButton: 'pt-toast__cancel',
        },
      }}
      icons={{
        success: <CircleCheck aria-hidden="true" />,
        error: <CircleX aria-hidden="true" />,
        warning: <TriangleAlert aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        loading: <LoaderCircle className="animate-spin" aria-hidden="true" />,
      }}
      containerAriaLabel="Notifications"
    />
  );
}
