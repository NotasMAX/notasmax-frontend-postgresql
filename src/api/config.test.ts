import { describe, expect, it } from 'vitest';
import { getApiBaseUrl } from './config';

describe('getApiBaseUrl', () => {
  it('trims whitespace from a configured absolute base URL', () => {
    expect(getApiBaseUrl('  https://api.example.test  ')).toBe('https://api.example.test');
  });

  it('returns an empty base URL when no value is configured', () => {
    expect(getApiBaseUrl(undefined)).toBe('');
    expect(getApiBaseUrl('   ')).toBe('');
  });

  it('accepts a relative path on the same origin', () => {
    expect(getApiBaseUrl('/api')).toBe('/api');
    expect(getApiBaseUrl('/api', true)).toBe('/api');
  });

  it('rejects unsupported schemes and protocol-relative URLs', () => {
    expect(() => getApiBaseUrl('javascript:alert(1)')).toThrow('VITE_API_BASE_URL');
    expect(() => getApiBaseUrl('//external.example.test/api')).toThrow('VITE_API_BASE_URL');
    expect(() => getApiBaseUrl('https:\\\\external.example.test')).toThrow('VITE_API_BASE_URL');
  });

  it('rejects credentials embedded in the URL', () => {
    expect(() => getApiBaseUrl('https://user:password@api.example.test')).toThrow(
      'VITE_API_BASE_URL não deve conter credenciais.',
    );
  });

  it('requires HTTPS for absolute URLs in production', () => {
    expect(() => getApiBaseUrl('http://api.example.test', true)).toThrow(
      'VITE_API_BASE_URL deve usar HTTPS em produção.',
    );
    expect(getApiBaseUrl('https://api.example.test', true)).toBe('https://api.example.test');
  });
});
