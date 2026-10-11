import { describe, expect, it } from 'vitest';
import {
  MAXIMUM_PASSWORD_LENGTH,
  MINIMUM_PASSWORD_LENGTH,
  validateNewPassword,
} from './passwordPolicy';

describe('validateNewPassword', () => {
  it('accepts the documented minimum length and Unicode and spaces', () => {
    const password = 'Senha longa 🔐';
    const paddedPassword = password.padEnd(MINIMUM_PASSWORD_LENGTH, ' ');

    expect(paddedPassword.length).toBe(MINIMUM_PASSWORD_LENGTH);
    expect(validateNewPassword(paddedPassword, paddedPassword)).toBeNull();
  });

  it('rejects passwords that are too short, too long, or do not match', () => {
    expect(validateNewPassword('curta', 'curta')).toBe('password-too-short');
    expect(
      validateNewPassword(
        'x'.repeat(MAXIMUM_PASSWORD_LENGTH + 1),
        'x'.repeat(MAXIMUM_PASSWORD_LENGTH + 1),
      ),
    ).toBe('password-too-long');
    expect(
      validateNewPassword('a'.repeat(MINIMUM_PASSWORD_LENGTH), 'b'.repeat(MINIMUM_PASSWORD_LENGTH)),
    ).toBe('password-mismatch');
  });
});
