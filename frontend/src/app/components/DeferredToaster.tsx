'use client';

import { useState, useEffect } from 'react';
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
      position={isDesktop ? 'top-right' : 'top-center'}
      dir="ltr"
      className="sonner-toaster"
      duration={4400}
      gap={8}
      visibleToasts={2}
      expand={false}
      closeButton
      offset={{ top: 20, right: 20 }}
      mobileOffset={{ top: 10, left: 8, right: 8 }}
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
        loading: <LoaderCircle className="animate-spin" aria-hidden="true" />,
        close: <X aria-hidden="true" />,
      }}
      containerAriaLabel="Notifications Protein.tn"
    />
  );
}
