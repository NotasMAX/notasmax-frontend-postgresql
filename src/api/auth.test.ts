import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import {
  activateAccount,
  completePasswordReset,
  createSession,
  endCurrentSession,
  getCurrentSession,
  isAdministratorProfile,
  requestPasswordReset,
} from './auth';

describe('auth API boundary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the documented login and current-session contracts', async () => {
    const user = { id: 'user-1', displayName: 'Ana Silva', profile: 'administrador' };
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { user } } as never);
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { user } } as never);

    await expect(createSession('ana@example.test', 'secret')).resolves.toEqual(user);
    await expect(getCurrentSession()).resolves.toEqual(user);

    expect(post).toHaveBeenCalledWith('/api/v1/auth/sessions', {
      email: 'ana@example.test',
      password: 'secret',
    });
    expect(get).toHaveBeenCalledWith('/api/v1/auth/me');
  });

  it('uses the documented logout and account lifecycle paths and payloads', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: undefined } as never);
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: undefined } as never);

    await requestPasswordReset('ana@example.test');
    await completePasswordReset('reset-token', 'a new password');
    await activateAccount('activation-token', 'another new password');
    await endCurrentSession();

    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/auth/password-reset-requests', {
      email: 'ana@example.test',
    });
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/auth/password-resets', {
      token: 'reset-token',
      password: 'a new password',
    });
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/auth/activations', {
      token: 'activation-token',
      password: 'another new password',
    });
    expect(remove).toHaveBeenCalledWith('/api/v1/auth/sessions/current');
  });

  it('recognizes only the API administrator profile value', () => {
    expect(isAdministratorProfile('administrador')).toBe(true);
    expect(isAdministratorProfile('aluno')).toBe(false);
    expect(isAdministratorProfile('ADMINISTRATOR')).toBe(false);
  });
});
