// @vitest-environment jsdom
// @ts-expect-error Vitest runs this test in Node; production source types stay browser-only.
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
// @ts-expect-error Vitest runs this test in Node; production source types stay browser-only.
import { tmpdir } from 'node:os';
// @ts-expect-error Vitest runs this test in Node; production source types stay browser-only.
import path from 'node:path';
// @ts-expect-error Vitest runs this test in Node; production source types stay browser-only.
import { cwd } from 'node:process';
import { createElement } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { build } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../app/App';

const repositoryRoot = cwd();

function expectApprovedCard(card: HTMLElement) {
  for (const className of ['panel-surface', 'rounded-2xl', 'bg-surface', 'p-4']) {
    expect(card.classList.contains(className)).toBe(true);
  }
  expect(card.className).not.toMatch(/\b(?:border|shadow)(?:-[^\s]+)?\b/);
  expect(card.querySelector('.panel-surface')).toBeNull();
  expect(card.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0);
}

function expectSampleCards(region: HTMLElement, expectedCount: number) {
  const cards = within(region).getAllByRole('listitem');
  expect(cards).toHaveLength(expectedCount);
  cards.forEach(expectApprovedCard);
  return cards;
}

function renderRoute(pathname: string) {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [pathname] },
      createElement(AppRoutes, {
        sensitiveLink: null,
        setSensitiveLink: () => undefined,
      }),
    ),
  );
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry: { name: string; isDirectory(): boolean }) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    }),
  );
  return nestedFiles.flat();
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('development design-system route', () => {
  it('opens directly and displays approved token categories and shared-layout references', async () => {
    renderRoute('/docs/design-system');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Design system do NotasMAX' }),
    ).toBeTruthy();
    expect(screen.getByText('--color-primary')).toBeTruthy();
    expect(screen.getByText('--color-error-surface')).toBeTruthy();
    expect(screen.getByText('--text-display-large')).toBeTruthy();
    expect(screen.getByText('--text-label-small')).toBeTruthy();

    const spacing = screen.getByRole('region', { name: 'Escala de espaçamento' });
    for (const value of ['4 px', '8 px', '12 px', '16 px', '24 px', '32 px']) {
      expect(within(spacing).getByText(value, { exact: true })).toBeTruthy();
    }
    expect(within(spacing).getByText('0,25 rem · unidade base')).toBeTruthy();
    expect(within(spacing).getByText('--spacing · tema Tailwind')).toBeTruthy();
    expect(spacing.textContent).toContain('16–24 px');
    expect(within(spacing).getByText('space-y-2 · campos de autenticação')).toBeTruthy();
    expect(within(spacing).getByText('lg:px-6 · conteúdo administrativo')).toBeTruthy();

    const radii = screen.getByRole('region', { name: 'Raios aprovados' });
    for (const [category, value] of [
      ['Controles', '8 px'],
      ['Cartões', '16 px'],
      ['Diálogos', '20 px'],
    ]) {
      expect(within(radii).getByText(category, { exact: true })).toBeTruthy();
      expect(within(radii).getByText(value, { exact: true })).toBeTruthy();
    }
    expect(within(radii).getByText('rounded-lg · campos e botões existentes')).toBeTruthy();
    expect(
      within(radii).getByText('rounded-2xl · autenticação, navegação e página 404'),
    ).toBeTruthy();
    expect(
      within(radii).getByText('Referência aprovada · sem componente de diálogo em uso'),
    ).toBeTruthy();

    const surfaceTokens = screen.getByRole('region', { name: 'Contorno e sombra das superfícies' });
    expect(within(surfaceTokens).getByText('--color-panel-outline')).toBeTruthy();
    expect(within(surfaceTokens).getByText('#D9D9D9')).toBeTruthy();
    expect(within(surfaceTokens).getByText('--shadow-panel')).toBeTruthy();
    expect(surfaceTokens.textContent).toContain('A borda clara é decorativa.');

    const surfaces = screen.getByRole('region', { name: 'Superfícies compartilhadas em uso' });
    for (const surfaceName of ['AuthPageLayout', 'AppLayout', 'NotFoundPage']) {
      const name = within(surfaces).getByText(surfaceName);
      const surface = name.closest('div');
      expect(surface?.classList.contains('panel-surface')).toBe(true);
      expect(surface?.classList.contains('rounded-2xl')).toBe(true);
    }
    expect(screen.getByText('/admin')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Ada Lovelace');
    expect(document.body.textContent).not.toMatch(/@example\\.test|Bearer /i);
  });

  it('puts each existing visual sample in one approved card and preserves the real surface cards', () => {
    renderRoute('/docs/design-system');

    const colors = screen.getByRole('region', { name: 'Papéis de cor' });
    const colorCards = expectSampleCards(colors, 15);
    expect(colorCards.map((card) => card.querySelector('code')?.textContent)).toEqual([
      '--color-primary',
      '--color-primary-hover',
      '--color-on-primary',
      '--color-highlight',
      '--color-success',
      '--color-success-surface',
      '--color-warning',
      '--color-warning-surface',
      '--color-surface',
      '--color-surface-container',
      '--color-on-surface',
      '--color-muted',
      '--color-outline',
      '--color-danger',
      '--color-error-surface',
    ]);

    const typography = screen.getByRole('region', { name: 'Escala tipográfica' });
    const typographyCards = expectSampleCards(typography, 15);
    expect(typographyCards.map((card) => card.querySelector('code')?.textContent)).toEqual([
      '--text-display-large',
      '--text-display-medium',
      '--text-display-small',
      '--text-headline-large',
      '--text-headline-medium',
      '--text-headline-small',
      '--text-title-large',
      '--text-title-medium',
      '--text-title-small',
      '--text-body-large',
      '--text-body-medium',
      '--text-body-small',
      '--text-label-large',
      '--text-label-medium',
      '--text-label-small',
    ]);

    const spacing = screen.getByRole('region', { name: 'Escala de espaçamento' });
    const spacingCards = expectSampleCards(spacing, 6);
    expect(spacingCards.map((card) => card.querySelector('code')?.textContent)).toEqual([
      '4 px',
      '8 px',
      '12 px',
      '16 px',
      '24 px',
      '32 px',
    ]);

    const radii = screen.getByRole('region', { name: 'Raios aprovados' });
    const radiusCards = expectSampleCards(radii, 3);
    expect(radiusCards.map((card) => card.querySelector('h3')?.textContent?.trim())).toEqual([
      'Controles',
      'Cartões',
      'Diálogos',
    ]);

    const surfaceTokens = screen.getByRole('region', {
      name: 'Contorno e sombra das superfícies',
    });
    const definitionCards = Array.from(surfaceTokens.querySelectorAll<HTMLElement>('dl > div'));
    expect(definitionCards).toHaveLength(2);
    definitionCards.forEach(expectApprovedCard);
    expect(definitionCards.map((card) => card.querySelector('dt')?.textContent?.trim())).toEqual([
      '--color-panel-outline',
      '--shadow-panel',
    ]);

    for (const region of [colors, typography, spacing, radii, surfaceTokens]) {
      const heading = within(region).getByRole('heading', { level: 2 });
      expect(heading.closest('.panel-surface')).toBeNull();
      const description = heading.parentElement?.querySelector('p');
      expect(description).toBeTruthy();
      expect(description?.closest('.panel-surface')).toBeNull();
    }

    const sharedSurfaces = screen.getByRole('region', {
      name: 'Superfícies compartilhadas em uso',
    });
    const existingCards = Array.from(
      sharedSurfaces.querySelectorAll<HTMLElement>('dl > div.panel-surface'),
    );
    expect(existingCards).toHaveLength(3);
    existingCards.forEach(expectApprovedCard);
    expect(existingCards.map((card) => card.querySelector('dt')?.textContent?.trim())).toEqual([
      'AuthPageLayout',
      'AppLayout',
      'NotFoundPage',
    ]);
  });

  it('keeps unknown routes on the branded 404 with a keyboard reachable return action', async () => {
    renderRoute('/unknown-path?detail=private-diagnostic');

    expect(screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Logo oficial do NotasMAX' })).toBeTruthy();
    expect(document.body.textContent).toContain('404');
    expect(document.body.textContent).not.toContain('private-diagnostic');
    expect(document.body.textContent).not.toMatch(/stack trace|exception|internal error/i);

    const returnLink = screen.getByRole('link', { name: 'Voltar para entrar' });
    expect(returnLink.getAttribute('href')).toBe('/');
    expect(returnLink.className).toContain('focus-visible:outline-2');
    await userEvent.setup().tab();
    expect(document.activeElement).toBe(returnLink);
  });

  it('omits the development route, page module, and identifying content from production output', async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), 'notasmax-production-gallery-'));

    try {
      await build({
        configFile: path.join(repositoryRoot, 'vite.config.ts'),
        root: repositoryRoot,
        mode: 'production',
        logLevel: 'silent',
        build: {
          outDir: outputDirectory,
          emptyOutDir: true,
          sourcemap: false,
          minify: false,
        },
      });

      const files = await listFiles(outputDirectory);
      const relativeOutputNames = files.map((file) => path.relative(outputDirectory, file));
      const textOutputs = files.filter((file) => /\.(?:html|css|js)$/i.test(file));
      const emittedText = (
        await Promise.all(textOutputs.map((file) => readFile(file, 'utf8')))
      ).join('\n');

      expect(relativeOutputNames.join('\n')).not.toMatch(/DesignSystemGalleryPage/i);
      expect(emittedText).not.toContain('/docs/design-system');
      expect(emittedText).not.toContain('Design system do NotasMAX');
      expect(emittedText).not.toContain('Layouts compartilhados em uso');
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  }, 120_000);
});
