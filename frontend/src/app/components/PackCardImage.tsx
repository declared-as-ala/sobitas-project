'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';

import { cn } from '@/app/components/ui/utils';
import type { ProductImageMode } from '@/util/productImagePresentation';
import { productImageFrame } from '@/util/productCardFrame';
import { buildProductUrlPath } from '@/util/productUrl';
import type { Product } from '@/types';

interface PackCardImageProps {
  imageSrc: string;
  productName: string;
  /** SEO/a11y alt for the <Image>. Defaults to productName; pass an enriched alt (brand + locality). */
  imageAlt?: string;
  productId: number;
  slug?: string;
  mode: ProductImageMode;
  objectPosition?: string;
  scale?: number;
  product?: Product;
  /** Eager-load this image (above-the-fold cards) to speed up LCP. */
  priority?: boolean;
  /** Image-frame background. 'dark' = the GPT card's dark gradient (product pops); 'light' keeps
   *  the previous white surface. */
  surface?: 'light' | 'dark';
}

export function PackCardImage({
  imageSrc,
  productName,
  imageAlt,
  productId,
  slug,
  mode,
  objectPosition = 'center center',
  scale = 1,
  product,
  priority = false,
  surface = 'light',
}: PackCardImageProps) {
  const [hasError, setHasError] = useState(false);
  const productHref = product ? buildProductUrlPath(product) : `/shop/${encodeURIComponent(slug || String(productId))}`;

  const isContain = mode === 'contain';
  const isDark = surface === 'dark';

  // Geometry comes from the shared source of truth so ProductCardSkeleton reserves an identical
  // box — see util/productCardFrame.ts. Never inline these dimensions again.
  //
  // Background is WHITE to match the card body (ProductCard root is bg-white). It used to be
  // gray-50 while the body was white, drawing a visible two-tone seam across every card in light
  // mode. One surface, no seam.
  const wrapperClasses = cn(
    'relative w-full flex-shrink-0 overflow-hidden rounded-t-2xl',
    // 'dark' = the GPT card's diagonal charcoal gradient so packshots pop; 'light' = white.
    isDark
      ? 'bg-gradient-to-br from-[#1b1f2a] to-[#0e1118]'
      : 'bg-white dark:bg-gray-900',
    productImageFrame(mode)
  );

  const imageClasses = cn(
    'transition-transform duration-300 ease-out',
    isContain
      ? 'object-contain object-center [@media(hover:hover)]:group-hover:scale-[1.04]'
      : 'object-cover [@media(hover:hover)]:group-hover:scale-[1.06]'
  );

  return (
    <div className={wrapperClasses}>
      <LinkWithLoading
        href={productHref}
        className="absolute inset-0 block"
        aria-label={`Voir ${productName}`}
        loadingMessage="Chargement"
      >
        {imageSrc && !hasError ? (
          // The padded box: `absolute inset-[9%]` for contain gives the packshot real, uniform
          // breathing room. This is a POSITIONED, SIZED element, so the Image `fill` (which sets
          // inline `inset:0`) fills THIS inset box — the old approach put padding on the link and
          // it was silently ignored, because fill's containing block was the padding box, so the
          // packshot went edge-to-edge. Cover mode fills the whole frame (inset-0).
          <span className={cn('absolute block', isContain ? 'inset-[9%]' : 'inset-0')}>
            <Image
              src={imageSrc}
              alt={imageAlt || productName}
              fill
              className={imageClasses}
              style={{
                objectPosition: isContain ? 'center center' : objectPosition,
                transform: !isContain && scale > 1 ? `scale(${scale})` : undefined,
              }}
              {...(priority ? { priority: true, fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
              sizes="(max-width: 640px) 46vw, (max-width: 768px) 32vw, (max-width: 1024px) 26vw, (max-width: 1280px) 20vw, 16vw"
              quality={75}
              onError={() => setHasError(true)}
            />
          </span>
        ) : (
          <div
            className={cn('size-full flex items-center justify-center', isDark ? 'bg-transparent' : 'bg-white dark:bg-gray-900')}
            aria-hidden="true"
          >
            <ShoppingCart className={cn('h-12 w-12', isDark ? 'text-white/25' : 'text-gray-300 dark:text-gray-600')} />
          </div>
        )}
      </LinkWithLoading>
    </div>
  );
}
