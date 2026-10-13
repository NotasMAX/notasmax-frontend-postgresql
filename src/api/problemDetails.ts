import axios from 'axios';

export type ApiProblemSource =
  | { readonly in: 'body'; readonly pointer: string }
  | { readonly in: 'path' | 'query'; readonly name: string };

export interface ApiProblemFieldError {
  readonly code: string;
  readonly detail: string;
  readonly source: ApiProblemSource;
}

export interface ApiProblemDetails {
  readonly type?: string;
  readonly title?: string;
  readonly status: number;
  readonly detail?: string;
  readonly code?: string;
  readonly previousEnrollmentId?: string;
  readonly errors?: readonly ApiProblemFieldError[];
}

export interface ApiProblemPresentation {
  readonly message: string | undefined;
  readonly fieldErrors: readonly ApiProblemFieldError[];
}

interface ApiRequestErrorOptions {
  readonly status?: number;
  readonly problem?: ApiProblemDetails;
}

export const GENERIC_API_ERROR_MESSAGE =
  'Não foi possível concluir a solicitação. Tente novamente mais tarde.';

export class ApiRequestError extends Error {
  readonly status: number | undefined;
  readonly problem: ApiProblemDetails | undefined;

  constructor({ status, problem }: ApiRequestErrorOptions) {
    super(
      status === undefined
        ? 'Não foi possível concluir a ação agora. Tente novamente em instantes.'
        : GENERIC_API_ERROR_MESSAGE,
    );
    this.name = 'ApiRequestError';
    this.status = status;
    this.problem = problem;
  }
}

type AuthenticationRequiredListener = () => void;

const authenticationRequiredListeners = new Set<AuthenticationRequiredListener>();
const problemMediaType = 'application/problem+json';
const problemCodePattern = /^[A-Z][A-Z0-9_]{0,63}$/;
const credentialAssignmentPattern =
  /\b(?:token|password|senha|secret|credential|authorization|api[_ -]?key)\b\s*[:=]\s*\S+/i;
const jwtPattern = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/;
const opaqueTokenPattern = /(?:^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{32,}(?:$|[^A-Za-z0-9_-])/;

export function isAuthenticationRequiredError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    error.status === 401 &&
    error.problem?.code === 'AUTHENTICATION_REQUIRED'
  );
}

export function subscribeToAuthenticationRequired(
  listener: AuthenticationRequiredListener,
): () => void {
  authenticationRequiredListeners.add(listener);
  return () => authenticationRequiredListeners.delete(listener);
}

export function publishAuthenticationRequired(error: unknown): void {
  if (!isAuthenticationRequiredError(error)) {
    return;
  }

  for (const listener of authenticationRequiredListeners) {
    listener();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function hasInvalidControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (
      code <= 0x08 ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0x7f
    ) {
      return true;
    }
  }
  return false;
}

function isWellFormedPublicString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && !hasInvalidControlCharacter(value);
}

function isSafePublicText(value: unknown): value is string {
  return (
    isWellFormedPublicString(value) &&
    !credentialAssignmentPattern.test(value) &&
    !jwtPattern.test(value) &&
    !opaqueTokenPattern.test(value)
  );
}

function isUriReference(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value === '' ||
    hasInvalidControlCharacter(value) ||
    /[\s<>"{}|\\^`]/.test(value) ||
    /%(?![A-Fa-f0-9]{2})/.test(value)
  ) {
    return false;
  }

  try {
    new URL(value, 'https://notasmax.invalid/');
    return true;
  } catch {
    return false;
  }
}

function isValidProblemCode(value: unknown): value is string {
  return typeof value === 'string' && problemCodePattern.test(value);
}

function readContentType(headers: unknown): string | undefined {
  if (!isRecord(headers)) {
    return undefined;
  }

  const get = headers.get;
  if (typeof get === 'function') {
    try {
      const value: unknown = get.call(headers, 'content-type');
      if (typeof value === 'string') {
        return value;
      }
    } catch {
      return undefined;
    }
  }

  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'content-type' && typeof value === 'string') {
      return value;
    }
  }

  return undefined;
}

function isProblemMediaType(headers: unknown): boolean {
  const contentType = readContentType(headers);
  if (contentType === undefined) {
    return false;
  }

  return contentType.split(';', 1)[0]?.trim().toLowerCase() === problemMediaType;
}

function isHealthCheckRequest(url: unknown, baseUrl: unknown): boolean {
  if (typeof url !== 'string') {
    return false;
  }

  try {
    const base = typeof baseUrl === 'string' ? baseUrl : 'https://notasmax.invalid/';
    const pathname = new URL(url, base).pathname.replace(/\/+$/, '');
    return /(?:^|\/)(?:api\/)?v1\/health$/i.test(pathname);
  } catch {
    return false;
  }
}

function isJsonPointer(value: string): boolean {
  return /^(?:\/(?:[^~/]|~[01])*)*$/.test(value);
}

