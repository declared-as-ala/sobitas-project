'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { isStorageImageUrl } from '@/services/api';
import { cn } from '@/app/components/ui/utils';
import type { ProductImageMode } from '@/util/productImagePresentation';

interface PackCardImageProps {
  imageSrc: string;
  productName: string;
  productId: number;
  slug?: string;
  mode: ProductImageMode;
  objectPosition?: string;
  scale?: number;
}

export function PackCardImage({
  imageSrc,
  productName,
  productId,
  slug,
  mode,
  objectPosition = 'center center',
  scale = 1,
}: PackCardImageProps) {
  const [hasError, setHasError] = useState(false);
  const productHref = `/shop/${encodeURIComponent(slug || String(productId))}`;

  const isContain = mode === 'contain';

  const wrapperClasses = cn(
    'relative w-full flex-shrink-0 overflow-hidden rounded-t-xl lg:rounded-t-2xl',
    isContain
      ? // Wider/shorter frame than a tall fixed box → much less top/bottom letterboxing for landscape pack shots while keeping object-contain.
        'aspect-[3/2] w-full bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900/90'
      : 'h-[220px] sm:h-[240px] lg:h-[260px] xl:h-[280px] bg-gray-100 dark:bg-gray-800'
  );

  const imageClasses = cn(
    'transition-transform duration-300 ease-out will-change-transform',
    isContain
      ? 'object-contain object-center [@media(hover:hover)]:group-hover:scale-[1.04]'
      : 'object-cover [@media(hover:hover)]:group-hover:scale-[1.06]'
  );

  return (
    <div className={wrapperClasses}>
      <LinkWithLoading
        href={productHref}
        className={cn(
          'relative size-full',
          isContain ? 'flex items-center justify-center p-2 sm:p-3' : 'block'
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
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            quality={85}
            unoptimized={isStorageImageUrl(imageSrc)}
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

      {isContain && imageSrc && !hasError && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_55%,rgba(0,0,0,0.04)_100%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_55%,rgba(0,0,0,0.12)_100%)]" />
      )}
    </div>
  );
}
