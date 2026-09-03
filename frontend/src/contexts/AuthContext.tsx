'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { login as apiLogin, register as apiRegister, loginWithGoogle as apiLoginWithGoogle, getProfile, updateProfile as apiUpdateProfile, getClientOrders, getOrderDetail, normalizeClientOrdersPayload } from '@/services/api';
import type { User, LoginRequest, RegisterRequest, Order, AuthResponse } from '@/types';
import type { PhoneVerificationResult } from '@/services/api';

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
  applyPhoneVerification: (result: PhoneVerificationResult) => void;
  applyEmailVerification: () => void;
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

  // Use the committed server response immediately: a later GET failure must not
  // leave the account showing its pre-verification balance or a missing badge.
  const applyPhoneVerification = (result: PhoneVerificationResult) => {
    setUser(current => {
      if (!current) return current;
      const updated = { ...current, phone: result.phone, phone_verified: result.phone_verified,
        contact_verified: result.phone_verified || !!current.email_verified,
        points_balance: result.points_balance, points_value_dt: result.points_value_dt,
        welcome_bonus_status: result.bonus_status,
        welcome_bonus_awarded: result.bonus_status === 'awarded',
        welcome_bonus_eligible: ['phone_required', 'claimable'].includes(result.bonus_status) };
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch { /* In-memory state is sufficient. */ }
      return updated;
    });
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

  const applyEmailVerification = () => {
    setUser(current => {
      if (!current) return current;
      const updated = { ...current, email_verified: true, contact_verified: true };
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch { /* Keep confirmed in-memory state. */ }
      return updated;
    });
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
        applyPhoneVerification,
        applyEmailVerification,
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
