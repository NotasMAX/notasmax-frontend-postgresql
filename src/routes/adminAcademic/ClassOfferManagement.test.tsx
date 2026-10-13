// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    render(<ClassOfferManagement classId="44" />);
    await screen.findByText('Matemática');
    await user.click(screen.getByRole('button', { name: 'Remover matéria' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(lifecycle.removeAcademicOffer).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remover matéria' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar remoção' }));
    await waitFor(() => expect(lifecycle.removeAcademicOffer).toHaveBeenCalledOnce());
    expect(lifecycle.removeAcademicOffer).toHaveBeenCalledWith('44', '7', '"offers-v1"');
  });

  it('does not remove a teacher on cancel and confirms once with the teacher collection ETag', async () => {
    const user = userEvent.setup();
    render(<ClassOfferManagement classId="44" />);
    await screen.findByText('Matemática');
    await user.click(screen.getByRole('button', { name: 'Gerenciar professores' }));
    await screen.findByText('Professora');
    await user.click(screen.getByRole('button', { name: 'Remover professor' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(lifecycle.removeAcademicTeacher).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remover professor' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar remoção' }));
    await waitFor(() => expect(lifecycle.removeAcademicTeacher).toHaveBeenCalledOnce());
    expect(lifecycle.removeAcademicTeacher).toHaveBeenCalledWith('44', '7', '9', '"teachers-v1"');
  });
});
