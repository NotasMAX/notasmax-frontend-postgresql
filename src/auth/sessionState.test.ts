import { describe, expect, it } from 'vitest';
import {
  ApiRequestError,
  publishAuthenticationRequired,
  subscribeToAuthenticationRequired,
} from '../api/problemDetails';
import {
  initialSessionState,
  isAuthenticationRequiredError,
  sessionReducer,
  sessionStateForUser,
} from './sessionState';

const administrator = { id: 'user-1', displayName: 'Ana Silva', profile: 'administrador' };

describe('session state', () => {
  it('moves through loading, administrator, anonymous, expired, and unavailable states', () => {
    expect(initialSessionState).toEqual({ status: 'loading' });
    expect(sessionReducer(initialSessionState, { type: 'loaded', user: administrator })).toEqual({
      status: 'authenticated',
      user: administrator,
    });
    expect(sessionReducer(initialSessionState, { type: 'anonymous' })).toEqual({
      status: 'anonymous',
    });
    expect(sessionReducer(initialSessionState, { type: 'expired' })).toEqual({
      status: 'anonymous',
      reason: 'expired',
    });
    expect(sessionReducer(initialSessionState, { type: 'unavailable' })).toEqual({
      status: 'unavailable',
    });
  });

  it('does not grant the administrative shell to another profile', () => {
    expect(sessionStateForUser({ ...administrator, profile: 'aluno' })).toEqual({
      status: 'forbidden',
    });
  });

  it('distinguishes expired sessions from failed login credentials', () => {
    expect(
      isAuthenticationRequiredError(
        new ApiRequestError({
          status: 401,
          problem: { status: 401, code: 'AUTHENTICATION_REQUIRED' },
        }),
      ),
    ).toBe(true);
    expect(
      isAuthenticationRequiredError(
        new ApiRequestError({
          status: 401,
          problem: { status: 401, code: 'AUTHENTICATION_FAILED' },
        }),
      ),
    ).toBe(false);
  });

  it('moves an authenticated session to expiry through the shared response signal', () => {
    let state = sessionReducer(initialSessionState, { type: 'loaded', user: administrator });
    const unsubscribe = subscribeToAuthenticationRequired(() => {
      state = sessionReducer(state, { type: 'expired' });
    });

    try {
      publishAuthenticationRequired(
        new ApiRequestError({
          status: 401,
          problem: { status: 401, code: 'AUTHENTICATION_REQUIRED' },
        }),
      );
    } finally {
      unsubscribe();
    }

    expect(state).toEqual({ status: 'anonymous', reason: 'expired' });
  });
});
