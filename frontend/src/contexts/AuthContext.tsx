import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PublicUser } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  currentUser: PublicUser | null;
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
  worker: { email: 'worker@test.local', password: 'worker123' },
  buyer: { email: 'buyer@test.local', password: 'buyer123' },
  coordinator: { email: 'coordinator@test.local', password: 'coord123' },
  admin: { email: 'admin@test.local', password: 'admin123' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('agariyacare_token');
    if (token) {
      loadUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function loadUser() {
    setIsLoading(true);
    try {
      const resp = await authApi.me();
      if (resp.success && resp.data) {
        setCurrentUser(resp.data);
      } else {
        localStorage.removeItem('agariyacare_token');
        setCurrentUser(null);
      }
    } catch {
      localStorage.removeItem('agariyacare_token');
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const resp = await authApi.login(email, password);
    if (!resp.success || !resp.data) {
      throw new Error(resp.error || 'Login failed');
    }
    const { token, user } = resp.data;
    localStorage.setItem('agariyacare_token', token);
    setCurrentUser(user);
  }

  async function loginAsDemo(role: 'worker' | 'buyer' | 'coordinator' | 'admin') {
    const creds = DEMO_CREDENTIALS[role];
    await login(creds.email, creds.password);
  }

  async function signup(data: { email: string; password: string; name: string; role?: string; phone?: string }) {
    const resp = await authApi.signup(data);
    if (!resp.success || !resp.data) {
      throw new Error(resp.error || 'Signup failed');
    }
    const { token, user } = resp.data;
    localStorage.setItem('agariyacare_token', token);
    setCurrentUser(user);
  }

  function logout() {
    localStorage.removeItem('agariyacare_token');
    setCurrentUser(null);
  }

  async function refreshUser() {
    await loadUser();
  }

  return (
    <AuthContext.Provider value={{
      currentUser,
      isLoading,
      isAuthenticated: !!currentUser,
      login,
      loginAsDemo,
      signup,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
