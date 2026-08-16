'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { AuthUser, LoginResponse } from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) { setLoading(false); return; }
    setUser(authStorage.getUser());
    apiRequest<{ user: AuthUser }>('/auth/me')
      .then(({ user: current }) => { setUser(current); authStorage.save(token, current); })
      .catch(() => { authStorage.clear(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST', body: { email, password }, authenticated: false,
    });
    authStorage.save(result.accessToken, result.user);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => { authStorage.clear(); setUser(null); window.location.assign('/login'); }, []);
  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
