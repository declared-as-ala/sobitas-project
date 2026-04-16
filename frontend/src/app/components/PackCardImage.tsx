'use client';

import { useMemo, useState } from 'react';
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

  const wrapperClasses = useMemo(
    () =>
      [
        'relative w-full flex-shrink-0 overflow-hidden rounded-t-xl lg:rounded-t-2xl',
        'h-[220px] sm:h-[240px] lg:h-[260px] xl:h-[280px]',
        'bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700/90',
      ].join(' '),
    []
  );

  const imageClasses = cn(
    'transition-transform duration-500 ease-out will-change-transform',
    mode === 'contain'
      ? 'object-contain p-1.5 sm:p-2.5 lg:p-3.5 [@media(hover:hover)]:group-hover:scale-[1.03]'
      : 'object-cover [@media(hover:hover)]:group-hover:scale-[1.06]'
  );

  return (
    <div className={wrapperClasses}>
      <LinkWithLoading
        href={productHref}
        className="block size-full"
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
              objectPosition,
              transform: scale > 1 ? `scale(${scale})` : undefined,
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

      {mode === 'contain' && imageSrc && !hasError && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0)_20%,rgba(255,255,255,0.45)_100%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(17,24,39,0)_20%,rgba(17,24,39,0.35)_100%)]" />
      )}

      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/70 dark:from-gray-800/65 to-transparent pointer-events-none" />
    </div>
  );
}
