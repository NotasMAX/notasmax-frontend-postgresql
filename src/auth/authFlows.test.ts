// @vitest-environment jsdom
import { Fragment, createElement, useState } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../api/auth';
import * as authApi from '../api/auth';
import {
  ApiRequestError,
  GENERIC_API_ERROR_MESSAGE,
  publishAuthenticationRequired,
  toApiRequestError,
} from '../api/problemDetails';
import { App, AppRoutes } from '../app/App';
import { AuthProvider } from './AuthContext';
import { captureSensitiveLinkToken, type SensitiveLinkToken } from './sensitiveLink';

vi.mock('../api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/auth')>();
  return {
    ...actual,
    activateAccount: vi.fn(),
    completePasswordReset: vi.fn(),
    createSession: vi.fn(),
    endCurrentSession: vi.fn(),
    getCurrentSession: vi.fn(),
    requestPasswordReset: vi.fn(),
  };
});

const administrator: AuthenticatedUser = {
  id: 'local-test-admin',
  displayName: 'Ada Lovelace',
  profile: 'administrador',
};

const testPassword = 'local-only-password';
const genericResetConfirmation =
  'Se houver uma conta ativa associada a este e-mail, enviaremos um link para redefinir sua senha.';

const passwordFlows = [
  {
    name: 'reset',
    flow: 'password-reset',
    path: '/redefinir-senha',
    token: 'synthetic-reset-token',
    invalidCode: 'PASSWORD_RESET_TOKEN_INVALID',
    invalidDetail: 'Este link de redefinição é inválido, expirou ou já foi utilizado.',
    successMessage: 'Senha alterada. Entre novamente com sua nova senha.',
  },
  {
    name: 'activation',
    flow: 'activation',
    path: '/ativar-conta',
    token: 'synthetic-activation-token',
    invalidCode: 'ACTIVATION_TOKEN_INVALID',
    invalidDetail: 'Este link de ativação é inválido, expirou ou já foi utilizado.',
    successMessage: 'Conta ativada. Entre com seu e-mail e sua nova senha.',
  },
] as const;

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function authenticationRequiredError(): ApiRequestError {
  return new ApiRequestError({
    status: 401,
    problem: { status: 401, code: 'AUTHENTICATION_REQUIRED' },
  });
}

function apiError(
  status: number,
  code: string | undefined,
  detail?: string,
  title = 'Falha na solicitação',
): ApiRequestError {
  return new ApiRequestError({
    status,
    problem: {
      type: 'about:blank',
      title,
      status,
      ...(code === undefined ? {} : { code }),
      ...(detail === undefined ? {} : { detail }),
    },
  });
}

function normalizedApiError(
  body: unknown,
  status: number,
  contentType = 'application/problem+json',
): ApiRequestError {
  const error = new AxiosError('untrusted raw response message') as AxiosError;
  Object.assign(error, {
    response: { data: body, status, headers: { 'content-type': contentType } },
  });
  return toApiRequestError(error);
}

function CurrentPath() {
  const location = useLocation();
  return createElement(
    'output',
    { 'aria-hidden': true, 'data-testid': 'current-path' },
    location.pathname,
  );
}

function MemoryApplication({
  initialEntry,
  initialSensitiveLink = null,
}: {
  readonly initialEntry: string;
  readonly initialSensitiveLink?: SensitiveLinkToken | null;
}) {
  const [sensitiveLink, setSensitiveLink] = useState(initialSensitiveLink);

  return createElement(
    MemoryRouter,
    { initialEntries: [initialEntry] },
    createElement(
      AuthProvider,
      null,
      createElement(
        Fragment,
        null,
        createElement(CurrentPath),
        createElement(AppRoutes, { sensitiveLink, setSensitiveLink }),
      ),
    ),
  );
}

function renderMemoryApplication(
  initialEntry = '/',
  initialSensitiveLink: SensitiveLinkToken | null = null,
) {
  return render(createElement(MemoryApplication, { initialEntry, initialSensitiveLink }));
}

function currentPath(): string | null {
  return screen.queryByTestId('current-path')?.textContent ?? null;
}

