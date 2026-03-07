'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';

export function NavigationHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setLoading } = useLoading();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    // Only clear loading if pathname actually changed (not on initial mount)
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      // Small delay to ensure page content has started loading
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    
    prevPathnameRef.current = pathname;
  }, [pathname, searchParams, setLoading]);

  return null;
}
