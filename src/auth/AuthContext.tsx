import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import { subscribeToAuthenticationRequired } from '../api/problemDetails';
import {
  createSession,
  endCurrentSession,
  getCurrentSession,
  isAdministratorProfile,
  activateAccount,
  completePasswordReset,
  requestPasswordReset,
  type AuthenticatedUser,
} from '../api/auth';
import {
  initialSessionState,
  isAuthenticationRequiredError,
  sessionReducer,
  type SessionState,
} from './sessionState';

type SessionLookupResult = 'authenticated' | 'anonymous' | 'forbidden' | 'unavailable' | 'stale';

interface AuthContextValue {
  readonly state: SessionState;
  activateAccount(token: string, password: string): Promise<void>;
  completePasswordReset(token: string, password: string): Promise<void>;
  login(email: string, password: string): Promise<boolean>;
  logout(): Promise<'ended' | 'expired'>;
  requestPasswordReset(email: string): Promise<void>;
  retrySessionLookup(): Promise<SessionLookupResult>;
  revalidateSessionAfterPasswordReset(): Promise<SessionLookupResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const sessionLookupGeneration = useRef(0);

  useEffect(() => {
    let active = true;
    const requestGeneration = sessionLookupGeneration.current;

    getCurrentSession()
      .then((user) => {
        if (active && requestGeneration === sessionLookupGeneration.current) {
          dispatch({ type: 'loaded', user });
        }
      })
      .catch((error: unknown) => {
        if (active && requestGeneration === sessionLookupGeneration.current) {
          dispatch({ type: isAuthenticationRequiredError(error) ? 'anonymous' : 'unavailable' });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    return subscribeToAuthenticationRequired(() => {
      sessionLookupGeneration.current += 1;
      dispatch({ type: 'expired' });
    });
  }, [state.status]);

  const lookupSession = useCallback(
    async (hadAuthenticatedSession: boolean): Promise<SessionLookupResult> => {
      const requestGeneration = ++sessionLookupGeneration.current;
      dispatch({ type: 'loading' });
      try {
        const user = await getCurrentSession();
        if (requestGeneration !== sessionLookupGeneration.current) {
          return 'stale';
        }
        dispatch({ type: 'loaded', user });
        return isAdministratorProfile(user.profile) ? 'authenticated' : 'forbidden';
      } catch (error) {
        if (isAuthenticationRequiredError(error)) {
          if (requestGeneration === sessionLookupGeneration.current) {
            dispatch({ type: hadAuthenticatedSession ? 'expired' : 'anonymous' });
          }
          return 'anonymous';
        }
        if (requestGeneration === sessionLookupGeneration.current) {
          dispatch({ type: 'unavailable' });
          return 'unavailable';
        }
        return 'stale';
      }
    },
    [],
  );

  const retrySessionLookup = useCallback(
    () => lookupSession(state.status === 'authenticated'),
    [lookupSession, state.status],
  );

  const revalidateSessionAfterPasswordReset = useCallback(
    () => lookupSession(state.status === 'authenticated'),
    [lookupSession, state.status],
  );

  const login = useCallback(async (email: string, password: string) => {
    const user: AuthenticatedUser = await createSession(email, password);
    sessionLookupGeneration.current += 1;

    if (!isAdministratorProfile(user.profile)) {
      dispatch({ type: 'forbidden' });
      try {
        await endCurrentSession();
      } catch {
        // The administrative route stays closed even if cleanup cannot reach the API.
      }
      return false;
    }

    dispatch({ type: 'loaded', user });
    return true;
  }, []);

  const logout = useCallback(async (): Promise<'ended' | 'expired'> => {
    sessionLookupGeneration.current += 1;
    try {
      await endCurrentSession();
      dispatch({ type: 'anonymous' });
      return 'ended';
    } catch (error) {
      if (isAuthenticationRequiredError(error)) {
        return 'expired';
      }

      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      state,
      activateAccount,
      completePasswordReset,
      login,
      logout,
      revalidateSessionAfterPasswordReset,
      requestPasswordReset,
      retrySessionLookup,
    }),
    [state, login, logout, revalidateSessionAfterPasswordReset, retrySessionLookup],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return context;
}
