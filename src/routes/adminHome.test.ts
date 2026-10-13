import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionState } from '../auth/sessionState';
import { AppRoutes } from '../app/App';

const authMock = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock('../auth/AuthContext', () => ({
  AuthProvider: () => null,
  useAuth: authMock.useAuth,
}));

function renderAdminRoute(state: SessionState): string {
  authMock.useAuth.mockReturnValue({
    state,
    logout: vi.fn(),
    retrySessionLookup: vi.fn(),
  });

  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ['/admin'] },
      createElement(AppRoutes, {
        sensitiveLink: null,
        setSensitiveLink: () => undefined,
      }),
    ),
  );
}

function expectProtectedShellHidden(markup: string): void {
  expect(markup).not.toContain('Navegação administrativa');
  expect(markup).not.toContain('Olá, Ada Lovelace');
  expect(markup).not.toContain('Bem-vindo(a), Ada!');
}

describe('protected /admin home', () => {
  beforeEach(() => {
    authMock.useAuth.mockReset();
  });

  it('renders the legacy welcome hierarchy inside the authenticated shell', () => {
    const markup = renderAdminRoute({
      status: 'authenticated',
      user: { id: 'admin-test', displayName: 'Ada Lovelace', profile: 'administrador' },
    });

    expect(markup).toContain('NotasMAX, início da área administrativa');
    expect(markup).toContain('Bem-vindo(a), Ada!');
    expect(markup).toMatch(/<nav\b[^>]*aria-label="Navegação administrativa"/);
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('Início');
    expect(markup).toContain('Olá, Ada Lovelace 👋');
    expect(markup).toContain('Seja bem-vindo(a) de volta!');
    expect(markup).toContain('Sair');
    expect(markup).toContain('href="/admin/simulados"');
    expect(markup).toContain('>Simulados</a>');
    expect(markup).not.toMatch(/>\s*(Turmas|Matérias|Professores|Alunos)\s*</);
    expect(markup).not.toContain('Sessão administrativa');
    expect(markup).not.toContain('As funções administrativas aparecerão');
  });

  it('shows the session check state before rendering protected content', () => {
    const markup = renderAdminRoute({ status: 'loading' });

    expect(markup).toContain('role="status"');
    expect(markup).toContain('Verificando sua sessão');
    expectProtectedShellHidden(markup);
  });

  it('shows a retry state without rendering the protected shell when session lookup is unavailable', () => {
    const markup = renderAdminRoute({ status: 'unavailable' });

    expect(markup).toContain('Não foi possível verificar sua sessão');
    expect(markup).toContain('Tentar novamente');
    expectProtectedShellHidden(markup);
  });

  it('explains the forbidden state without rendering the protected shell', () => {
    const markup = renderAdminRoute({ status: 'forbidden' });

    expect(markup).toContain('Acesso administrativo indisponível');
    expect(markup).toContain('Voltar para entrar');
    expectProtectedShellHidden(markup);
  });

  it.each([
    { status: 'anonymous' as const },
    { status: 'anonymous' as const, reason: 'expired' as const },
  ])('keeps the shell hidden for an anonymous or expired session', (state) => {
    const markup = renderAdminRoute(state);

    expectProtectedShellHidden(markup);
  });
});
