import { AxiosError, type AxiosAdapter } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import { subscribeToAuthenticationRequired } from './problemDetails';

const noContentAdapter: AxiosAdapter = async (config) => ({
  data: undefined,
  status: 204,
  statusText: 'No Content',
  headers: {},
  config,
});

function unauthorizedAdapter(code: string): AxiosAdapter {
  return async (config) => {
    throw new AxiosError('Request failed', AxiosError.ERR_BAD_REQUEST, config, undefined, {
      data: {
        type: 'about:blank',
        title: 'Autenticação necessária',
        status: 401,
        detail: 'Entre novamente para continuar.',
        code,
      },
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'content-type': 'application/problem+json' },
      config,
    });
  };
}

describe('apiClient', () => {
  it('sends cookies and the required header on mutations only', async () => {
    expect(apiClient.defaults.withCredentials).toBe(true);

    const mutation = await apiClient.post(
      '/api/v1/auth/sessions',
      {},
      { adapter: noContentAdapter },
    );
    const read = await apiClient.get('/api/v1/auth/me', { adapter: noContentAdapter });

    expect(mutation.config.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(read.config.headers.get('X-Requested-With')).toBeUndefined();
  });

  it('notifies session observers only for the authentication-required problem code', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAuthenticationRequired(listener);

    try {
      await expect(
        apiClient.get('/api/v1/auth/me', {
          adapter: unauthorizedAdapter('AUTHENTICATION_REQUIRED'),
        }),
      ).rejects.toMatchObject({
        status: 401,
        problem: { code: 'AUTHENTICATION_REQUIRED' },
      });
      expect(listener).toHaveBeenCalledTimes(1);

      await expect(
        apiClient.post(
          '/api/v1/auth/sessions',
          {},
          {
            adapter: unauthorizedAdapter('AUTHENTICATION_FAILED'),
          },
        ),
      ).rejects.toMatchObject({
        status: 401,
        problem: { code: 'AUTHENTICATION_FAILED' },
      });
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });
});
