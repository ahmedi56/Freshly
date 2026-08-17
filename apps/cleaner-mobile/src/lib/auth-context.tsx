import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore, ApiError } from './api';
import type { User } from '@freshly/shared-types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const accessToken = await tokenStore.getAccess();
      if (!accessToken) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await api.get<{ user: User }>('/auth/me');
        if (!cancelled) setUser(data.user);
      } catch (e) {
        if (e instanceof ApiError) await tokenStore.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string, u: User) => {
    tokenStore.set(accessToken, refreshToken);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = await tokenStore.getRefresh();
    api.post('/auth/logout', refreshToken ? { refreshToken } : undefined).catch(() => {});
    await tokenStore.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