function sensitiveLink(flow: SensitiveLinkToken['flow'], token: string): SensitiveLinkToken {
  return { flow, token };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.getCurrentSession).mockRejectedValue(authenticationRequiredError());
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('mounted authentication flows', () => {
  it('shows an unavailable session lookup, retries it, and then renders /admin', async () => {
    vi.mocked(authApi.getCurrentSession)
      .mockRejectedValueOnce(new Error('local synthetic network failure'))
      .mockResolvedValueOnce(administrator);
    renderMemoryApplication('/admin');

    expect(
      (await screen.findByRole('heading', { name: 'Não foi possível verificar sua sessão' }))
        .textContent,
    ).toContain('Não foi possível verificar sua sessão');
    expect(screen.queryByRole('navigation', { name: 'Navegação administrativa' })).toBeNull();
    expect(currentPath()).toBe('/admin');

    const retry = screen.getByRole('button', { name: 'Tentar novamente' });
    await userEvent.setup().click(retry);

    expect(
      await screen.findByRole('navigation', { name: 'Navegação administrativa' }),
    ).toBeTruthy();
    expect(currentPath()).toBe('/admin');
    expect(authApi.getCurrentSession).toHaveBeenCalledTimes(2);
  });

  it('keeps protected content hidden during the initial session lookup and reveals it only after success', async () => {
    const lookup = deferred<AuthenticatedUser>();
    vi.mocked(authApi.getCurrentSession).mockReturnValue(lookup.promise);
    renderMemoryApplication('/admin');

    expect(screen.getByRole('status').textContent).toContain('Verificando sua sessão');
    expect(screen.queryByRole('navigation', { name: 'Navegação administrativa' })).toBeNull();

    await act(async () => lookup.resolve(administrator));

    expect(await screen.findByRole('heading', { name: /Olá, Ada Lovelace/ })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Navegação administrativa' })).toBeTruthy();
  });

  it('redirects an anonymous session lookup away from /admin without rendering the shell', async () => {
    vi.mocked(authApi.getCurrentSession).mockRejectedValue(authenticationRequiredError());
    renderMemoryApplication('/admin');

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeTruthy();
    expect(currentPath()).toBe('/');
    expect(screen.queryByRole('navigation', { name: 'Navegação administrativa' })).toBeNull();
  });

  it('routes an expired authenticated session to login and removes the protected shell', async () => {
    vi.mocked(authApi.getCurrentSession).mockResolvedValue(administrator);
    renderMemoryApplication('/admin');
    expect(
      await screen.findByRole('navigation', { name: 'Navegação administrativa' }),
    ).toBeTruthy();

    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    act(() => publishAuthenticationRequired(authenticationRequiredError()));

    expect(await screen.findByText('Sua sessão expirou. Entre novamente.')).toBeTruthy();
    expect(currentPath()).toBe('/');
    expect(screen.queryByRole('navigation', { name: 'Navegação administrativa' })).toBeNull();
  });

  it('ends the server session and routes to login on logout', async () => {
    vi.mocked(authApi.getCurrentSession).mockResolvedValue(administrator);
    vi.mocked(authApi.endCurrentSession).mockResolvedValue(undefined);
    renderMemoryApplication('/admin');
    expect(await screen.findByRole('button', { name: 'Sair' })).toBeTruthy();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeTruthy();
    expect(currentPath()).toBe('/');
    expect(screen.queryByRole('navigation', { name: 'Navegação administrativa' })).toBeNull();
    expect(authApi.endCurrentSession).toHaveBeenCalledOnce();
  });

  it('shows the pending login state and routes a successful administrator login to /admin', async () => {
    const login = deferred<AuthenticatedUser>();
    vi.mocked(authApi.createSession).mockReturnValue(login.promise);
    renderMemoryApplication('/');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('E-mail institucional'), 'admin@example.test');
    await user.type(screen.getByLabelText('Senha'), testPassword);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('button', { name: 'Entrando…' }).hasAttribute('disabled')).toBe(true);

    await act(async () => login.resolve(administrator));

    expect(await screen.findByRole('heading', { name: /Olá, Ada Lovelace/ })).toBeTruthy();
    expect(currentPath()).toBe('/admin');
    expect(authApi.createSession).toHaveBeenCalledWith('admin@example.test', testPassword);
  });

  it.each(['unknown email', 'incorrect password'])(
    'shows the same generic public API detail for $0 login failure',
    async () => {
      const genericLoginDetail = 'Não foi possível autenticar com essas credenciais.';
      vi.mocked(authApi.createSession).mockRejectedValue(
        apiError(401, 'AUTHENTICATION_FAILED', genericLoginDetail, 'Não autorizado'),
      );
      renderMemoryApplication('/');
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('E-mail institucional'), 'admin@example.test');
      await user.type(screen.getByLabelText('Senha'), testPassword);
      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe(genericLoginDetail);
      expect(alert.textContent).not.toContain('admin@example.test');
      expect(alert.textContent).not.toContain(testPassword);
      expect(currentPath()).toBe('/');
      expect(screen.queryByRole('navigation', { name: 'Navegação administrativa' })).toBeNull();
    },
  );

  it('maps validated API field errors to the matching accessible login input', async () => {
    vi.mocked(authApi.createSession).mockRejectedValue(
      normalizedApiError(
        {
          type: 'about:blank',
          title: 'Conteúdo não processável',
          status: 422,
          detail: 'O conteúdo enviado não atende aos critérios de validação.',
          errors: [
            {
              code: 'INVALID_FORMAT',
              detail: 'O formato informado é inválido.',
              source: { in: 'body', pointer: '/email' },
            },
          ],
        },
        422,
      ),
    );
    renderMemoryApplication('/');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('E-mail institucional'), 'admin@example.test');
    await user.type(screen.getByLabelText('Senha'), testPassword);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const emailInput = screen.getByLabelText('E-mail institucional');
    expect(await screen.findByText('O formato informado é inválido.')).toBeTruthy();
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    expect(emailInput.getAttribute('aria-describedby')).toBe('login-email-error-0');
    expect(document.getElementById('login-email-error-0')?.textContent).toBe(
      'O formato informado é inválido.',
    );
    expect(currentPath()).toBe('/');
    expect(screen.queryByRole('navigation', { name: 'Navegação administrativa' })).toBeNull();
  });

  it('keeps valid but unknown field sources at form level without creating selectors', async () => {
    vi.mocked(authApi.createSession).mockRejectedValue(
      normalizedApiError(
        {
          type: 'about:blank',
          title: 'Conteúdo não processável',
          status: 422,
          detail: 'O conteúdo enviado não atende aos critérios de validação.',
          errors: [
            {
              code: 'INVALID_VALUE',
              detail: 'O parâmetro informado é inválido.',
              source: { in: 'body', pointer: "/email'][aria-invalid='true" },
            },
          ],
        },
        422,
      ),
    );
    renderMemoryApplication('/');
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText('E-mail institucional');
    await user.type(emailInput, 'admin@example.test');
    await user.type(screen.getByLabelText('Senha'), testPassword);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('O parâmetro informado é inválido.');
    expect(emailInput.getAttribute('aria-invalid')).not.toBe('true');
    expect(emailInput.getAttribute('aria-describedby')).toBeNull();
  });

  it('renders markup-looking API detail as ordinary text', async () => {
    const markup = '<img src=x onerror=alert(1)>';
    vi.mocked(authApi.createSession).mockRejectedValue(apiError(422, 'INVALID_INPUT', markup));
    renderMemoryApplication('/');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('E-mail institucional'), 'admin@example.test');
    await user.type(screen.getByLabelText('Senha'), testPassword);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(markup);
    expect(alert.querySelector('img')).toBeNull();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it.each([
    {
      name: 'empty response',
      body: undefined,
      status: 500,
      contentType: 'application/problem+json',
      raw: '',
    },
    {
      name: 'malformed problem',
      body: {
        type: 'about:blank',
        title: 'Raw malformed title',
        status: 500,
        detail: 'Raw malformed detail',
        errors: [{ code: 'INVALID_FORMAT', detail: ['raw'], source: {} }],
      },
      status: 500,
      contentType: 'application/problem+json',
      raw: 'Raw malformed',
    },
    {
      name: 'wrong media type',
      body: {
        type: 'about:blank',
        title: 'Raw foreign title',
        status: 500,
        detail: 'Raw foreign detail',
      },
      status: 500,
      contentType: 'application/json',
      raw: 'Raw foreign',
    },
    {
      name: 'foreign body',
      body: { message: 'Raw diagnostic body', stack: 'raw internal stack' },
      status: 500,
      contentType: 'application/problem+json',
      raw: 'Raw diagnostic',
    },
  ])(
    'uses the generic fallback for a $name and never renders its body',
    async ({ body, status, contentType, raw }) => {
      vi.mocked(authApi.createSession).mockRejectedValue(
        normalizedApiError(body, status, contentType),
      );
      renderMemoryApplication('/');
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('E-mail institucional'), 'admin@example.test');
      await user.type(screen.getByLabelText('Senha'), testPassword);
      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe(GENERIC_API_ERROR_MESSAGE);
      if (raw !== '') {
        expect(alert.textContent).not.toContain(raw);
      }
    },
  );

  it('shows a safe title fallback when the RFC 9457 detail is absent', async () => {
    vi.mocked(authApi.requestPasswordReset).mockRejectedValue(
      apiError(429, undefined, undefined, 'Aguarde antes de tentar novamente.'),
    );
    renderMemoryApplication('/recuperar-senha');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('E-mail institucional'), 'local@example.test');
    await user.click(screen.getByRole('button', { name: 'Solicitar link' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Aguarde antes de tentar novamente.',
    );
  });

  it('shows a safe problem detail without requiring a code, including the API 413 case', async () => {
    const apiDetail = 'O corpo da requisição excede o tamanho máximo permitido.';
    vi.mocked(authApi.requestPasswordReset).mockRejectedValue(apiError(413, undefined, apiDetail));
    renderMemoryApplication('/recuperar-senha');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('E-mail institucional'), 'local@example.test');
    await user.click(screen.getByRole('button', { name: 'Solicitar link' }));

    expect((await screen.findByRole('alert')).textContent).toBe(apiDetail);
  });

  it('rejects a non-administrator login and clears the newly created server session', async () => {
    vi.mocked(authApi.createSession).mockResolvedValue({
      ...administrator,
      id: 'local-test-student',
      profile: 'aluno',
    });
    vi.mocked(authApi.endCurrentSession).mockResolvedValue(undefined);
    renderMemoryApplication('/');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('E-mail institucional'), 'student@example.test');
    await user.type(screen.getByLabelText('Senha'), testPassword);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Esta conta não tem acesso à área administrativa.',
    );
    expect(currentPath()).toBe('/');
    expect(screen.queryByRole('navigation', { name: 'Navegação administrativa' })).toBeNull();
    expect(authApi.endCurrentSession).toHaveBeenCalledOnce();
  });

  it.each([
    { name: 'an active address', email: 'registered@example.test' },
    { name: 'an unregistered address', email: 'missing@example.test' },
  ])('shows the same generic reset confirmation for $name', async ({ email }) => {
    vi.mocked(authApi.requestPasswordReset).mockResolvedValue(undefined);
    renderMemoryApplication('/recuperar-senha');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('E-mail institucional'), email);
    await user.click(screen.getByRole('button', { name: 'Solicitar link' }));

    expect((await screen.findByRole('status')).textContent).toBe(genericResetConfirmation);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(authApi.requestPasswordReset).toHaveBeenCalledWith(email);
  });

  it('shows a generic reset-request error without exposing a network error', async () => {
    vi.mocked(authApi.requestPasswordReset).mockRejectedValue(
      new Error('synthetic private account lookup detail'),
    );
    renderMemoryApplication('/recuperar-senha');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('E-mail institucional'), 'local@example.test');
    await user.click(screen.getByRole('button', { name: 'Solicitar link' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(GENERIC_API_ERROR_MESSAGE);
    expect(alert.textContent).not.toContain('synthetic private account lookup detail');
  });

  it.each(passwordFlows)(
    'completes $name and routes to login with a success notice',
    async (flowCase) => {
      vi.mocked(authApi.getCurrentSession).mockRejectedValue(authenticationRequiredError());
      if (flowCase.flow === 'password-reset') {
        vi.mocked(authApi.completePasswordReset).mockResolvedValue(undefined);
      } else {
        vi.mocked(authApi.activateAccount).mockResolvedValue(undefined);
      }
      renderMemoryApplication(flowCase.path, sensitiveLink(flowCase.flow, flowCase.token));
      const passwordInput = screen.getByLabelText('Nova senha') as HTMLInputElement;
      expect(passwordInput.minLength).toBe(15);
      expect(passwordInput.maxLength).toBe(1024);
      expect(screen.getByText(/Use de 15 a 1024 caracteres/)).toBeTruthy();

      const user = userEvent.setup();
      await user.type(passwordInput, testPassword);
      await user.type(screen.getByLabelText('Confirmar nova senha'), testPassword);
      await user.click(screen.getByRole('button', { name: 'Confirmar senha' }));

      expect(await screen.findByText(flowCase.successMessage)).toBeTruthy();
      expect(currentPath()).toBe('/');
      expect(document.body.textContent).not.toContain(flowCase.token);
      if (flowCase.flow === 'password-reset') {
        expect(authApi.completePasswordReset).toHaveBeenCalledWith(flowCase.token, testPassword);
      } else {
        expect(authApi.activateAccount).toHaveBeenCalledWith(flowCase.token, testPassword);
      }
    },
  );

  it('revalidates and preserves an authenticated administrator session after password reset', async () => {
    vi.mocked(authApi.getCurrentSession)
      .mockResolvedValueOnce(administrator)
      .mockResolvedValueOnce(administrator);
    vi.mocked(authApi.completePasswordReset).mockResolvedValue(undefined);
    renderMemoryApplication(
      '/redefinir-senha',
      sensitiveLink('password-reset', 'synthetic-reset-token'),
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nova senha'), testPassword);
    await user.type(screen.getByLabelText('Confirmar nova senha'), testPassword);
    await user.click(screen.getByRole('button', { name: 'Confirmar senha' }));

    expect(
      await screen.findByRole('navigation', { name: 'Navegação administrativa' }),
    ).toBeTruthy();
    expect(currentPath()).toBe('/admin');
    expect(authApi.getCurrentSession).toHaveBeenCalledTimes(2);
    expect(authApi.completePasswordReset).toHaveBeenCalledOnce();
  });

  it('clears the local authenticated session after password reset when /me returns 401', async () => {
    vi.mocked(authApi.getCurrentSession)
      .mockResolvedValueOnce(administrator)
      .mockRejectedValueOnce(authenticationRequiredError());
    vi.mocked(authApi.completePasswordReset).mockResolvedValue(undefined);
    renderMemoryApplication(
      '/redefinir-senha',
      sensitiveLink('password-reset', 'synthetic-reset-token'),
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nova senha'), testPassword);
    await user.type(screen.getByLabelText('Confirmar nova senha'), testPassword);
    await user.click(screen.getByRole('button', { name: 'Confirmar senha' }));

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeTruthy();
    expect(currentPath()).toBe('/');
    expect(screen.queryByRole('navigation', { name: 'Navegação administrativa' })).toBeNull();
    expect(authApi.getCurrentSession).toHaveBeenCalledTimes(2);
    expect(authApi.completePasswordReset).toHaveBeenCalledOnce();
  });

  it('does not confirm a session when post-reset validation is unavailable and offers retry', async () => {
    vi.mocked(authApi.getCurrentSession)
      .mockResolvedValueOnce(administrator)
      .mockRejectedValueOnce(new Error('synthetic local network failure'))
      .mockResolvedValueOnce(administrator);
    vi.mocked(authApi.completePasswordReset).mockResolvedValue(undefined);
    renderMemoryApplication(
      '/redefinir-senha',
      sensitiveLink('password-reset', 'synthetic-reset-token'),
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nova senha'), testPassword);
    await user.type(screen.getByLabelText('Confirmar nova senha'), testPassword);
    await user.click(screen.getByRole('button', { name: 'Confirmar senha' }));

    expect(
      await screen.findByText(
        'A senha foi alterada, mas não foi possível confirmar sua sessão. Tente novamente.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Navegação administrativa' })).toBeNull();
    expect(currentPath()).toBe('/redefinir-senha');

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByRole('navigation', { name: 'Navegação administrativa' }),
    ).toBeTruthy();
    expect(currentPath()).toBe('/admin');
    expect(authApi.getCurrentSession).toHaveBeenCalledTimes(3);
    expect(authApi.completePasswordReset).toHaveBeenCalledOnce();
  });
  it.each(passwordFlows)(
    'shows and associates $name mismatch feedback without calling password APIs',
    async (flowCase) => {
      renderMemoryApplication(flowCase.path, sensitiveLink(flowCase.flow, flowCase.token));
      const passwordInput = screen.getByLabelText('Nova senha');
      const confirmationInput = screen.getByLabelText('Confirmar nova senha');
      const user = userEvent.setup();
      await user.type(passwordInput, testPassword);
      await user.type(confirmationInput, `${testPassword}-different`);
      await user.click(screen.getByRole('button', { name: 'Confirmar senha' }));

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe('As senhas não coincidem.');
      expect(alert.id).toBe(`${flowCase.flow}-password-validation-error`);
      expect(passwordInput.getAttribute('aria-invalid')).toBe('true');
      expect(confirmationInput.getAttribute('aria-invalid')).toBe('true');
      expect(passwordInput.getAttribute('aria-describedby')?.split(/\s+/)).toEqual([
        `${flowCase.flow}-password-help`,
        alert.id,
      ]);
      expect(confirmationInput.getAttribute('aria-describedby')?.split(/\s+/)).toContain(alert.id);
      expect(authApi.completePasswordReset).not.toHaveBeenCalled();
      expect(authApi.activateAccount).not.toHaveBeenCalled();
    },
  );

  it.each(passwordFlows)(
    'uses the API detail and removes an invalid $name token',
    async (flowCase) => {
      const action =
        flowCase.flow === 'password-reset'
          ? authApi.completePasswordReset
          : authApi.activateAccount;
      vi.mocked(action).mockRejectedValue(
        apiError(400, flowCase.invalidCode, flowCase.invalidDetail),
      );
      renderMemoryApplication(flowCase.path, sensitiveLink(flowCase.flow, flowCase.token));
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Nova senha'), testPassword);
      await user.type(screen.getByLabelText('Confirmar nova senha'), testPassword);
      await user.click(screen.getByRole('button', { name: 'Confirmar senha' }));

      expect((await screen.findByRole('alert')).textContent).toBe(flowCase.invalidDetail);
      expect(screen.queryByLabelText('Nova senha')).toBeNull();
      expect(document.body.textContent).not.toContain(flowCase.token);
    },
  );

  it.each(passwordFlows)(
    'keeps the $name form available after a generic request error',
    async (flowCase) => {
      const action =
        flowCase.flow === 'password-reset'
          ? authApi.completePasswordReset
          : authApi.activateAccount;
      vi.mocked(action).mockRejectedValue(
        new Error(`synthetic failure containing ${flowCase.token}`),
      );
      renderMemoryApplication(flowCase.path, sensitiveLink(flowCase.flow, flowCase.token));
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Nova senha'), testPassword);
      await user.type(screen.getByLabelText('Confirmar nova senha'), testPassword);
      await user.click(screen.getByRole('button', { name: 'Confirmar senha' }));

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe(GENERIC_API_ERROR_MESSAGE);
      expect(alert.textContent).not.toContain(flowCase.token);
      expect(screen.getByLabelText('Nova senha')).toBeTruthy();
      expect(document.body.textContent).not.toContain(flowCase.token);
    },
  );

  it.each(passwordFlows)(
    'associates a validated API password error accessibly on the $name form',
    async (flowCase) => {
      const action =
        flowCase.flow === 'password-reset'
          ? authApi.completePasswordReset
          : authApi.activateAccount;
      const apiDetail = 'A senha não atende aos critérios de validação.';
      vi.mocked(action).mockRejectedValue(
        normalizedApiError(
          {
            type: 'about:blank',
            title: 'Conteúdo não processável',
            status: 422,
            detail: apiDetail,
            errors: [
              {
                code: 'VALUE_OUT_OF_RANGE',
                detail: 'O valor está fora do intervalo permitido.',
                source: { in: 'body', pointer: '/password' },
              },
            ],
          },
          422,
        ),
      );
      renderMemoryApplication(flowCase.path, sensitiveLink(flowCase.flow, flowCase.token));
      const user = userEvent.setup();
      const passwordInput = screen.getByLabelText('Nova senha');
      await user.type(passwordInput, testPassword);
      await user.type(screen.getByLabelText('Confirmar nova senha'), testPassword);
      await user.click(screen.getByRole('button', { name: 'Confirmar senha' }));

      expect((await screen.findByRole('alert')).textContent).toBe(apiDetail);
      expect(passwordInput.getAttribute('aria-invalid')).toBe('true');
      expect(passwordInput.getAttribute('aria-describedby')?.split(/\s+/)).toContain(
        `${flowCase.flow}-password-server-error-0`,
      );
      expect(document.getElementById(`${flowCase.flow}-password-server-error-0`)?.textContent).toBe(
        'O valor está fora do intervalo permitido.',
      );
    },
  );

  it('does not show submitted token or password when an API message echoes them', async () => {
    const flowCase = passwordFlows[0];
    const action = authApi.completePasswordReset;
    vi.mocked(action).mockRejectedValue(
      apiError(
        400,
        flowCase.invalidCode,
        `A requisição recebeu ${flowCase.token} e ${testPassword}.`,
        'Este link não pode ser utilizado.',
      ),
    );
    renderMemoryApplication(flowCase.path, sensitiveLink(flowCase.flow, flowCase.token));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nova senha'), testPassword);
    await user.type(screen.getByLabelText('Confirmar nova senha'), testPassword);
    await user.click(screen.getByRole('button', { name: 'Confirmar senha' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Este link não pode ser utilizado.',
    );
    expect(document.body.textContent).not.toContain(flowCase.token);
    expect(document.body.textContent).not.toContain(testPassword);
  });

  it.each(passwordFlows)(
    'cleans the $name query token before mounting and uses it only in memory',
    async (flowCase) => {
      const token = `synthetic-query-${flowCase.name}-token`;
      window.history.replaceState(null, '', `${flowCase.path}?token=${token}&source=local-test`);
      const initialSensitiveLink = captureSensitiveLinkToken(window.location.href, window.history);
      expect(window.location.search).toBe('?source=local-test');
      expect(window.location.href).not.toContain(token);
      if (flowCase.flow === 'password-reset') {
        vi.mocked(authApi.completePasswordReset).mockResolvedValue(undefined);
      } else {
        vi.mocked(authApi.activateAccount).mockResolvedValue(undefined);
      }
      render(createElement(App, { initialSensitiveLink }));

      expect(await screen.findByLabelText('Nova senha')).toBeTruthy();
      expect(document.body.textContent).not.toContain(token);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Nova senha'), testPassword);
      await user.type(screen.getByLabelText('Confirmar nova senha'), testPassword);
      await user.click(screen.getByRole('button', { name: 'Confirmar senha' }));

      expect(await screen.findByText(flowCase.successMessage)).toBeTruthy();
      if (flowCase.flow === 'password-reset') {
        expect(authApi.completePasswordReset).toHaveBeenCalledWith(token, testPassword);
      } else {
        expect(authApi.activateAccount).toHaveBeenCalledWith(token, testPassword);
      }
      expect(window.location.href).not.toContain(token);
    },
  );
});
