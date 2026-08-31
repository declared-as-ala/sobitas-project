'use client';

import { usePathname } from 'next/navigation';
import { Footer } from '@/app/components/Footer';

/** Application and focused task surfaces do not inherit the marketing footer. */
export function ShopFooter() {
  const pathname = usePathname();

  if (
    pathname === '/account' ||
    pathname.startsWith('/account/') ||
    pathname === '/pack-builder' ||
    pathname.startsWith('/pack-builder/')
  ) {
    return null;
  }

  return <Footer />;
}
