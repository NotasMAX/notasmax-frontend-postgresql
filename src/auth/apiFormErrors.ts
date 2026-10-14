import {
  getApiProblemPresentation,
  mapAuthProblemSource,
  type AuthProblemField,
} from '../api/problemDetails';

export type AuthVisibleField = Exclude<AuthProblemField, 'token'>;

export interface AuthFormErrors {
  readonly messages: readonly string[];
  readonly fields: Readonly<Record<AuthVisibleField, readonly string[]>>;
}

export function getAuthFormErrors(
  error: unknown,
  visibleFields: readonly AuthVisibleField[],
): AuthFormErrors {
  const presentation = getApiProblemPresentation(error);
  const fields: Record<AuthVisibleField, string[]> = { email: [], password: [] };
  const messages = presentation.message === undefined ? [] : [presentation.message];

  for (const fieldError of presentation.fieldErrors) {
    const field = mapAuthProblemSource(fieldError.source);
    if (field !== undefined && field !== 'token' && visibleFields.includes(field)) {
      fields[field].push(fieldError.detail);
    } else {
      messages.push(fieldError.detail);
    }
  }

  return { messages, fields };
}

export function hasAuthFormErrors(errors: AuthFormErrors): boolean {
  return (
    errors.messages.length > 0 ||
    errors.fields.email.length > 0 ||
    errors.fields.password.length > 0
  );
}
