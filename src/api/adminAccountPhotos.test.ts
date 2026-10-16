// @vitest-environment node
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { accountPhotoUrl, uploadAccountPhoto } from './adminAccountPhotos';
import { apiClient } from './client';

describe('administrative account photo API boundary', () => {
  it('sends the photo as multipart form data to the account photo endpoint', async () => {
    let request: InternalAxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = async (config) => {
      request = config;
      return { data: undefined, status: 204, statusText: 'No Content', headers: {}, config };
    };
    const photo = new File(['synthetic'], 'foto.png', { type: 'image/png' });
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = adapter;
    try {
      await uploadAccountPhoto('7/8', photo);
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }

    expect(request?.method).toBe('put');
    expect(request?.url).toBe('/api/v1/admin/users/7%2F8/photo');
    expect(request?.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(request?.data).toBeInstanceOf(FormData);
    expect((request?.data as FormData).get('photo')).toBe(photo);
  });

  it('builds a versioned image URL so replaced photos are not served from cache', () => {
    const url = accountPhotoUrl('55', '2026-10-16T12:00:00.000Z');

    expect(url).toMatch(/\/api\/v1\/admin\/users\/55\/photo\?v=/);
    expect(new URL(url, 'http://localhost').searchParams.get('v')).toBe('2026-10-16T12:00:00.000Z');
  });
});
