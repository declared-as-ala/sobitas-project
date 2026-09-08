'use client';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { useState } from 'react';
import { getStorageUrl } from '@/services/api';

/**
 * Three sizes, one component.
 *
 * `md` is the original 80px and stays the default, so `ProductComparisonTable` — the other
 * consumer — renders byte-identically. The two smaller ones exist because the sur-commande sheet
 * shows the SAME thumbnail in two roles with two different weights: `sm` for an alternative a
 * shopper is being asked to choose, `xs` for the out-of-stock item they arrived with, which is
 * context and must not out-weigh the things they can actually buy. Forking the class string into
 * that file instead is how `/favoris` ended up rendering a product card at a third of its width.
 *
 * `sizes` tracks the box: it is what next/image uses to pick a source, and leaving it at "80px"
 * for a 44px slot ships a ~3x oversized image on the densest screen the shop has.
 */
const BOX = {
  md: { cls: 'h-20 w-20', sizes: '80px', icon: 'h-7 w-7' },
  sm: { cls: 'h-16 w-16', sizes: '64px', icon: 'h-6 w-6' },
  xs: { cls: 'h-11 w-11', sizes: '44px', icon: 'h-5 w-5' },
} as const;

export function ComparisonProductImage({ src, name, size = 'md' }: {
  src: string;
  name: string;
  size?: keyof typeof BOX;
}) {
  const [failed, setFailed] = useState(false);
  const box = BOX[size];
  return <span className={`relative flex ${box.cls} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-hairline bg-sunken`}>
    {src && !failed ? <Image src={getStorageUrl(src)} alt={name} fill sizes={box.sizes} className="object-contain p-1" onError={() => setFailed(true)} /> : <Package className={`${box.icon} text-ink-3`} aria-label="Photo indisponible" />}
  </span>;
}
