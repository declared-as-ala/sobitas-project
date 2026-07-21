'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getCategories } from '@/services/api';
import { useSiteChrome } from '@/contexts/SiteChromeContext';
import { Category } from '@/types';

type ProductsDropdownProps = {
  label?: string;
  href?: string;
  opensNewTab?: boolean;
};

function canPrefetch(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

export function ProductsDropdown({
  label = 'NOS PRODUITS',
  href = '/shop',
  opensNewTab = false,
}: ProductsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [mounted, setMounted] = useState(false);
  // Server-fetched categories (root layout → SiteChromeProvider): the mega-menu is populated
  // without a client API call; fetch-on-mount remains only as fallback when SSR data is empty.
  const { categories: ssrCategories } = useSiteChrome();
  const [categories, setCategories] = useState<Category[]>(ssrCategories);

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);
  const hoverTrigger = useRef(false);
  const hoverDropdown = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (ssrCategories.length === 0) {
      getCategories().then(setCategories).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!hoverTrigger.current && !hoverDropdown.current) setIsOpen(false);
    }, 200);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  const open = useCallback(() => {
    cancelClose();
    if (triggerRef.current) {
      setDropdownTop(triggerRef.current.getBoundingClientRect().bottom);
    }
    setIsOpen(true);
  }, [cancelClose]);

  const close = useCallback(() => {
    hoverTrigger.current = false;
    hoverDropdown.current = false;
    cancelClose();
    setIsOpen(false);
  }, [cancelClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerUp = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener('pointerup', onPointerUp, { capture: true });
    return () => document.removeEventListener('pointerup', onPointerUp, { capture: true });
  }, [isOpen, close]);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const prefetchShop = () => {
    if (canPrefetch(href)) router.prefetch(href);
  };
  const targetProps = opensNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  const dropdownContent = isOpen && mounted ? (
    <div
      ref={dropdownRef}
      className="fixed left-0 right-0 w-full bg-white dark:bg-gray-900 shadow-lg border-t-2 border-red-600 border-b border-gray-100 dark:border-gray-800 z-[200]"
      style={{ top: `${dropdownTop}px`, maxHeight: 'calc(100vh - 80px)' }}
      onMouseEnter={() => { hoverDropdown.current = true; cancelClose(); }}
      onMouseLeave={() => { hoverDropdown.current = false; scheduleClose(); }}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-7 overflow-y-auto max-h-[calc(100vh-80px)] overscroll-contain">
        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-7">
          {categories.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="min-w-0" role="status" aria-label="Chargement des catégories">
                <Skeleton className="h-3 w-24 mb-3" />
                <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-3 w-20" />
                  ))}
                </div>
              </div>
            ))
          ) : categories.map((cat) => {
            const subs = (cat.sous_categories ?? []) as Array<{ id: number; slug: string; designation_fr: string }>;
            return (
              <div key={cat.id} className="min-w-0">
                <LinkWithLoading
                  href={`/${cat.slug}`}
                  className="font-display text-caption tracking-wide text-red-600 dark:text-red-400 uppercase mb-3 hover:text-red-700 dark:hover:text-red-300 transition-colors block leading-snug"
                  loadingMessage="Chargement..."
                  onMouseEnter={() => router.prefetch(`/${cat.slug}`)}
                  onClick={close}
                >
                  {cat.designation_fr}
                </LinkWithLoading>

                <div className="w-8 h-px bg-red-600 dark:bg-red-400 mb-3" />

                <ul className="space-y-1">
                  {subs.map((sub) => (
                    <li key={sub.id}>
                      <LinkWithLoading
                        href={`/${sub.slug}`}
                        className="group flex items-center gap-1.5 text-[13px] text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors py-0.5 leading-snug"
                        loadingMessage="Chargement..."
                        onMouseEnter={() => router.prefetch(`/${sub.slug}`)}
                        onClick={close}
                      >
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-red-500 transition-colors flex-shrink-0" />
                        {sub.designation_fr}
                      </LinkWithLoading>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Découvrez toute notre gamme de produits
          </p>
          <LinkWithLoading
            href={href}
            className="inline-flex items-center gap-2 font-display uppercase tracking-wide text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 rounded-xl"
            loadingMessage="Chargement de la boutique..."
            onMouseEnter={prefetchShop}
            onClick={close}
            {...targetProps}
          >
            Voir tous les produits
            <ArrowRight className="h-4 w-4" />
          </LinkWithLoading>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={() => { hoverTrigger.current = true; open(); }}
      onMouseLeave={() => { hoverTrigger.current = false; scheduleClose(); }}
    >
      <LinkWithLoading
        href={href}
        /* Must stay in lockstep with the sibling nav links in HeaderClient.tsx — this is the one
           nav item that renders through a different component, so it silently kept the old type
           system (14px, gray-900, boxed grey hover) while the other seven were restyled, making
           the most important link in the row look bigger and darker than its neighbours. */
        className="font-sans uppercase tracking-[0.11em] text-[12px] font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap h-full px-0.5"
        loadingMessage="Chargement de la boutique..."
        onMouseEnter={prefetchShop}
        {...targetProps}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </LinkWithLoading>

      {mounted && typeof window !== 'undefined' && dropdownContent &&
        createPortal(dropdownContent, document.body)}
    </div>
  );
}
