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

    // Internal links: let Next.js Link handle navigation (avoids 404 from custom prefetch+push cache)
    if (isInternalLink(href)) {
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
    <Link href={href} className={className} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
