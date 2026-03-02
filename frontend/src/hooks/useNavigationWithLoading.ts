'use client';

import { useRouter } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';
import { useCallback } from 'react';

export function useNavigationWithLoading() {
  const router = useRouter();
  const { setLoading, setLoadingMessage } = useLoading();

  const navigate = useCallback(
    async (path: string, message?: string) => {
      setLoadingMessage(message || 'Chargement...');
      setLoading(true);
      
      try {
        // Prefetch for faster navigation
        router.prefetch(path);
        // Navigate
        router.push(path);
        // Note: We don't set loading to false here because Next.js navigation
        // completes asynchronously. The loading will be cleared by the router events
        // or when the new page mounts.
      } catch (error) {
        console.error('Navigation error:', error);
        setLoading(false);
        throw error;
      }
    },
    [router, setLoading, setLoadingMessage]
  );

  return { navigate };
}
