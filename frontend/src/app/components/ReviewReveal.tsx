'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Browser-only enhancement around server-rendered quotes. No hidden preparation state:
 * missing JS, IntersectionObserver or Web Animations leaves every card fully readable. */
export function ReviewReveal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === 'undefined' || !Element.prototype.animate) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (motion.matches || entry.target.contains(document.activeElement)) continue;
        const animation = entry.target.animate(
          [{ opacity: 0.65, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 360, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: 0.12 });
    const list = root.current;
    for (const card of Array.from(list.children)) observer.observe(card);
    const cancel = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
    motion.addEventListener('change', cancel);
    list.addEventListener('focusin', cancel);
    return () => {
      observer.disconnect();
      cancel();
      motion.removeEventListener('change', cancel);
      list.removeEventListener('focusin', cancel);
    };
  }, []);

  return <ul ref={root} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">{children}</ul>;
}
