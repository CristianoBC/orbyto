'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { getHomeRoute, hasPermission } from '@/lib/permissions';
import type { AuthUser, LoginResponse, PermissionModule, RolePermission } from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  permissions: RolePermission[];
  can(module: PermissionModule, action?: 'view' | 'create' | 'edit' | 'delete' | 'manage'): boolean;
  login(email: string, password: string): Promise<string | null>;
  passwordChanged(): Promise<string | null>;
  refreshUser(): Promise<AuthUser>;
  homeRoute: string | null;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) { setLoading(false); return; }
    setUser(authStorage.getUser());
    apiRequest<{ user: AuthUser }>('/auth/me')
      .then(async ({ user: current }) => {
        setUser(current); authStorage.save(token, current);
        if (!current.mustChangePassword) setPermissions(await apiRequest<RolePermission[]>('/permissions/me'));
      })
      .catch(() => { authStorage.clear(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST', body: { email, password }, authenticated: false,
    });
    authStorage.save(result.accessToken, result.user);
    setUser(result.user);
    if (result.user.mustChangePassword) { setPermissions([]); return '/change-password'; }
    const currentPermissions = await apiRequest<RolePermission[]>('/permissions/me');
    setPermissions(currentPermissions);
    return getHomeRoute(result.user.role, currentPermissions);
  }, []);

  const passwordChanged = useCallback(async () => {
    const token = authStorage.getToken();
    if (!token) return null;
    const [{ user: current }, currentPermissions] = await Promise.all([apiRequest<{ user: AuthUser }>('/auth/me'), apiRequest<RolePermission[]>('/permissions/me')]);
    authStorage.save(token, current); setUser(current); setPermissions(currentPermissions);
    return getHomeRoute(current.role, currentPermissions);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = authStorage.getToken();
    const current = await apiRequest<AuthUser>('/users/me');
    if (token) authStorage.save(token, current);
    setUser(current);
    return current;
  }, []);

  const logout = useCallback(() => { authStorage.clear(); setUser(null); setPermissions([]); window.location.assign('/login'); }, []);
  const can = useCallback((module: PermissionModule, action: 'view' | 'create' | 'edit' | 'delete' | 'manage' = 'view') => {
    const field = { view: 'canView', create: 'canCreate', edit: 'canEdit', delete: 'canDelete', manage: 'canManage' } as const;
    if (user?.role === 'OWNER') return true;
    if (action === 'view') return hasPermission(user?.role, permissions, module);
    return Boolean(permissions.find((item) => item.module === module)?.[field[action]]);
  }, [permissions, user?.role]);
  const homeRoute = user ? (user.mustChangePassword ? '/change-password' : getHomeRoute(user.role, permissions)) : null;
  const value = useMemo(() => ({ user, loading, permissions, can, login, passwordChanged, refreshUser, logout, homeRoute }), [user, loading, permissions, can, login, passwordChanged, refreshUser, logout, homeRoute]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
