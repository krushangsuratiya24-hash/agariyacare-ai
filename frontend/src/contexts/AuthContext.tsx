/**
 * AuthContext — Phase 6 compatibility shim
 *
 * Delegates to useAuthStore (Zustand) so that pages using either
 * useAuth() or useAuthStore() see the same authentication state.
 * AuthProvider is kept for backward compat but is a no-op wrapper.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthStore } from '../context/authStore';
import { User } from '../types';

// PublicUser is an alias for User — the frontend doesn't store password hashes
export type PublicUser = User;

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsDemo: (role: 'worker' | 'buyer' | 'coordinator' | 'admin') => Promise<void>;
  signup: (data: { email: string; password: string; name: string; role?: string; phone?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_CREDENTIALS: Record<string, { email: string; password: string }> = {
  worker:      { email: 'worker@test.local',      password: 'worker123' },
  buyer:       { email: 'buyer@test.local',        password: 'buyer123'  },
  coordinator: { email: 'coordinator@test.local',  password: 'coord123'  },
  admin:       { email: 'admin@test.local',        password: 'admin123'  },
};

/** No-op wrapper — kept for backward compatibility. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Bridge hook — reads from Zustand store. */
export function useAuth(): AuthContextType {
  const store = useAuthStore();

  const login = async (email: string, password: string) => {
    await store.login(email, password);
  };

  const loginAsDemo = async (role: 'worker' | 'buyer' | 'coordinator' | 'admin') => {
    const creds = DEMO_CREDENTIALS[role];
    await store.login(creds.email, creds.password);
  };

  const signup = async (data: {
    email: string;
    password: string;
    name: string;
    role?: string;
    phone?: string;
  }) => {
    await store.signup({
      email: data.email,
      password: data.password,
      full_name: data.name,
      role: data.role ?? 'AGARIYA_WORKER',
      phone: data.phone,
    });
  };

  const logout = () => { store.logout(); };

  const refreshUser = async () => { await store.initialize(); };

  return {
    currentUser: store.user,
    isLoading: store.isLoading,
    isAuthenticated: !!store.user,
    login,
    loginAsDemo,
    signup,
    logout,
    refreshUser,
  };
}
