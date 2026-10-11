import { apiClient } from './client';

export interface AuthenticatedUser {
  readonly id: string;
  readonly displayName: string;
  readonly profile: string;
}

interface AuthResponse {
  readonly user: AuthenticatedUser;
}

export const ADMINISTRATOR_PROFILE = 'administrador';

export function isAdministratorProfile(profile: string): boolean {
  return profile === ADMINISTRATOR_PROFILE;
}

export async function createSession(email: string, password: string): Promise<AuthenticatedUser> {
  const response = await apiClient.post<AuthResponse>('/api/v1/auth/sessions', { email, password });
  return response.data.user;
}

export async function getCurrentSession(): Promise<AuthenticatedUser> {
  const response = await apiClient.get<AuthResponse>('/api/v1/auth/me');
  return response.data.user;
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
