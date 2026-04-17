'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { getCategories } from '@/services/api';
import { Category } from '@/types';

export function ProductsDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);
  const hoverTrigger = useRef(false);
  const hoverDropdown = useRef(false);

  useEffect(() => {
    setMounted(true);
    getCategories().then(setCategories).catch(console.error);
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

  const dropdownContent = isOpen && mounted ? (
    <div
      ref={dropdownRef}
      className="fixed left-0 right-0 w-full bg-white dark:bg-gray-900 shadow-2xl border-t-2 border-red-600 z-[200]"
      style={{ top: `${dropdownTop}px`, maxHeight: 'calc(100vh - 80px)' }}
      onMouseEnter={() => { hoverDropdown.current = true; cancelClose(); }}
      onMouseLeave={() => { hoverDropdown.current = false; scheduleClose(); }}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 overflow-y-auto max-h-[calc(100vh-80px)] overscroll-contain">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
          {categories.map((cat) => {
            const subs = (cat.sous_categories ?? []) as Array<{ id: number; slug: string; designation_fr: string }>;
            return (
              <div key={cat.id} className="min-w-0">
                <LinkWithLoading
                  href={`/category/${cat.slug}`}
                  className="font-bold text-[11px] tracking-wider text-red-600 dark:text-red-500 uppercase mb-3 hover:text-red-700 transition-colors block leading-tight"
                  loadingMessage="Chargement..."
                  onMouseEnter={() => router.prefetch(`/category/${cat.slug}`)}
                  onClick={close}
                >
                  {cat.designation_fr}
                </LinkWithLoading>

                <div className="w-8 h-0.5 bg-red-200 dark:bg-red-900 mb-3 rounded-full" />

                <ul className="space-y-1">
                  {subs.map((sub) => (
                    <li key={sub.id}>
                      <LinkWithLoading
                        href={`/category/${sub.slug}`}
                        className="group flex items-center gap-1.5 text-[13px] text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors py-0.5 leading-snug"
                        loadingMessage="Chargement..."
                        onMouseEnter={() => router.prefetch(`/category/${sub.slug}`)}
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
            href="/shop"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 rounded-lg"
            loadingMessage="Chargement de la boutique..."
            onMouseEnter={() => router.prefetch('/shop')}
            onClick={close}
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
        href="/shop"
        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1 whitespace-nowrap py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        loadingMessage="Chargement de la boutique..."
        onMouseEnter={() => router.prefetch('/shop')}
      >
        NOS PRODUITS
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </LinkWithLoading>

      {mounted && typeof window !== 'undefined' && dropdownContent &&
        createPortal(dropdownContent, document.body)}
    </div>
  );
}