function readProblemSource(value: unknown): ApiProblemSource | undefined {
  if (!isRecord(value) || typeof value.in !== 'string') {
    return undefined;
  }

  if (value.in === 'body') {
    if (
      !hasOnlyKeys(value, ['in', 'pointer']) ||
      typeof value.pointer !== 'string' ||
      !isJsonPointer(value.pointer)
    ) {
      return undefined;
    }
    return { in: 'body', pointer: value.pointer };
  }

  if (value.in === 'path' || value.in === 'query') {
    if (!hasOnlyKeys(value, ['in', 'name']) || !isSafePublicText(value.name)) {
      return undefined;
    }
    return { in: value.in, name: value.name };
  }

  return undefined;
}

function readFieldErrors(value: unknown): readonly ApiProblemFieldError[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const errors: ApiProblemFieldError[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasOnlyKeys(candidate, ['code', 'detail', 'source']) ||
      !isValidProblemCode(candidate.code) ||
      !isSafePublicText(candidate.detail)
    ) {
      return undefined;
    }

    const source = readProblemSource(candidate.source);
    if (source === undefined) {
      return undefined;
    }

    errors.push({ code: candidate.code, detail: candidate.detail, source });
  }

  return errors;
}

function readProblemDetails(
  value: unknown,
  responseStatus: number | undefined,
  headers: unknown,
): ApiProblemDetails | undefined {
  if (!isProblemMediaType(headers) || !isRecord(value)) {
    return undefined;
  }

  if (
    !isUriReference(value.type) ||
    !isWellFormedPublicString(value.title) ||
    !Number.isInteger(value.status) ||
    typeof value.status !== 'number' ||
    value.status < 100 ||
    value.status > 599 ||
    responseStatus === undefined ||
    value.status !== responseStatus
  ) {
    return undefined;
  }

  if (Object.hasOwn(value, 'detail') && !isWellFormedPublicString(value.detail)) {
    return undefined;
  }

  const errors = Object.hasOwn(value, 'errors') ? readFieldErrors(value.errors) : undefined;
  if (Object.hasOwn(value, 'errors') && errors === undefined) {
    return undefined;
  }

  const code = isValidProblemCode(value.code) ? value.code : undefined;
  const previousEnrollmentId =
    typeof value.previousEnrollmentId === 'string' &&
    /^[1-9]\d{0,18}$/.test(value.previousEnrollmentId)
      ? value.previousEnrollmentId
      : undefined;
  return {
    type: value.type,
    title: isSafePublicText(value.title) ? value.title : undefined,
    status: value.status,
    detail: isSafePublicText(value.detail) ? value.detail : undefined,
    code,
    previousEnrollmentId,
    errors,
  };
}

function isSafeForThisRequest(text: string, sensitiveValues: readonly string[]): boolean {
  const comparableText = text.toLocaleLowerCase();
  return sensitiveValues.every((value) => {
    const comparableValue = value.trim().toLocaleLowerCase();
    return comparableValue === '' || !comparableText.includes(comparableValue);
  });
}

export function getApiProblemPresentation(
  error: unknown,
  sensitiveValues: readonly string[] = [],
): ApiProblemPresentation {
  if (!(error instanceof ApiRequestError) || error.problem === undefined) {
    return { message: undefined, fieldErrors: [] };
  }

  const { problem } = error;
  const detail = isSafePublicText(problem.detail) ? problem.detail : undefined;
  const title = isSafePublicText(problem.title) ? problem.title : undefined;
  const message =
    detail !== undefined && isSafeForThisRequest(detail, sensitiveValues)
      ? detail
      : title !== undefined && isSafeForThisRequest(title, sensitiveValues)
        ? title
        : undefined;
  const fieldErrors = (Array.isArray(problem.errors) ? problem.errors : []).flatMap((candidate) => {
    if (
      !isRecord(candidate) ||
      !hasOnlyKeys(candidate, ['code', 'detail', 'source']) ||
      !isValidProblemCode(candidate.code) ||
      !isSafePublicText(candidate.detail) ||
      !isSafeForThisRequest(candidate.detail, sensitiveValues)
    ) {
      return [];
    }

    const source = readProblemSource(candidate.source);
    return source === undefined ? [] : [{ code: candidate.code, detail: candidate.detail, source }];
  });

  return { message, fieldErrors };
}

export type AuthProblemField = 'email' | 'password' | 'token';

export function mapAuthProblemSource(source: ApiProblemSource): AuthProblemField | undefined {
  if (source.in !== 'body') {
    return undefined;
  }

  switch (source.pointer) {
    case '/email':
      return 'email';
    case '/password':
      return 'password';
    case '/token':
      return 'token';
    default:
      return undefined;
  }
}

export function toApiRequestError(error: unknown): ApiRequestError {
  if (!axios.isAxiosError(error)) {
    return new ApiRequestError({});
  }

  const responseStatus = error.response?.status;
  const problem = isHealthCheckRequest(error.config?.url, error.config?.baseURL)
    ? undefined
    : readProblemDetails(error.response?.data, responseStatus, error.response?.headers);
  return new ApiRequestError({
    status: responseStatus,
    problem,
  });
}
