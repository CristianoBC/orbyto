import type { AuthUser } from '@/types/auth';

const TOKEN_KEY = 'gp_access_token';
const USER_KEY = 'gp_user';

const browser = () => typeof window !== 'undefined';

export const authStorage = {
  getToken: () => (browser() ? localStorage.getItem(TOKEN_KEY) : null),
  getUser: (): AuthUser | null => {
    if (!browser()) return null;
    const value = localStorage.getItem(USER_KEY);
    if (!value) return null;
    try { return JSON.parse(value) as AuthUser; } catch { return null; }
  },
  save: (token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    if (!browser()) return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};
