// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppLayout } from './AppLayout';

const mockLogout = vi.hoisted(() => vi.fn().mockResolvedValue('ended'));
let dialogFocusRestorationTarget: Element | null = null;

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    state: { status: 'authenticated', user: { displayName: 'Ana Silva' } },
    logout: mockLogout,
  }),
}));

afterEach(() => cleanup());

beforeEach(() => {
  dialogFocusRestorationTarget = null;
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Abrir navegação administrativa"]')
        ?.focus();
      dialogFocusRestorationTarget = document.activeElement;
      this.dispatchEvent(new Event('close'));
    },
  });
});

function renderLayout(initialEntry = '/admin/contas/alunos') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route element={<p>Início</p>} path="/admin" />
          <Route element={<p>Conteúdo de contas</p>} path="/admin/contas/alunos" />
          <Route element={<p>Conteúdo acadêmico</p>} path="/admin/estrutura/materias" />
          <Route element={<p>Conteúdo de simulados</p>} path="/admin/simulados" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout compact navigation', () => {
  it('opens a labeled drawer, marks the current destination, and closes it with Escape', async () => {
    const user = userEvent.setup();
    renderLayout();

    const openButton = screen.getByRole('button', { name: 'Abrir navegação administrativa' });
    expect(openButton.getAttribute('aria-expanded')).toBe('false');
    await user.click(openButton);

    const drawer = screen.getByRole('dialog', { name: 'Navegação administrativa' });
    const drawerNavigation = within(drawer).getByRole('navigation', {
      name: 'Navegação administrativa',
    });
    expect(
      within(drawerNavigation).getByRole('link', { name: 'Contas' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(document.activeElement).toBe(
      within(drawer).getByRole('button', { name: 'Fechar navegação administrativa' }),
    );

    await user.tab();
    expect(document.activeElement).toBe(
      within(drawerNavigation).getByRole('link', { name: 'Início' }),
    );

    // Native <dialog> dispatches `cancel` for Escape; jsdom does not provide that keyboard behavior.
    fireEvent(drawer, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(drawer.hasAttribute('open')).toBe(false);
    expect(openButton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(openButton);
  });

  it('keeps visible keyboard focus in order at both compact drawer boundaries', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Abrir navegação administrativa' }));
    const drawer = screen.getByRole('dialog', { name: 'Navegação administrativa' });
    const closeButton = within(drawer).getByRole('button', {
      name: 'Fechar navegação administrativa',
    });
    const drawerNavigation = within(drawer).getByRole('navigation', {
      name: 'Navegação administrativa',
    });
    const links = ['Início', 'Contas', 'Estrutura acadêmica', 'Simulados'].map((name) =>
      within(drawerNavigation).getByRole('link', { name }),
    );
    const expectVisibleFocus = (target: HTMLElement) => {
      expect(drawer.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).toBe(target);
      expect(target.className).toContain('focus-visible:outline-2');
    };

    expectVisibleFocus(closeButton);
    for (const link of links) {
      await user.tab();
      expectVisibleFocus(link);
    }
    await user.tab();
    expectVisibleFocus(closeButton);

    await user.tab({ shift: true });
    expectVisibleFocus(links[links.length - 1]);
    for (const link of [...links].reverse().slice(1)) {
      await user.tab({ shift: true });
      expectVisibleFocus(link);
    }
    await user.tab({ shift: true });
    expectVisibleFocus(closeButton);
    await user.tab({ shift: true });
    expectVisibleFocus(links[links.length - 1]);
  });

  it('closes the drawer after a destination is selected', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Abrir navegação administrativa' }));
    const drawer = screen.getByRole('dialog', { name: 'Navegação administrativa' });
    await user.click(within(drawer).getByRole('link', { name: 'Simulados' }));

    expect(screen.getByText('Conteúdo de simulados')).toBeTruthy();
    expect(drawer.hasAttribute('open')).toBe(false);
    expect(
      within(screen.getByRole('navigation', { name: 'Navegação administrativa' }))
        .getByRole('link', { name: 'Simulados' })
        .getAttribute('aria-current'),
    ).toBe('page');
  });

  it('closes the drawer when the backdrop is clicked and restores focus', async () => {
    const user = userEvent.setup();
    renderLayout();

    const openButton = screen.getByRole('button', { name: 'Abrir navegação administrativa' });
    await user.click(openButton);
    const drawer = screen.getByRole('dialog', { name: 'Navegação administrativa' });

    fireEvent.click(drawer);

    expect(drawer.hasAttribute('open')).toBe(false);
    expect(openButton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(openButton);
  });

  it.each([
    { label: 'Início', path: '/admin', href: '/admin' },
    { label: 'Contas', path: '/admin/contas/alunos', href: '/admin/contas/alunos' },
    {
      label: 'Estrutura acadêmica',
      path: '/admin/estrutura/materias',
      href: '/admin/estrutura/materias',
    },
    { label: 'Simulados', path: '/admin/simulados', href: '/admin/simulados' },
  ])(
    'marks only $label active in compact and desktop navigation',
    async ({ label, path, href }) => {
      const user = userEvent.setup();
      renderLayout(path);

      const desktopNavigation = screen.getByRole('navigation', {
        name: 'Navegação administrativa',
      });
      expect(desktopNavigation.className).toContain('lg:flex');

      for (const destination of ['Início', 'Contas', 'Estrutura acadêmica', 'Simulados']) {
        const link = within(desktopNavigation).getByRole('link', { name: destination });
        expect(link.getAttribute('aria-current')).toBe(destination === label ? 'page' : null);
        if (destination === label) expect(link.getAttribute('href')).toBe(href);
      }

      await user.click(screen.getByRole('button', { name: 'Abrir navegação administrativa' }));
      const drawer = screen.getByRole('dialog', { name: 'Navegação administrativa' });
      const compactNavigation = within(drawer).getByRole('navigation', {
        name: 'Navegação administrativa',
      });

      for (const destination of ['Início', 'Contas', 'Estrutura acadêmica', 'Simulados']) {
        const link = within(compactNavigation).getByRole('link', { name: destination });
        expect(link.getAttribute('aria-current')).toBe(destination === label ? 'page' : null);
        if (destination === label) expect(link.getAttribute('href')).toBe(href);
      }
    },
  );

  it('moves focus after native dialog restoration when the desktop breakpoint closes the drawer', async () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    let matches = false;
    const mediaQuery = {
      get matches() {
        return matches;
      },
      media: '(min-width: 64rem)',
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        if (typeof listener === 'function') {
          listeners.add(listener as (event: MediaQueryListEvent) => void);
        }
      },
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => mediaQuery),
    });
    const user = userEvent.setup();
    renderLayout();

    const openButton = screen.getByRole('button', { name: 'Abrir navegação administrativa' });
    await user.tab();
    expect(document.activeElement).toBe(openButton);
    await user.keyboard('{Enter}');
    const drawer = screen.getByRole('dialog', { name: 'Navegação administrativa' });
    expect(drawer.hasAttribute('open')).toBe(true);
    const desktopNavigation = screen
      .getAllByRole('navigation', { name: 'Navegação administrativa' })
      .find((navigation) => navigation.classList.contains('lg:flex'));
    expect(desktopNavigation).toBeDefined();
    if (!desktopNavigation) throw new Error('Desktop navigation is missing');
    const activeDesktopLink = within(desktopNavigation).getByRole('link', { name: 'Contas' });
    vi.spyOn(activeDesktopLink, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);

    act(() => {
      matches = true;
      for (const listener of listeners) {
        listener({ matches, media: '(min-width: 64rem)' } as MediaQueryListEvent);
      }
    });

    expect(drawer.hasAttribute('open')).toBe(false);
    expect(openButton.getAttribute('aria-expanded')).toBe('false');
    expect(desktopNavigation.className.split(/\s+/)).toContain('lg:flex');
    expect(dialogFocusRestorationTarget).toBe(openButton);
    expect(activeDesktopLink.getAttribute('aria-current')).toBe('page');
    expect(document.activeElement).toBe(activeDesktopLink);
    expect(document.activeElement).not.toBe(document.body);
    expect(activeDesktopLink.className).toContain('focus-visible:outline-2');
    expect(activeDesktopLink.className).toContain('focus-visible:outline-primary');
  });
});
