'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { login as apiLogin, register as apiRegister, getProfile, updateProfile as apiUpdateProfile, getClientOrders, getOrderDetail } from '@/services/api';
import type { User, LoginRequest, RegisterRequest, Order } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User> & { password?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  orders: Order[];
  fetchOrders: () => Promise<void>;
  getOrderDetails: (id: number) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const isFetchingOrdersRef = useRef(false);

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
      
      // Store token and user info
      localStorage.setItem('token', response.token);
      const userData: User = {
        id: response.id,
        name: response.name,
        email: credentials.email,
      };
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Fetch full profile
      const profile = await getProfile();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await apiRegister(data);
      
      // Store token and user info
      localStorage.setItem('token', response.token);
      const userData: User = {
        id: response.id,
        name: response.name,
        email: data.email,
        phone: data.phone,
      };
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Fetch full profile
      const profile = await getProfile();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setOrders([]);
  };

  const refreshProfile = async () => {
    try {
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
      const userOrders = await getClientOrders();
      setOrders(userOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      // Don't throw error for 429 (rate limit) - just log it silently
      if (error.response?.status === 429) {
        console.warn('Rate limit reached. Please wait before retrying.');
      }
    } finally {
      isFetchingOrdersRef.current = false;
    }
  }, [user]);

  const getOrderDetails = async (id: number) => {
    try {
      const details = await getOrderDetail(id);
      return details;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshProfile,
        orders,
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
