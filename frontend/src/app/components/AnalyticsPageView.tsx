'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function AnalyticsPageView() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const lastPagePath = useRef<string | null>(null);

  useEffect(() => {
    const pagePath = `${pathname}${search ? `?${search}` : ''}`;
    if (lastPagePath.current === pagePath) return;
    lastPagePath.current = pagePath;

    window.gtag?.('event', 'page_view', {
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
    });
  }, [pathname, search]);

  return null;
}
