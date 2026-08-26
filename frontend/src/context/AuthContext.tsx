'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, clearTokens, getAccessToken, setTokens } from '@/lib/api-client';

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  companyId: string | null;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerRetail: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<void>;
  registerB2b: (data: Record<string, string>) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await apiClient.get('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    const cartSessionId = localStorage.getItem('pc_cart_session');
    if (cartSessionId) {
      await apiClient.post('/cart/merge', { sessionId: cartSessionId }).catch(() => undefined);
    }
  }, []);

  const registerRetail = useCallback(
    async (data: { email: string; password: string; fullName: string; phone?: string }) => {
      const { data: result } = await apiClient.post('/auth/register', data);
      setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
    },
    [],
  );

  const registerB2b = useCallback(async (data: Record<string, string>) => {
    const { data: result } = await apiClient.post('/auth/register/b2b', data);
    setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
    return { message: result.message as string };
  }, []);

  const logout = useCallback(async () => {
    await apiClient.post('/auth/logout').catch(() => undefined);
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, registerRetail, registerB2b, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
