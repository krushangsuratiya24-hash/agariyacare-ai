import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authService } from '../services/userService';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    phone?: string;
    language_pref?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      clearError: () => set({ error: null }),
      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.login(email, password);
          if (!res.success || !res.data) throw new Error(res.error || 'Login failed');
          set({ user: res.data.user, token: res.data.token, isLoading: false });
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { error?: string } }; message?: string })
            ?.response?.data?.error || (err as Error)?.message || 'Login failed';
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.signup(data);
          if (!res.success || !res.data) throw new Error(res.error || 'Registration failed');
          set({ user: res.data.user, token: res.data.token, isLoading: false });
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { error?: string } }; message?: string })
            ?.response?.data?.error || (err as Error)?.message || 'Registration failed';
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Clear locally even if server fails
        }
        set({ user: null, token: null });
      },

      initialize: async () => {
        if (get().isInitialized) return;
        try {
          const res = await authService.getMe();
          if (res.success && res.data?.user) {
            set({ user: res.data.user, isInitialized: true });
          } else {
            set({ user: null, token: null, isInitialized: true });
          }
        } catch {
          set({ user: null, token: null, isInitialized: true });
        }
      },
    }),
    {
      name: 'agariyacare_auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
