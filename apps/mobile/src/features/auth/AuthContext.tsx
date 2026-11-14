import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResult, LoginInput, Me, SignupInput } from '@campus/shared';
import { api, refreshSession, setSessionLostHandler } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { loadRefreshToken, saveRefreshToken, setAccessToken } from '@/lib/tokens';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: Me };

type AuthContextValue = AuthState & {
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: SignupInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Replaces the cached user after a profile or onboarding change. */
  setUser: (user: Me) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  const startSession = useCallback(async (result: AuthResult) => {
    setAccessToken(result.accessToken);
    await saveRefreshToken(result.refreshToken);
    setState({ status: 'signedIn', user: result.user });
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    queryClient.clear();
    setState({ status: 'signedOut', user: null });
  }, []);

  // On launch: if a refresh token is stored, trade it for a session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (await refreshSession()) {
          const user = await api.get<Me>('/users/me');
          if (!cancelled) setState({ status: 'signedIn', user });
          return;
        }
      } catch {
        // Fall through to signed out.
      }
      if (!cancelled) setState({ status: 'signedOut', user: null });
    })();
    setSessionLostHandler(clearSession);
    return () => {
      cancelled = true;
      setSessionLostHandler(null);
    };
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn: async (input) => startSession(await api.post<AuthResult>('/auth/login', input, false)),
      signUp: async (input) => startSession(await api.post<AuthResult>('/auth/signup', input, false)),
      signOut: async () => {
        const refreshToken = await loadRefreshToken();
        // Best effort: the local session ends even if the server cannot be reached.
        if (refreshToken) await api.postVoid('/auth/logout', { refreshToken }, false).catch(() => undefined);
        await saveRefreshToken(null);
        clearSession();
      },
      setUser: (user) => setState({ status: 'signedIn', user }),
    }),
    [state, startSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/** The signed-in user. Only call on screens behind the signed-in guard. */
export function useMe(): Me {
  const { user } = useAuth();
  if (!user) throw new Error('useMe used while signed out');
  return user;
}
