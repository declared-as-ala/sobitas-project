'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';

/**
 * "Back to top" floating button. Sits directly ABOVE the WhatsApp FAB as a tidy vertical stack
 * (same right edge, matching install-banner offset) so the two never overlap or scatter.
 * Uses a cheap CSS opacity/translate transition — no framer-motion (design system §4 + it was the
 * only importer of `motion`, so dropping it here removes the whole lib from the client bundle).
 */
export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.scrollY > 500);
    toggleVisibility();
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div
      className={cn(
        'fixed right-4 sm:right-6 bottom-[calc(6rem+var(--tabbar-h))] max-md:[body[data-install-banner]_&]:bottom-[calc(10rem+var(--tabbar-h))] z-[45] transition-all duration-200 motion-reduce:transition-none',
        isVisible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
      )}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      aria-hidden={!isVisible}
    >
      <Button
        onClick={scrollToTop}
        size="icon"
        tabIndex={isVisible ? 0 : -1}
        className="h-11 w-11 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-colors"
        aria-label="Retour en haut"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}
