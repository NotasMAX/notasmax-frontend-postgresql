import { describe, expect, it } from 'vitest';
import { isAllowedApiRequestTarget, isMutatingMethod } from './requestPolicy';

describe('API request policy', () => {
  it('allows relative and absolute calls only at the configured API origin', () => {
    expect(
      isAllowedApiRequestTarget(
        '/api/v1/auth/me',
        'https://api.example.test/v1',
        'https://api.example.test/v1',
        'https://web.example.test',
      ),
    ).toBe(true);
    expect(
      isAllowedApiRequestTarget(
        'https://api.example.test/api/v1/auth/me',
        'https://api.example.test/v1',
        'https://api.example.test/v1',
        'https://web.example.test',
      ),
    ).toBe(true);
  });

  it('rejects absolute, protocol-relative, malformed, and non-HTTP targets outside the API origin', () => {
    expect(
      isAllowedApiRequestTarget(
        'https://attacker.example.test/collect',
        'https://api.example.test',
        'https://api.example.test',
        'https://web.example.test',
      ),
    ).toBe(false);
    expect(
      isAllowedApiRequestTarget('//attacker.example.test/collect', '', '', 'http://localhost:5173'),
    ).toBe(false);
    expect(isAllowedApiRequestTarget('javascript:alert(1)', '', '', 'http://localhost:5173')).toBe(
      false,
    );
  });

  it('identifies state-changing methods for the required request header', () => {
    expect(isMutatingMethod('POST')).toBe(true);
    expect(isMutatingMethod('delete')).toBe(true);
    expect(isMutatingMethod('GET')).toBe(false);
    expect(isMutatingMethod('OPTIONS')).toBe(false);
  });
});
