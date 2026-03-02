'use client';

import { FooterClient } from './FooterClient';

/** Sync wrapper so Footer can be used inside Client Components (e.g. via dynamic import). */
export function Footer() {
  return <FooterClient />;
}
