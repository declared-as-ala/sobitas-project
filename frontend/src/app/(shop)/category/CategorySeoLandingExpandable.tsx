'use client';

import { useState, useRef, useEffect } from 'react';

/** Approximate height to show "first 2 paragraphs" on mobile (px). */
const COLLAPSED_MAX_HEIGHT = 320;

interface CategorySeoLandingExpandableProps {
  /** Full intro content (server-rendered). Wrapper adds collapse on mobile only. */
  children: React.ReactNode;
}

/**
 * On mobile: collapses intro after ~2 paragraphs height; "Lire plus" expands. Full content stays in DOM for SEO.
 * On desktop (md+): no collapse.
 */
export function CategorySeoLandingExpandable({ children }: CategorySeoLandingExpandableProps) {
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onResize = () => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (!isMobile) {
        setNeedsCollapse(false);
        return;
      }
      setNeedsCollapse(el.scrollHeight > COLLAPSED_MAX_HEIGHT);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobileCollapsed = needsCollapse && !expanded;

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={`text-base sm:text-lg transition-[max-height] duration-300 md:!max-h-none ${
          isMobileCollapsed ? 'overflow-hidden' : ''
        }`}
        style={isMobileCollapsed ? { maxHeight: COLLAPSED_MAX_HEIGHT } : undefined}
        aria-expanded={!isMobileCollapsed}
      >
        {children}
      </div>
      {needsCollapse && (
        <div className="mt-3 md:hidden">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-sm"
          >
            {expanded ? 'Lire moins' : 'Lire plus'}
          </button>
        </div>
      )}
    </div>
  );
}
