import { sharedContext } from '@/lib/sharedContext';
import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshAccessToken, setAccessToken, setSessionExpiredHandler } from '@/api/client';
import type { Profile } from '@/api/types';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<Profile>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = sharedContext<AuthState | null>('auth', null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const reload = useCallback(async () => {
    const r = await api.get<Profile>('/auth/me');
    setUser(r.data);
  }, []);

  // Restore the session from the refresh cookie on first load
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      qc.clear();
    });
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        try {
          await reload();
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, [qc, reload]);

  const login = useCallback(async (identifier: string, password: string) => {
    const r = await api.post('/auth/login', { identifier, password });
    setAccessToken(r.data.accessToken);
    setUser(r.data.user);
    return r.data.user as Profile;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      qc.clear();
    }
  }, [qc]);

  const value = useMemo(() => ({ user, loading, login, logout, reload }), [user, loading, login, logout, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

/** The signed-in user; only use inside protected routes. */
export function useMe(): Profile {
  const { user } = useAuth();
  if (!user) throw new Error('Not signed in');
  return user;
}
