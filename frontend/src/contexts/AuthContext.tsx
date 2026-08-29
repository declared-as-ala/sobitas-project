'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { login as apiLogin, register as apiRegister, loginWithGoogle as apiLoginWithGoogle, getProfile, updateProfile as apiUpdateProfile, getClientOrders, getOrderDetail, normalizeClientOrdersPayload } from '@/services/api';
import type { User, LoginRequest, RegisterRequest, Order, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  /** Sign in (or sign up, first time) with a Google ID token from GoogleSignInButton. */
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User> & { password?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  orders: Order[];
  ordersLoading: boolean;
  ordersError: string | null;
  fetchOrders: () => Promise<void>;
  getOrderDetails: (id: number) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const isFetchingOrdersRef = useRef(false);

  const clearStoredSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const establishSession = async (token: string, seed: Partial<User>) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(seed));

    try {
      const profile = await getProfile();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (error) {
      clearStoredSession();
      throw error;
    }
  };

  // Load user from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify token by fetching profile
          refreshProfile().catch(() => {
            // Token invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          });
        } catch (error) {
          console.error('Error loading user from localStorage:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await apiLogin(credentials);
      
      await establishSession(response.token, {
        id: response.id,
        name: response.name,
        email: credentials.email,
      });
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Connexion impossible. Réessayez.');
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await apiRegister(data);
      
      await establishSession(response.token, {
        id: response.id,
        name: response.name,
        email: data.email,
        phone: data.phone,
      });
      return response;
    } catch (error: any) {
      const firstValidationError = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .find((message) => typeof message === 'string');
      throw new Error(firstValidationError || error.response?.data?.message || 'Inscription impossible. Réessayez.');
    }
  };

  /**
   * Google sign-in. Deliberately the SAME shape as login()/register() from here on: the API
   * returns the same {token, id, name} envelope, so everything downstream — the stored session,
   * the profile fetch, the order history — is one code path rather than a parallel one.
   *
   * The profile fetch is what fills in the fields Google cannot give us (phone, addresses,
   * loyalty balance), which is why it is not optional here either.
   */
  const loginWithGoogle = async (credential: string) => {
    try {
      const response = await apiLoginWithGoogle(credential);
      await establishSession(response.token, { id: response.id, name: response.name });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Connexion Google impossible');
    }
  };

  const logout = () => {
    clearStoredSession();
    setOrders([]);
    setOrdersError(null);
    setOrdersLoading(false);
  };

  const refreshProfile = async () => {
    try {
      // getProfile() maps points_balance + points_value_dt onto the User, so the whole
      // profile (including the loyalty balance) is carried onto useAuth().user here.
      const profile = await getProfile();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User> & { password?: string }) => {
    try {
      const updated = await apiUpdateProfile(data);
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Update failed');
    }
  };

  const fetchOrders = useCallback(async () => {
    // Check if user is authenticated
    if (!user) {
      return;
    }

    // Prevent multiple simultaneous calls
    if (isFetchingOrdersRef.current) {
      return;
    }

    try {
      isFetchingOrdersRef.current = true;
      setOrdersLoading(true);
      setOrdersError(null);
      const userOrders = await getClientOrders();
      setOrders(Array.isArray(userOrders) ? userOrders : normalizeClientOrdersPayload(userOrders));
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setOrders([]);
      if (error.response?.status === 429) {
        console.warn('Rate limit reached. Please wait before retrying.');
        setOrdersError('Trop de requêtes. Patientez un instant puis réessayez.');
      } else {
        setOrdersError('Impossible de charger vos commandes. Réessayez plus tard.');
      }
    } finally {
      isFetchingOrdersRef.current = false;
      setOrdersLoading(false);
    }
  }, [user]);

  const getOrderDetails = useCallback(async (id: number) => {
    try {
      const details = await getOrderDetail(id);
      return details;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        updateProfile,
        refreshProfile,
        orders,
        ordersLoading,
        ordersError,
        fetchOrders,
        getOrderDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
