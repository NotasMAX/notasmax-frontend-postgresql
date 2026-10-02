import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiRequestError, toApiRequestError } from './problemDetails';

function makeAxiosError(responseData: unknown, status = 422): AxiosError {
  const error = new AxiosError('internal database details and stack trace') as AxiosError;
  Object.assign(error, {
    response: {
      data: responseData,
      status,
    },
  });
  return error;
}

describe('toApiRequestError', () => {
  it('keeps the status, code, and errors extension with a generic message', () => {
    const error = toApiRequestError(
      makeAxiosError({
        type: 'https://example.test/problems/invalid-input',
        title: 'Invalid input',
        detail: 'Internal database details must not be shown',
        code: 'INVALID_INPUT',
        errors: [{ field: 'email', message: 'Invalid value' }],
      }),
    );

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.status).toBe(422);
    expect(error.problem).toEqual({
      type: 'https://example.test/problems/invalid-input',
      status: 422,
      code: 'INVALID_INPUT',
      errors: [{ field: 'email', message: 'Invalid value' }],
    });
    expect(error.message).toBe(
      'Não foi possível concluir a solicitação. Tente novamente mais tarde.',
    );
    expect(error.message).not.toContain('Internal database');
    expect(error).not.toHaveProperty('detail');
  });

  it('uses a generic connection message when the response is unavailable', () => {
    const error = toApiRequestError(new AxiosError('internal stack trace'));

    expect(error.status).toBeUndefined();
    expect(error.problem).toBeUndefined();
    expect(error.message).toBe('Não foi possível conectar à API. Tente novamente mais tarde.');
  });

  it('does not include unrelated response fields in normalized problem details', () => {
    const error = toApiRequestError(
      makeAxiosError(
        {
          status: 500,
          detail: 'Raw server response',
          stack: 'private stack trace',
        },
        500,
      ),
    );

    expect(error.problem).toEqual({ status: 500 });
    expect(error.message).not.toContain('Raw server response');
    expect(error.message).not.toContain('private stack trace');
  });
});
