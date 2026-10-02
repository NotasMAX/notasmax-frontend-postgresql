import axios from 'axios';

export interface ApiProblemDetails {
  readonly type?: string;
  readonly status?: number;
  readonly code?: string;
  readonly errors?: readonly unknown[];
}

interface ApiRequestErrorOptions {
  readonly status?: number;
  readonly problem?: ApiProblemDetails;
}

export class ApiRequestError extends Error {
  readonly status: number | undefined;
  readonly problem: ApiProblemDetails | undefined;

  constructor({ status, problem }: ApiRequestErrorOptions) {
    super(
      status === undefined
        ? 'Não foi possível conectar à API. Tente novamente mais tarde.'
        : 'Não foi possível concluir a solicitação. Tente novamente mais tarde.',
    );
    this.name = 'ApiRequestError';
    this.status = status;
    this.problem = problem;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readProblemDetails(
  value: unknown,
  responseStatus?: number,
): ApiProblemDetails | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const type = typeof value.type === 'string' ? value.type : undefined;
  const status = typeof value.status === 'number' ? value.status : responseStatus;
  const code = typeof value.code === 'string' ? value.code : undefined;
  const errors = Array.isArray(value.errors) ? value.errors : undefined;

  if (type === undefined && status === undefined && code === undefined && errors === undefined) {
    return undefined;
  }

  return { type, status, code, errors };
}

export function toApiRequestError(error: unknown): ApiRequestError {
  if (!axios.isAxiosError(error)) {
    return new ApiRequestError({});
  }

  const responseStatus = error.response?.status;
  return new ApiRequestError({
    status: responseStatus,
    problem: readProblemDetails(error.response?.data, responseStatus),
  });
}
