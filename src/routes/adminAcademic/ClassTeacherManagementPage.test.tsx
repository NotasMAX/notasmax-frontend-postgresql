// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as lifecycle from '../../academic/academicLifecycleService';
import * as structure from '../../academic/academicStructureService';
import { ClassTeacherManagementPage } from './ClassTeacherManagementPage';

vi.mock('../../academic/academicStructureService', () => ({ loadAcademicClass: vi.fn() }));
vi.mock('../../academic/academicLifecycleService', () => ({
  addAcademicTeacher: vi.fn(),
  loadAcademicOfferPage: vi.fn(),
  loadAcademicTeacherCandidates: vi.fn(),
  loadAcademicTeacherPage: vi.fn(),
  removeAcademicTeacher: vi.fn(),
}));

const route = '/admin/estrutura/turmas/:classId/materias/:subjectId/professores';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/estrutura/turmas/44/materias/7/professores']}>
      <Routes>
        <Route element={<ClassTeacherManagementPage />} path={route} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(structure.loadAcademicClass).mockResolvedValue({
    schoolClass: {
      classId: '44',
      series: 1,
      schoolYear: 2026,
      startDate: '2026-10-13',
      isClosed: false,
    },
    etag: '"class-v1"',
  });
  vi.mocked(lifecycle.loadAcademicOfferPage).mockResolvedValue({
    items: [{ subjectId: '7', name: 'Matemática', description: null }],
    etag: '"offers-v1"',
  });
  vi.mocked(lifecycle.loadAcademicTeacherPage).mockResolvedValue({
    items: [
      {
        teacherId: '9',
        name: 'Professora associada',
        email: 'associated@example.test',
        activationStatus: 'activated',
      },
    ],
    etag: '"teachers-v1"',
  });
  vi.mocked(lifecycle.loadAcademicTeacherCandidates).mockResolvedValue({
    items: [
      {
        teacherId: '10',
        name: 'Professor disponível',
        email: 'candidate@example.test',
        activationStatus: 'activated',
      },
    ],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
});

afterEach(() => cleanup());

describe('dedicated class teacher-management page', () => {
  it('retries the failed initial management load and displays the loaded teachers', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycle.loadAcademicTeacherPage)
      .mockRejectedValueOnce(new Error('temporary teacher load failure'))
      .mockResolvedValueOnce({
        items: [
          {
            teacherId: '9',
            name: 'Professora associada',
            email: 'associated@example.test',
            activationStatus: 'activated',
          },
        ],
        etag: '"teachers-v2"',
      });

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Não foi possível concluir esta ação. Tente novamente.');
    expect(alert.textContent).not.toContain('temporary teacher load failure');
    expect(lifecycle.loadAcademicTeacherPage).toHaveBeenCalledTimes(1);

    expect(alert.getAttribute('aria-live')).toBe('assertive');
    const retryButton = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(retryButton.parentElement).toBe(alert.parentElement);
    expect(retryButton.closest('[role="alert"], [aria-live]')).toBeNull();

    await user.click(retryButton);

    expect(await screen.findByText('Professora associada')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    expect(lifecycle.loadAcademicTeacherPage).toHaveBeenCalledTimes(2);
  });

  it('shows class and subject context and returns to the class detail', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Gerenciar professores' })).toBeTruthy();
    const associatedSection = screen
      .getByRole('heading', { name: 'Professores associados' })
      .closest('section');
    expect(within(associatedSection as HTMLElement).getByText(/Matemática/)).toBeTruthy();
    expect(screen.getByText('Professora associada')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Voltar à turma' }).getAttribute('href')).toBe(
      '/admin/estrutura/turmas/44',
    );
  });

  it('searches and associates a teacher using the current collection ETag', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Professora associada');
    await user.type(
      screen.getByRole('textbox', { name: 'Buscar professor por nome ou e-mail' }),
      'disponível',
    );
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    const candidateCard = await screen.findByRole('list', { name: 'Professores disponíveis' });
    expect(within(candidateCard).getByText('Professor disponível')).toBeTruthy();
    expect(within(candidateCard).getByText('candidate@example.test')).toBeTruthy();
    await user.click(within(candidateCard).getByRole('button', { name: 'Associar professor' }));

    await waitFor(() => expect(lifecycle.addAcademicTeacher).toHaveBeenCalledOnce());
    expect(lifecycle.addAcademicTeacher).toHaveBeenCalledWith('44', '7', '10', '"teachers-v1"');
    expect(lifecycle.loadAcademicTeacherCandidates).toHaveBeenCalledWith({
      search: 'disponível',
      page: 1,
      pageSize: 20,
    });
  });

  it('explains when a search has no available teachers', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycle.loadAcademicTeacherCandidates).mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    renderPage();
    await screen.findByText('Professora associada');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(
      await screen.findByText('Nenhum professor disponível para associação com esta busca.'),
    ).toBeTruthy();
  });

  it('requires confirmation before removing an associated teacher', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Professora associada');
    await user.click(screen.getByRole('button', { name: 'Remover professor' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(lifecycle.removeAcademicTeacher).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Remover professor' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar remoção' }));
    await waitFor(() => expect(lifecycle.removeAcademicTeacher).toHaveBeenCalledOnce());
    expect(lifecycle.removeAcademicTeacher).toHaveBeenCalledWith('44', '7', '9', '"teachers-v1"');
  });
});
