'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthResponse } from '@/types';
import api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    // Revoke the token server-side (blacklist jti) — fire and forget
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore: even if the request fails, clear local session
    }
    localStorage.removeItem('accessToken');
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('accessToken');
    if (!stored) {
      setIsLoading(false);
      return;
    }
    setToken(stored);
    api
      .get<User>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => logout())
      .finally(() => setIsLoading(false));
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    const { accessToken, user: u } = res.data;
    localStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    setUser(u);
  };

  const refreshUser = useCallback(async () => {
    const res = await api.get<User>('/auth/me');
    setUser(res.data);
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser, isAdmin, isManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
