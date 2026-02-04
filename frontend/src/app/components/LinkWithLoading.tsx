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
    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
    }

    // Don't intercept if it's a modifier key (Ctrl, Cmd, etc.) or external link
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

    // Prevent default navigation
    e.preventDefault();

    // Set loading state
    setLoadingMessage(loadingMessage || 'Chargement...');
    setLoading(true);

    // Prefetch and navigate
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
