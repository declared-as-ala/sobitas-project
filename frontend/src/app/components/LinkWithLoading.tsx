'use client';

import { ReactNode, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';

interface LinkWithLoadingProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  loadingMessage?: string;
  [key: string]: any;
}

/** True if href is same-origin internal (e.g. /shop/foo). */
function isInternalLink(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * We must NOT preventDefault + router.push() for internal links.
 * Otherwise prefetch runs first; if the RSC returns 404 (e.g. dynamic route not yet resolved),
 * that 404 is cached and router.push() then shows it — while a full page load works.
 * So for internal links we use native Next.js Link behavior (no custom prefetch/push).
 */
export function LinkWithLoading({
  href,
  children,
  className,
  onClick,
  loadingMessage,
  ...props
}: LinkWithLoadingProps) {
  const router = useRouter();
  const { setLoading, setLoadingMessage } = useLoading();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);

    if (
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.defaultPrevented ||
      href.startsWith('http') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('#')
    ) {
      return;
    }

    // Internal links: show loading state but let Next.js Link handle navigation (avoids 404 from custom prefetch+push cache)
    if (isInternalLink(href)) {
      setLoadingMessage(loadingMessage || 'Chargement...');
      setLoading(true);
      return;
    }

    e.preventDefault();
    setLoadingMessage(loadingMessage || 'Chargement...');
    setLoading(true);
    try {
      router.prefetch(href);
      router.push(href);
    } catch (error) {
      console.error('Navigation error:', error);
      setLoading(false);
    }
  };

  return (
    /*
     * ── prefetch DEFAULTS OFF, AND THE PRODUCT GRID IS WHY ────────────────────────────────
     * MEASURED on /shop (production build, 1536, cold cache) with 24 cards on screen: the page
     * pulled 967 KB of `fetch`, and it was not the shop's data — it was Next prefetching the RSC
     * payload of every product page whose card was in the viewport, at ~59 KB each. Twenty-four
     * cards is roughly 1.4 MB of other pages downloaded before the shopper has looked at one of
     * them, on the page that already carries the most images on the site.
     *
     * This component wraps every product card, every search result and every footer link, so the
     * default belongs HERE rather than at two dozen call sites.
     *
     * `false` disables the VIEWPORT prefetch only. Next still prefetches on hover and on
     * touchstart, so moving toward a card is as fast as it ever was; what stops is treating "this
     * card is on screen" as evidence that the shopper wants that page. On a grid, it never is.
     *
     * A caller that genuinely wants eager prefetch can still pass `prefetch` — it is spread after
     * this, so the prop wins.
     */
    <Link href={href} prefetch={false} className={className} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
