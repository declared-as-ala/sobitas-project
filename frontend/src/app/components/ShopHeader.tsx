'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/app/components/Header';

/** Focused task surfaces own their navigation and must not inherit the full storefront header. */
export function ShopHeader() {
  const pathname = usePathname();

  if (pathname === '/pack-builder' || pathname.startsWith('/pack-builder/')) return null;

  return <Header />;
}
