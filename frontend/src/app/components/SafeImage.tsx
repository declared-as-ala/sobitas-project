'use client';

import { useState, useEffect, useCallback } from 'react';
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
const RETRY_DELAY = 1000; // 1 second

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
  const [retryCount, setRetryCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when src changes
  useEffect(() => {
    setImageSrc(src);
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      // Retry with cache busting
      const retrySrc = imageSrc.includes('?')
        ? `${imageSrc.split('?')[0]}?retry=${Date.now()}`
        : `${imageSrc}?retry=${Date.now()}`;
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageSrc(retrySrc);
        setIsLoading(true);
      }, RETRY_DELAY);
    } else {
      // Max retries reached, use fallback
      setIsLoading(false);
      setHasError(true);
      if (onError) onError();
    }
  }, [imageSrc, retryCount, onError]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad();
  }, [onLoad]);

  // Use fallback if error occurred
  const finalSrc = hasError 
    ? (fallbackSrc || DEFAULT_FALLBACK)
    : imageSrc;

  // Don't render until mounted to avoid hydration mismatch
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
    <div className={`relative ${fill ? 'w-full h-full' : ''} ${className}`}>
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
        </div>
      )}

      {/* Error fallback */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {fallbackSrc ? (
            <Image
              src={fallbackSrc}
              alt={alt}
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

      {/* Actual image */}
      {!hasError && (
        <Image
          src={finalSrc}
          alt={alt}
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
