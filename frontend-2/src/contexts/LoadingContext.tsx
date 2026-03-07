'use client';

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Minimum display time to avoid flicker on fast navigations
const MIN_LOADING_TIME = 300;

function clearMessageTimeout(ref: React.MutableRefObject<NodeJS.Timeout | null>) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Chargement...');
  const loadingStartTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearMessageTimeout(messageTimeoutRef);
    };
  }, []);

  const setLoading = (loading: boolean) => {
    if (loading) {
      loadingStartTimeRef.current = Date.now();
      setIsLoading(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      clearMessageTimeout(messageTimeoutRef);
    } else {
      const elapsed = loadingStartTimeRef.current 
        ? Date.now() - loadingStartTimeRef.current 
        : 0;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsed);

      if (remainingTime > 0) {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          setIsLoading(false);
          loadingStartTimeRef.current = null;
          clearMessageTimeout(messageTimeoutRef);
          messageTimeoutRef.current = setTimeout(() => {
            messageTimeoutRef.current = null;
            setLoadingMessage('Chargement...');
          }, 300);
        }, remainingTime);
      } else {
        setIsLoading(false);
        loadingStartTimeRef.current = null;
        clearMessageTimeout(messageTimeoutRef);
        messageTimeoutRef.current = setTimeout(() => {
          messageTimeoutRef.current = null;
          setLoadingMessage('Chargement...');
        }, 300);
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
