'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';

import { cn } from '@/app/components/ui/utils';
import type { ProductImageMode } from '@/util/productImagePresentation';
import { buildProductUrlPath } from '@/util/productUrl';
import type { Product } from '@/types';

interface PackCardImageProps {
  imageSrc: string;
  productName: string;
  productId: number;
  slug?: string;
  mode: ProductImageMode;
  objectPosition?: string;
  scale?: number;
  product?: Product;
}

export function PackCardImage({
  imageSrc,
  productName,
  productId,
  slug,
  mode,
  objectPosition = 'center center',
  scale = 1,
  product,
}: PackCardImageProps) {
  const [hasError, setHasError] = useState(false);
  const productHref = product ? buildProductUrlPath(product) : `/shop/${encodeURIComponent(slug || String(productId))}`;

  const isContain = mode === 'contain';

  const wrapperClasses = cn(
    'relative w-full flex-shrink-0 overflow-hidden rounded-t-xl lg:rounded-t-2xl',
    isContain
      ? // Fixed frame + object-contain: full packshot visible; taller on narrow 2-col grids, wider on sm+.
        'aspect-[4/5] sm:aspect-[3/2] w-full bg-gradient-to-b from-gray-50 via-gray-50/95 to-white dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900/90'
      : 'h-[220px] sm:h-[240px] lg:h-[260px] xl:h-[280px] bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900/80'
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
            alt={productName}
            fill
            className={imageClasses}
            style={{
              objectPosition: isContain ? 'center center' : objectPosition,
              transform: !isContain && scale > 1 ? `scale(${scale})` : undefined,
            }}
            loading="lazy"
            sizes="(max-width: 640px) 46vw, (max-width: 768px) 32vw, (max-width: 1024px) 26vw, (max-width: 1280px) 20vw, 16vw"
            quality={85}
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

      {imageSrc && !hasError && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0',
            isContain
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_55%,rgba(0,0,0,0.04)_100%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_55%,rgba(0,0,0,0.12)_100%)]'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.03)_100%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.1)_100%)]'
          )}
        />
      )}
    </div>
  );
}
