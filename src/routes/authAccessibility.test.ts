import { createElement } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from './LoginPage';
import { PasswordActionPage } from './PasswordActionPage';
import { PasswordResetRequestPage } from './PasswordResetRequestPage';

function renderPage(
  page: ReactElement,
  entry: { readonly pathname: string; readonly state?: unknown },
): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [entry] },
      createElement(AuthProvider, null, page),
    ),
  );
}

describe('auth flow accessibility regressions', () => {
  it.each([
    {
      name: 'login',
      page: createElement(LoginPage),
      entry: { pathname: '/' },
      title: 'Entrar',
      headingClass: 'sr-only',
    },
    {
      name: 'reset request',
      page: createElement(PasswordResetRequestPage),
      entry: { pathname: '/recuperar-senha' },
      title: 'Recuperar senha',
      headingClass: 'space-y-2',
    },
    {
      name: 'password reset',
      page: createElement(PasswordActionPage, {
        flow: 'password-reset',
        initialToken: 'synthetic-reset',
        onTokenCleared: () => undefined,
      }),
      entry: { pathname: '/redefinir-senha' },
      title: 'Definir nova senha',
      headingClass: 'space-y-2',
    },
    {
      name: 'activation',
      page: createElement(PasswordActionPage, {
        flow: 'activation',
        initialToken: 'synthetic-activation',
        onTokenCleared: () => undefined,
      }),
      entry: { pathname: '/ativar-conta' },
      title: 'Ativar conta',
      headingClass: 'space-y-2',
    },
  ])(
    'keeps the shared brand panel and accessible heading on $name',
    ({ page, entry, title, headingClass }) => {
      const markup = renderPage(page, entry);
      const panelStart = markup.indexOf('<section class="auth-panel');
      const logoPosition = markup.indexOf('alt="Logo oficial do NotasMAX"');
      const headerPosition = markup.indexOf(`<header class="${headingClass}">`);
      const headingPosition = markup.indexOf(
        `<h1 class="text-title-large font-semibold text-on-surface">${title}</h1>`,
      );
      const panelEnd = markup.indexOf('</section>', panelStart);

      expect(panelStart).toBeGreaterThanOrEqual(0);
      expect(markup).toContain('w-full max-w-[30rem]');
      expect(markup).toContain('auth-page flex min-h-screen items-center justify-center px-4');
      expect(markup).toContain('auth-panel rounded-2xl border border-white/90 p-5 sm:p-8');
      expect(markup).toContain('min-h-12 w-full rounded-lg border border-outline');
      expect(logoPosition).toBeGreaterThan(panelStart);
      expect(headerPosition).toBeGreaterThan(logoPosition);
      expect(headingPosition).toBeGreaterThan(headerPosition);
      expect(headingPosition).toBeLessThan(panelEnd);
      expect(markup).not.toContain('bg-highlight');
      expect(markup).not.toContain('Área administrativa do NotasMAX');
    },
  );

  it.each([
    'Senha alterada. Entre novamente com sua nova senha.',
    'Conta ativada. Entre com seu e-mail e sua nova senha.',
  ])('exposes the routed completion notice as a polite status: %s', (message) => {
    const markup = renderPage(createElement(LoginPage), {
      pathname: '/',
      state: { message },
    });

    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain(message);
  });

  it.each([
    {
      name: 'reset request',
      page: createElement(PasswordResetRequestPage),
      entry: { pathname: '/recuperar-senha' },
      link: 'Voltar para entrar',
      button: 'Solicitar link',
    },
    {
      name: 'password reset',
      page: createElement(PasswordActionPage, {
        flow: 'password-reset',
        initialToken: 'synthetic-reset',
        onTokenCleared: () => undefined,
      }),
      entry: { pathname: '/redefinir-senha' },
      link: 'Cancelar',
      button: 'Confirmar senha',
    },
    {
      name: 'activation',
      page: createElement(PasswordActionPage, {
        flow: 'activation',
        initialToken: 'synthetic-activation',
        onTokenCleared: () => undefined,
      }),
      entry: { pathname: '/ativar-conta' },
      link: 'Cancelar',
      button: 'Confirmar senha',
    },
  ])(
    'keeps compact visual and DOM action order aligned for $name',
    ({ page, entry, link, button }) => {
      const markup = renderPage(page, entry);

      expect(markup).toContain('flex flex-col');
      expect(markup).toContain('sm:flex-row');
      expect(markup).not.toContain('flex-col-reverse');
      expect(markup.indexOf(link)).toBeGreaterThanOrEqual(0);
      expect(markup.indexOf(link)).toBeLessThan(markup.lastIndexOf(button));
    },
  );

  it('right-aligns login recovery and centers the primary action without changing keyboard order', () => {
    const markup = renderPage(createElement(LoginPage), { pathname: '/' });
    const linkPosition = markup.indexOf('Esqueci minha senha');
    const submitPosition = markup.indexOf('type="submit"');

    expect(markup).toContain('auth-login-actions flex flex-col items-stretch');
    expect(markup).toContain('self-end');
    expect(markup).toContain('max-w-56 self-center');
    expect(linkPosition).toBeGreaterThanOrEqual(0);
    expect(linkPosition).toBeLessThan(submitPosition);
  });
});
