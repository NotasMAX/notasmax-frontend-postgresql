import { isAdministratorProfile, type AuthenticatedUser } from '../api/auth';

export { isAuthenticationRequiredError } from '../api/problemDetails';

export type SessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'anonymous'; readonly reason?: 'expired' }
  | { readonly status: 'authenticated'; readonly user: AuthenticatedUser }
  | { readonly status: 'forbidden' }
  | { readonly status: 'unavailable' };

export type SessionAction =
  | { readonly type: 'loading' }
  | { readonly type: 'loaded'; readonly user: AuthenticatedUser }
  | { readonly type: 'anonymous' }
  | { readonly type: 'expired' }
  | { readonly type: 'forbidden' }
  | { readonly type: 'unavailable' };

export const initialSessionState: SessionState = { status: 'loading' };

export function sessionStateForUser(user: AuthenticatedUser): SessionState {
  return isAdministratorProfile(user.profile)
    ? { status: 'authenticated', user }
    : { status: 'forbidden' };
}

export function sessionReducer(_state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'loading':
      return { status: 'loading' };
    case 'loaded':
      return sessionStateForUser(action.user);
    case 'anonymous':
      return { status: 'anonymous' };
    case 'expired':
      return { status: 'anonymous', reason: 'expired' };
    case 'forbidden':
      return { status: 'forbidden' };
    case 'unavailable':
      return { status: 'unavailable' };
  }
}
