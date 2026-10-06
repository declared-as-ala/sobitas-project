'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackSrc?: string;
  placeholder?: 'blur' | 'empty';
  /** Disable retries for dense listings where a fast branded fallback is preferable. */
  retryOnError?: boolean;
  /**
   * Serve `src` as is, not through /_next/image. For an image whose URL is declared elsewhere
   * (og:image, the image sitemap, JSON-LD) and must be the SAME URL in the <img>: the optimizer
   * rewrites it to /_next/image?url=…, a second URL for the same picture.
   */
  unoptimized?: boolean;
  /**
   * The <img src> attribute only (next/image `overrideSrc`): the srcset keeps the optimizer's
   * resized AVIF/WebP candidates, while `src` stays the URL declared elsewhere (og:image, sitemap,
   * JSON-LD). Prefer it to `unoptimized` for a large image a phone would otherwise download whole.
   */
  overrideSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const DEFAULT_FALLBACK = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vbiBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

export function SafeImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className = '',
  sizes,
  priority = false,
  fallbackSrc,
  placeholder = 'empty',
  retryOnError = true,
  unoptimized = false,
  overrideSrc,
  onLoad,
  onError,
}: SafeImageProps) {
  /*
   * Rendered on the SERVER, not only after hydration (05/10/2026). This used to return a skeleton
   * <div> until a `mounted` effect ran, so no SafeImage ever reached the HTML: measured as Googlebot,
   * /blog served 0 of 136 covers as <img> and no article page served its cover — Google Images had
   * nothing to index and the hand-written `alt_cover` text was never sent.
   *
   * Initial state comes from props only, so the server render and the first client render are
   * identical and hydration has nothing to reconcile.
   */
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Use refs to avoid stale closures in timeout callbacks
  const retryCountRef = useRef(0);
  const originalSrcRef = useRef(src);
  /*
   * "Unmounted", not "mounted": the <img> is now in the server HTML, so the browser can finish
   * loading it BEFORE React hydrates. next/image replays that load from its ref callback (and
   * re-fires an early error via `img.src = img.src`) during the hydration commit, which can run
   * before this component's passive effects. A `mounted` flag set in an effect would drop that
   * replayed load and leave the cover at opacity-0 behind the skeleton for good.
   */
  const unmountedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Reset state when src changes (e.g. pagination or different article). Skipped on mount: the
  // initial state already matches `src`, and resetting here would clobber a load that next/image
  // replayed during hydration (see unmountedRef).
  useEffect(() => {
    if (originalSrcRef.current === src) return;
    originalSrcRef.current = src;
    retryCountRef.current = 0;
    setImageSrc(src);
    setIsLoading(true);
    setHasError(false);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, [src]);

  const handleError = useCallback(() => {
    if (unmountedRef.current) return;

    const currentRetry = retryCountRef.current;
    if (retryOnError && currentRetry < MAX_RETRIES) {
      retryCountRef.current = currentRetry + 1;
      const delay = RETRY_DELAY_MS * (currentRetry + 1); // increasing backoff

      // Retry: keep the original URL and append a retry= param to bust browser-level image caching.
      const base = originalSrcRef.current;
      const separator = base.includes('?') ? '&' : '?';
      const retryUrl = `${base}${separator}retry=${Date.now()}`;

      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current) {
          setImageSrc(retryUrl);
          setIsLoading(true);
        }
      }, delay);
    } else {
      // All retries exhausted — show fallback
      setIsLoading(false);
      setHasError(true);
      onError?.();
    }
  }, [onError, retryOnError]); // no dependency on imageSrc/retryCount → uses refs

  const handleLoad = useCallback(() => {
    if (unmountedRef.current) return;
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  // Determine the image to show
  const finalSrc = hasError ? (fallbackSrc || DEFAULT_FALLBACK) : imageSrc;

  return (
    <div className={`relative ${fill ? 'w-full h-full' : ''}`}>
      {/*
        Loading placeholder, painted BEHIND the image (earlier sibling, no z-index) rather than over
        it. The image used to sit at opacity-0 under a z-10 skeleton until React's onLoad fired, which
        was harmless while the image only existed after hydration. Now that it is in the server HTML,
        that gate would hide it from anything that reads the page without running the load handler —
        a no-JS visitor, and a renderer that does not fetch images — and hold the article cover's LCP
        until hydration. An <img> that has not loaded paints nothing, so the placeholder shows through
        until the pixels arrive and is dropped on load.
      */}
      {isLoading && !hasError && (
        <div aria-hidden="true" className="absolute inset-0 bg-sunken animate-pulse flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-ink-3" />
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-sunken flex items-center justify-center z-10">
          {fallbackSrc ? (
            <Image
              src={fallbackSrc}
              alt={alt}
              title={alt}
              fill={fill}
              width={fill ? undefined : width}
              height={fill ? undefined : height}
              className="object-cover"
              sizes={sizes}
              unoptimized
            />
          ) : (
            <div className="text-center p-4">
              <ImageIcon className="w-12 h-12 text-ink-3 mx-auto mb-2" />
              <p className="text-xs text-ink-3">Image non disponible</p>
            </div>
          )}
        </div>
      )}

      {/* Actual image (always rendered so onLoad/onError fire). `relative` only without `fill`:
          next/image positions a fill image absolutely itself, and a static <img> would otherwise
          paint under the absolutely positioned placeholder. */}
      {!hasError && (
        <Image
          src={finalSrc}
          alt={alt}
          title={alt}
          fill={fill}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          className={`object-cover ${fill ? '' : 'relative'} ${className}`}
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          unoptimized={unoptimized || (typeof finalSrc === 'string' && finalSrc.startsWith('data:'))}
          overrideSrc={overrideSrc}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}
