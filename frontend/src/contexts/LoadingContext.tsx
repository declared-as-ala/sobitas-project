'use client';

import { createContext, useContext, useState, useRef, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Minimum display time to avoid flicker on fast navigations
const MIN_LOADING_TIME = 300;

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Chargement...');
  const loadingStartTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setLoading = (loading: boolean) => {
    if (loading) {
      loadingStartTimeRef.current = Date.now();
      setIsLoading(true);
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      const elapsed = loadingStartTimeRef.current 
        ? Date.now() - loadingStartTimeRef.current 
        : 0;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsed);

      if (remainingTime > 0) {
        // Wait for minimum display time
        timeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          loadingStartTimeRef.current = null;
          // Clear message after a short delay
          setTimeout(() => setLoadingMessage('Chargement...'), 300);
        }, remainingTime);
      } else {
        // Already shown for minimum time, hide immediately
        setIsLoading(false);
        loadingStartTimeRef.current = null;
        setTimeout(() => setLoadingMessage('Chargement...'), 300);
      }
    }
  };

  const updateLoadingMessage = (message: string) => {
    setLoadingMessage(message);
  };

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        setLoading,
        loadingMessage,
        setLoadingMessage: updateLoadingMessage,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
