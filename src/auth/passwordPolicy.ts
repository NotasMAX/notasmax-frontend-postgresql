export const MINIMUM_PASSWORD_LENGTH = 15;
export const MAXIMUM_PASSWORD_LENGTH = 1024;

export type PasswordValidationError =
  'password-too-short' | 'password-too-long' | 'password-mismatch';

export function validateNewPassword(
  password: string,
  confirmation: string,
): PasswordValidationError | null {
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return 'password-too-short';
  }

  if (password.length > MAXIMUM_PASSWORD_LENGTH) {
    return 'password-too-long';
  }

  if (password !== confirmation) {
    return 'password-mismatch';
  }

  return null;
}
