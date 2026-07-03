import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { shopApi } from '../services/api';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, phone: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User> & { password?: string }) => Promise<boolean>;
  loadSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadSession: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        // Verify token with Laravel /user profile endpoint
        const res = await shopApi.get('/profil', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        set({
          token,
          user: res.data,
          isAuthenticated: true,
          error: null,
        });
      } else {
        set({ token: null, user: null, isAuthenticated: false });
      }
    } catch (e) {
      // Token is expired or invalid
      await SecureStore.deleteItemAsync('authToken');
      set({ token: null, user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await shopApi.post('/login', { email, password });
      const { token, name, id } = res.data;
      
      await SecureStore.setItemAsync('authToken', token);
      
      const user = { id, name, email, phone: null }; // Phone resolved in profile load
      
      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Load full user details
      get().loadSession();
      return true;
    } catch (e: any) {
      const message = e.response?.data?.message || 'Login failed, check credentials.';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  register: async (name, phone, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await shopApi.post('/register', {
        name,
        phone,
        email,
        password,
      });
      const { token, id } = res.data;
      
      await SecureStore.setItemAsync('authToken', token);
      
      const user = { id, name, email, phone };
      
      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return true;
    } catch (e: any) {
      const message = e.response?.data?.message || 'Registration failed, verify your input.';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await SecureStore.deleteItemAsync('authToken');
    } catch (e) {
      console.error('Failed to clear secure token', e);
    }
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await shopApi.post('/update_profile', data);
      
      set({
        user: {
          id: res.data.id,
          name: res.data.name,
          email: res.data.email,
          phone: res.data.phone,
        },
        isLoading: false,
      });
      return true;
    } catch (e: any) {
      const message = e.response?.data?.message || 'Failed to update profile details.';
      set({ error: message, isLoading: false });
      return false;
    }
  },
}));
