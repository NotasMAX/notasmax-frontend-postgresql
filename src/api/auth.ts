import { apiClient } from './client';

export interface AuthenticatedUser {
  readonly id: string;
  readonly displayName: string;
  readonly profile: string;
}

export const ADMINISTRATOR_PROFILE = 'administrador';

export function isAdministratorProfile(profile: string): boolean {
  return profile === ADMINISTRATOR_PROFILE;
}

export function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    user.id.length > 0 &&
    typeof user.displayName === 'string' &&
    typeof user.profile === 'string' &&
    user.profile.length > 0
  );
}

function userFromResponse(value: unknown): AuthenticatedUser {
  if (typeof value !== 'object' || value === null || !('user' in value)) {
    throw new Error('A API retornou uma resposta de sessão inválida.');
  }

  const user = value.user;
  if (!isAuthenticatedUser(user)) {
    throw new Error('A API retornou uma resposta de sessão inválida.');
  }

  return user;
}

export async function createSession(email: string, password: string): Promise<AuthenticatedUser> {
  const response = await apiClient.post<unknown>('/api/v1/auth/sessions', { email, password });
  return userFromResponse(response.data);
}

export async function getCurrentSession(): Promise<AuthenticatedUser> {
  const response = await apiClient.get<unknown>('/api/v1/auth/me');
  return userFromResponse(response.data);
}

export async function endCurrentSession(): Promise<void> {
  await apiClient.delete('/api/v1/auth/sessions/current');
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post('/api/v1/auth/password-reset-requests', { email });
}

export async function completePasswordReset(token: string, password: string): Promise<void> {
  await apiClient.post('/api/v1/auth/password-resets', { token, password });
}

export async function activateAccount(token: string, password: string): Promise<void> {
  await apiClient.post('/api/v1/auth/activations', { token, password });
}
