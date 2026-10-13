// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import * as lifecycle from '../../academic/academicLifecycleService';
import { ClassOfferManagement } from './ClassOfferManagement';

vi.mock('../../academic/academicLifecycleService', () => ({
  addAcademicOffer: vi.fn(),
  addAcademicTeacher: vi.fn(),
  loadAcademicOfferPage: vi.fn(),
  loadAcademicSubjectChoices: vi.fn(),
  loadAcademicTeacherCandidates: vi.fn(),
  loadAcademicTeacherPage: vi.fn(),
  removeAcademicOffer: vi.fn(),
  removeAcademicTeacher: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(lifecycle.loadAcademicOfferPage).mockResolvedValue({
    items: [{ subjectId: '7', name: 'Matemática', description: null }],
    etag: '"offers-v1"',
  });
  vi.mocked(lifecycle.loadAcademicSubjectChoices).mockResolvedValue([]);
  vi.mocked(lifecycle.loadAcademicTeacherPage).mockResolvedValue({
    items: [
      {
        teacherId: '9',
        name: 'Professora',
        email: 'teacher@example.test',
        activationStatus: 'activated',
      },
    ],
    etag: '"teachers-v1"',
  });
});
afterEach(() => cleanup());

describe('class subject and teacher removals', () => {
  it('does not remove an offer on cancel and confirms once with the collection ETag', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ClassOfferManagement classId="44" />
      </MemoryRouter>,
    );
    await screen.findByText('Matemática');
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Adicionar matéria', 'Matérias da turma']);
    expect(screen.getByRole('heading', { name: 'Matérias da turma' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Adicionar matéria' })).toBeTruthy();
    const addButton = screen.getByRole('button', { name: 'Adicionar matéria' });
    expect(addButton.className).toContain('bg-primary');
    expect(addButton.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Remover matéria' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(lifecycle.removeAcademicOffer).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remover matéria' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar remoção' }));
    await waitFor(() => expect(lifecycle.removeAcademicOffer).toHaveBeenCalledOnce());
    expect(lifecycle.removeAcademicOffer).toHaveBeenCalledWith('44', '7', '"offers-v1"');
  });

  it('links to a dedicated teacher-management page for each subject', async () => {
    render(
      <MemoryRouter>
        <ClassOfferManagement classId="44" />
      </MemoryRouter>,
    );
    await screen.findByText('Matemática');
    expect(screen.getByRole('link', { name: 'Gerenciar professores' }).getAttribute('href')).toBe(
      '/admin/estrutura/turmas/44/materias/7/professores',
    );
    expect(screen.queryByRole('button', { name: 'Remover professor' })).toBeNull();
  });
});
