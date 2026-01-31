'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AddressData } from '@/types';

interface AddressDataContextType {
  addressData: AddressData[];
  loading: boolean;
  error: Error | null;
}

const AddressDataContext = createContext<AddressDataContextType>({
  addressData: [],
  loading: true,
  error: null,
});

// Cache for address data to avoid reloading
let addressDataCache: AddressData[] | null = null;
let loadingPromise: Promise<AddressData[]> | null = null;

export function AddressDataProvider({ children }: { children: ReactNode }) {
  const [addressData, setAddressData] = useState<AddressData[]>(addressDataCache || []);
  const [loading, setLoading] = useState(!addressDataCache);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If we already have cached data, don't reload
    if (addressDataCache) {
      setAddressData(addressDataCache);
      setLoading(false);
      return;
    }

    // If there's already a loading promise, wait for it
    if (loadingPromise) {
      loadingPromise
        .then((data) => {
          addressDataCache = data;
          setAddressData(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err);
          setLoading(false);
        });
      return;
    }

    // Load address data from JSON file
    loadingPromise = fetch('/data.json')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load address data');
        return response.json();
      })
      .then((data) => {
        addressDataCache = data;
        loadingPromise = null;
        return data;
      })
      .catch((err) => {
        loadingPromise = null;
        throw err;
      });

    loadingPromise
      .then((data) => {
        setAddressData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading address data:', err);
        setError(err);
        setLoading(false);
      });
  }, []);

  return (
    <AddressDataContext.Provider value={{ addressData, loading, error }}>
      {children}
    </AddressDataContext.Provider>
  );
}

export function useAddressData() {
  const context = useContext(AddressDataContext);
  if (!context) {
    throw new Error('useAddressData must be used within AddressDataProvider');
  }
  return context;
}
