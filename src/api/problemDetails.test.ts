import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import {
  ApiRequestError,
  GENERIC_API_ERROR_MESSAGE,
  getApiProblemPresentation,
  mapAuthProblemSource,
  toApiRequestError,
} from './problemDetails';

function makeProblem(
  overrides: Record<string, unknown> = {},
  status = 422,
): Record<string, unknown> {
  return {
    type: 'about:blank',
    title: 'Conteúdo não processável',
    status,
    detail: 'O conteúdo enviado não atende aos critérios de validação.',
    ...overrides,
  };
}

function makeAxiosError(
  responseData: unknown,
  status = 422,
  contentType: string | null = 'application/problem+json',
  requestUrl?: string,
): AxiosError {
  const error = new AxiosError('internal database details and stack trace') as AxiosError;
  Object.assign(error, {
    ...(requestUrl === undefined ? {} : { config: { url: requestUrl } }),
    response: {
      data: responseData,
      status,
      headers: contentType === null ? {} : { 'content-type': contentType },
    },
  });
  return error;
}

describe('toApiRequestError', () => {
  it('keeps validated public detail and field errors from an RFC 9457 response', () => {
    const error = toApiRequestError(
      makeAxiosError(
        makeProblem({
          code: 'VALIDATION_ERROR',
          errors: [
            {
              code: 'INVALID_FORMAT',
              detail: 'O formato informado é inválido.',
              source: { in: 'body', pointer: '/email' },
            },
          ],
          privateExtension: 'private stack trace',
        }),
      ),
    );

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.status).toBe(422);
    expect(error.problem).toMatchObject({
      type: 'about:blank',
      title: 'Conteúdo não processável',
      status: 422,
      code: 'VALIDATION_ERROR',
      detail: 'O conteúdo enviado não atende aos critérios de validação.',
      errors: [
        {
          code: 'INVALID_FORMAT',
          detail: 'O formato informado é inválido.',
          source: { in: 'body', pointer: '/email' },
        },
      ],
    });
    expect(error.problem).not.toHaveProperty('privateExtension');
    expect(error.message).toBe(GENERIC_API_ERROR_MESSAGE);
    expect(error.message).not.toContain('Internal database');
  });

  it('presents a safe 413 detail even when the optional code is absent', () => {
    const error = toApiRequestError(
      makeAxiosError(
        makeProblem(
          {
            title: 'Conteúdo muito grande',
            detail: 'O corpo da requisição excede o tamanho máximo permitido.',
          },
          413,
        ),
        413,
      ),
    );

    expect(error.problem?.code).toBeUndefined();
    expect(getApiProblemPresentation(error).message).toBe(
      'O corpo da requisição excede o tamanho máximo permitido.',
    );
  });

  it('retains the validated enrollment identifier required by the approved renewal conflict', () => {
    const error = toApiRequestError(
      makeAxiosError(
        makeProblem(
          {
            status: 409,
            code: 'PREVIOUS_YEAR_ENROLLMENT_CONFIRMATION_REQUIRED',
            previousEnrollmentId: '9001',
            detail:
              'Confirme o encerramento da matrícula do ano letivo anterior antes de renová-la.',
          },
          409,
        ),
        409,
      ),
    );

    expect(error.problem?.previousEnrollmentId).toBe('9001');
    expect(getApiProblemPresentation(error).message).toBe(
      'Confirme o encerramento da matrícula do ano letivo anterior antes de renová-la.',
    );
  });

  it('does not retain an invalid enrollment identifier from a problem extension', () => {
    const error = toApiRequestError(
      makeAxiosError(
        makeProblem({ status: 409, previousEnrollmentId: '9001?private=value' }, 409),
        409,
      ),
    );

    expect(error.problem?.previousEnrollmentId).toBeUndefined();
  });

  it('does not present a valid RFC response from the health endpoint as a product error', () => {
    const healthProblem = {
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      code: 'HEALTH_CHECK_UNAVAILABLE',
    };
    const error = toApiRequestError(
      makeAxiosError(healthProblem, 503, 'application/problem+json', '/api/v1/health'),
    );

    expect(error.status).toBe(503);
    expect(error.problem).toBeUndefined();
    expect(getApiProblemPresentation(error)).toEqual({ message: undefined, fieldErrors: [] });
    expect(error.message).toBe(GENERIC_API_ERROR_MESSAGE);
  });

  it('uses a validated title when a valid problem has no detail', () => {
    const titleOnly = makeProblem({ title: 'Requisição inválida' });
    delete titleOnly.detail;
    const error = toApiRequestError(makeAxiosError(titleOnly));

    expect(getApiProblemPresentation(error).message).toBe('Requisição inválida');
  });

  it('accepts the problem media type with parameters and keeps generic exception copy', () => {
    const error = toApiRequestError(
      makeAxiosError(makeProblem(), 422, 'Application/Problem+Json; charset=utf-8'),
    );

    expect(getApiProblemPresentation(error).message).toBe(
      'O conteúdo enviado não atende aos critérios de validação.',
    );
    expect(error.message).toBe(GENERIC_API_ERROR_MESSAGE);
  });

  it('uses a generic connection error when the response is unavailable', () => {
    const error = toApiRequestError(new AxiosError('internal stack trace'));

    expect(error.status).toBeUndefined();
    expect(error.problem).toBeUndefined();
    expect(getApiProblemPresentation(error)).toEqual({ message: undefined, fieldErrors: [] });
    expect(error.message).toBe(
      'Não foi possível concluir a ação agora. Tente novamente em instantes.',
    );
  });

  it.each([
    { name: 'empty body', body: undefined, status: 500, contentType: 'application/problem+json' },
    { name: 'wrong media type', body: makeProblem(), status: 422, contentType: 'application/json' },
    { name: 'missing content type', body: makeProblem(), status: 422, contentType: null },
    {
      name: 'foreign JSON body',
      body: { detail: 'Raw server response', status: 500, stack: 'private stack trace' },
      status: 500,
      contentType: 'application/problem+json',
    },
    {
      name: 'mismatched status',
      body: makeProblem({ status: 400, detail: 'Body status mismatch' }),
      status: 422,
      contentType: 'application/problem+json',
    },
  ])('does not retain $name response data', ({ body, status, contentType }) => {
    const error = toApiRequestError(makeAxiosError(body, status, contentType));

    expect(error.problem).toBeUndefined();
    expect(getApiProblemPresentation(error)).toEqual({ message: undefined, fieldErrors: [] });
    expect(error.message).toBe(GENERIC_API_ERROR_MESSAGE);
    expect(error.message).not.toContain('Raw server response');
    expect(error.message).not.toContain('private stack trace');
  });

  it.each([
    { name: 'non-string title', changes: { title: { text: 'unsafe' } } },
    { name: 'non-string detail', changes: { detail: ['unsafe'] } },
    { name: 'non-array errors', changes: { errors: { detail: 'unsafe' } } },
    {
      name: 'error without a code',
      changes: {
        errors: [{ detail: 'unsafe', source: { in: 'body', pointer: '/email' } }],
      },
    },
    {
      name: 'non-string field detail',
      changes: {
        errors: [
          { code: 'INVALID_FORMAT', detail: ['unsafe'], source: { in: 'body', pointer: '/email' } },
        ],
      },
    },
    {
      name: 'malformed source object',
      changes: {
        errors: [
          { code: 'INVALID_FORMAT', detail: 'Safe detail', source: { in: 'body', pointer: 42 } },
        ],
      },
    },
    {
      name: 'invalid JSON pointer escape',
      changes: {
        errors: [
          {
            code: 'INVALID_FORMAT',
            detail: 'Safe detail',
            source: { in: 'body', pointer: '/password~2' },
          },
        ],
      },
    },
  ])('rejects malformed $name fields before presentation', ({ changes }) => {
    const error = toApiRequestError(makeAxiosError(makeProblem(changes)));

    expect(error.problem).toBeUndefined();
    expect(getApiProblemPresentation(error)).toEqual({ message: undefined, fieldErrors: [] });
  });

  it('filters credential-like API text while rendering markup-looking text as text', () => {
    const markup = '<img src=x onerror=alert(1)>';
    const markupError = toApiRequestError(makeAxiosError(makeProblem({ detail: markup })));
    const tokenError = toApiRequestError(
      makeAxiosError(makeProblem({ detail: `Invalid token ${'a'.repeat(40)}` })),
    );

    expect(getApiProblemPresentation(markupError).message).toBe(markup);
    expect(getApiProblemPresentation(tokenError).message).toBe('Conteúdo não processável');
  });

  it('presents API detail and field messages even when they repeat submitted values', () => {
    const error = toApiRequestError(
      makeAxiosError(
        makeProblem({
          detail: 'A senha local-only-password não pode ser usada.',
          errors: [
            {
              code: 'INVALID_VALUE',
              detail: 'O token synthetic-reset-token é inválido.',
              source: { in: 'body', pointer: '/token' },
            },
          ],
        }),
      ),
    );

    expect(getApiProblemPresentation(error)).toEqual({
      message: 'A senha local-only-password não pode ser usada.',
      fieldErrors: [
        {
          code: 'INVALID_VALUE',
          detail: 'O token synthetic-reset-token é inválido.',
          source: { in: 'body', pointer: '/token' },
        },
      ],
    });
    expect(
      getApiProblemPresentation(error, ['local-only-password', 'synthetic-reset-token']),
    ).toEqual({
      message: 'Conteúdo não processável',
      fieldErrors: [],
    });
  });

  it('maps only exact, approved body pointers to static auth fields', () => {
    expect(mapAuthProblemSource({ in: 'body', pointer: '/email' })).toBe('email');
    expect(mapAuthProblemSource({ in: 'body', pointer: '/password' })).toBe('password');
    expect(mapAuthProblemSource({ in: 'body', pointer: '/token' })).toBe('token');
    expect(mapAuthProblemSource({ in: 'body', pointer: '/email/selector' })).toBeUndefined();
    expect(mapAuthProblemSource({ in: 'query', name: 'email' })).toBeUndefined();
  });
});
