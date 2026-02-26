import { create } from 'zustand';
import { api, setToken, getToken } from '../lib/api';
import type { User, AuthResponse } from '../lib/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { org_name: string; first_name: string; last_name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!getToken(),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email, password });
      setToken(res.token);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Login failed' });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<AuthResponse>('/auth/register', data);
      setToken(res.token);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Registration failed' });
      throw err;
    }
  },

  logout: () => {
    setToken(null);
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    if (!getToken()) {
      set({ isAuthenticated: false });
      return;
    }
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      set({ user: res.user, isAuthenticated: true });
    } catch {
      setToken(null);
      set({ user: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
