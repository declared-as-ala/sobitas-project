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
}: PackCardImageProps) {
  const [hasError, setHasError] = useState(false);
  const productHref = product ? buildProductUrlPath(product) : `/shop/${encodeURIComponent(slug || String(productId))}`;

  const isContain = mode === 'contain';

  // Geometry comes from the shared source of truth so ProductCardSkeleton reserves an identical
  // box — see util/productCardFrame.ts. Never inline these dimensions again.
  const wrapperClasses = cn(
    'relative w-full flex-shrink-0 overflow-hidden rounded-t-xl lg:rounded-t-2xl',
    'bg-gray-50 dark:bg-gray-900',
    productImageFrame(mode)
  );

  const imageClasses = cn(
    'transition-transform duration-300 ease-out',
    isContain
      ? 'object-contain object-center [@media(hover:hover)]:group-hover:scale-[1.02]'
      : 'object-cover [@media(hover:hover)]:group-hover:scale-[1.06]'
  );

  return (
    <div className={wrapperClasses}>
      <LinkWithLoading
        href={productHref}
        className={cn(
          'relative size-full',
          isContain ? 'flex items-center justify-center p-2.5 sm:p-3 md:p-3.5' : 'block'
        )}
        aria-label={`Voir ${productName}`}
        loadingMessage="Chargement"
      >
        {imageSrc && !hasError ? (
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
        ) : (
          <div
            className="size-full flex items-center justify-center bg-gray-200/60 dark:bg-gray-700/60"
            aria-hidden="true"
          >
            <ShoppingCart className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </LinkWithLoading>
    </div>
  );
}
