'use client';

import Image from 'next/image';
import { getStorageUrl } from '@/services/api';
import { motion } from 'motion/react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  fullScreen = false,
  message 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };

  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-white dark:bg-gray-950'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          className={sizeClasses[size]}
        >
          <Image
            src={getStorageUrl('coordonnees/September2023/OXC3oL0LreP3RCsgR3k6.webp')}
            alt="Loading"
            width={size === 'sm' ? 32 : size === 'md' ? 64 : 96}
            height={size === 'sm' ? 32 : size === 'md' ? 64 : 96}
            className={`${sizeClasses[size]} w-auto h-auto object-contain`}
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </motion.div>
        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
