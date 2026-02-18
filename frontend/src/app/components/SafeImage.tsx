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
  onLoad,
  onError,
}: SafeImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Use refs to avoid stale closures in timeout callbacks
  const retryCountRef = useRef(0);
  const originalSrcRef = useRef(src);
  const mountedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Reset state when src changes (e.g. pagination or different article)
  useEffect(() => {
    originalSrcRef.current = src;
    retryCountRef.current = 0;
    setImageSrc(src);
    setIsLoading(true);
    setHasError(false);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, [src]);

  const handleError = useCallback(() => {
    if (!mountedRef.current) return;

    const currentRetry = retryCountRef.current;
    if (currentRetry < MAX_RETRIES) {
      retryCountRef.current = currentRetry + 1;
      const delay = RETRY_DELAY_MS * (currentRetry + 1); // increasing backoff

      // Retry: keep the original URL (including ?v=timestamp cache buster)
      // and append a &retry= param to bust browser-level image caching.
      const base = originalSrcRef.current;
      const separator = base.includes('?') ? '&' : '?';
      const retryUrl = `${base}${separator}retry=${Date.now()}`;

      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
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
  }, [onError]); // no dependency on imageSrc/retryCount → uses refs

  const handleLoad = useCallback(() => {
    if (mountedRef.current) {
      setIsLoading(false);
      setHasError(false);
      onLoad?.();
    }
  }, [onLoad]);

  // Determine the image to show
  const finalSrc = hasError ? (fallbackSrc || DEFAULT_FALLBACK) : imageSrc;

  // Don't render next/image until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div
        className={`bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`}
        style={fill ? undefined : { width, height }}
      >
        {fill ? null : <div className="w-full h-full" />}
      </div>
    );
  }

  return (
    <div className={`relative ${fill ? 'w-full h-full' : ''}`}>
      {/* Loading skeleton */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center z-10">
          <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10">
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
              <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Image non disponible</p>
            </div>
          )}
        </div>
      )}

      {/* Actual image (always rendered so onLoad/onError fire) */}
      {!hasError && (
        <Image
          src={finalSrc}
          alt={alt}
          title={alt}
          fill={fill}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          className={`object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } ${className}`}
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          unoptimized
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}
