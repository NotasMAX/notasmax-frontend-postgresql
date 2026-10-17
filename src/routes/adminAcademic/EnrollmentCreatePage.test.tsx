// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../api/problemDetails';
import * as accountService from '../../accounts/accountService';
import * as structure from '../../academic/academicStructureService';
import * as lifecycle from '../../academic/academicLifecycleService';
import { EnrollmentCreatePage } from './EnrollmentCreatePage';

vi.mock('../../accounts/accountService', () => ({ loadAccountPage: vi.fn() }));
vi.mock('../../academic/academicStructureService', () => ({ loadAllAcademicClasses: vi.fn() }));
vi.mock('../../academic/academicLifecycleService', () => ({
  startAcademicEnrollment: vi.fn(),
  loadAcademicEnrollment: vi.fn(),
  confirmAcademicEnrollment: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/estrutura/matriculas/nova']}>
      <Routes>
        <Route path="/admin/estrutura/matriculas/nova" element={<EnrollmentCreatePage />} />
        <Route path="/admin/contas/alunos/:studentId" element={<p>Matrícula concluída</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(structure.loadAllAcademicClasses).mockResolvedValue([
    { classId: '44', series: 2, schoolYear: 2026, isClosed: false },
  ]);
  vi.mocked(accountService.loadAccountPage).mockResolvedValue({
    items: [
      {
        studentId: '12',
        name: 'Ana',
        email: 'ana@example.test',
        activationStatus: 'activated',
        enrollmentStatus: 'no_active_enrollment',
        currentClass: null,
      },
    ],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
});
afterEach(() => cleanup());

describe('existing-student enrollment', () => {
  it('shows the enrollment form only after a student is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByLabelText('Ano letivo')).toBeNull();
    expect(screen.queryByLabelText('Série')).toBeNull();
    expect(
      screen.getByText('Escolha um aluno, uma turma e a data de início para criar a matrícula.'),
    ).toBeTruthy();
    expect(screen.getByText('Buscar aluno sem matrícula ativa').className).toContain(
      'text-label-large',
    );
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    const studentCard = await screen.findByRole('button', { name: /Ana.*ana@example\.test/ });
    expect(studentCard.getAttribute('aria-pressed')).toBe('false');
    expect(studentCard.closest('section')?.previousElementSibling).toBe(
      screen.getByRole('button', { name: 'Buscar' }).closest('form'),
    );
    expect(screen.queryByLabelText('Ano letivo')).toBeNull();
    expect(screen.queryByLabelText('Série')).toBeNull();

    studentCard.focus();
    await user.keyboard('{Enter}');
    expect(studentCard.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Ano letivo')).toBeTruthy();
    expect(screen.getByLabelText('Série')).toBeTruthy();
    expect(screen.getByLabelText('Data de início')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cancelar' }).className).toContain(
      'border-panel-outline',
    );
  });

  it('creates one enrollment with the selected class and date-only value', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycle.startAcademicEnrollment).mockResolvedValue({ enrollmentId: '77' });
    renderPage();
    await user.type(screen.getByLabelText('Buscar aluno sem matrícula ativa'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.click(await screen.findByRole('button', { name: /Ana.*ana@example\.test/ }));
    await user.selectOptions(screen.getByLabelText('Ano letivo'), '2026');
    await user.selectOptions(screen.getByLabelText('Série'), '44');
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: 'Criar matrícula' }));
    await waitFor(() => expect(lifecycle.startAcademicEnrollment).toHaveBeenCalledOnce());
    expect(lifecycle.startAcademicEnrollment).toHaveBeenCalledWith('44', {
      studentId: '12',
      startDate: '2026-02-01',
    });
    expect(accountService.loadAccountPage).toHaveBeenCalledWith('student', {
      search: 'Ana',
      enrollmentStatus: 'no_active_enrollment',
      page: 1,
      pageSize: 20,
    });
  });

  it('does not expose an account lookup failure diagnostic', async () => {
    const user = userEvent.setup();
    vi.mocked(accountService.loadAccountPage).mockRejectedValueOnce(
      new Error('internal database diagnostic'),
    );
    renderPage();
    await user.type(screen.getByLabelText('Buscar aluno sem matrícula ativa'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).not.toContain('internal database diagnostic');
    expect(accountService.loadAccountPage).toHaveBeenCalledWith('student', {
      search: 'Ana',
      enrollmentStatus: 'no_active_enrollment',
      page: 1,
      pageSize: 20,
    });
  });

  it('requires explicit renewal confirmation and submits once with the exact ETag', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycle.startAcademicEnrollment).mockRejectedValue(
      new ApiRequestError({
        status: 409,
        problem: {
          status: 409,
          code: 'PREVIOUS_YEAR_ENROLLMENT_CONFIRMATION_REQUIRED',
          previousEnrollmentId: '66',
        },
      }),
    );
    vi.mocked(lifecycle.loadAcademicEnrollment).mockResolvedValue({
      enrollment: {
        enrollmentId: '66',
        studentId: '12',
        classId: '43',
        startDate: '2025-02-01',
        cancellationDate: null,
        cancellationRequestedAt: null,
      },
      etag: '"enrollment-v1"',
    });
    vi.mocked(lifecycle.confirmAcademicEnrollment).mockResolvedValue({ enrollmentId: '77' });
    renderPage();
    await user.type(screen.getByLabelText('Buscar aluno sem matrícula ativa'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.click(await screen.findByRole('button', { name: /Ana.*ana@example\.test/ }));
    await user.selectOptions(screen.getByLabelText('Ano letivo'), '2026');
    await user.selectOptions(screen.getByLabelText('Série'), '44');
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: 'Criar matrícula' }));
    expect(
      await screen.findByRole('alertdialog', { name: 'Confirmar renovação de matrícula?' }),
    ).toBeTruthy();
    expect(lifecycle.confirmAcademicEnrollment).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar renovação' }));
    await waitFor(() => expect(lifecycle.confirmAcademicEnrollment).toHaveBeenCalledOnce());
    expect(lifecycle.confirmAcademicEnrollment).toHaveBeenCalledWith(
      '44',
      { studentId: '12', startDate: '2026-02-01', confirmPreviousEnrollmentId: '66' },
      '"enrollment-v1"',
    );
  });

  it('canceling renewal confirmation never sends the confirmed enrollment request', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycle.startAcademicEnrollment).mockRejectedValue(
      new ApiRequestError({
        status: 409,
        problem: {
          status: 409,
          code: 'PREVIOUS_YEAR_ENROLLMENT_CONFIRMATION_REQUIRED',
          previousEnrollmentId: '66',
        },
      }),
    );
    vi.mocked(lifecycle.loadAcademicEnrollment).mockResolvedValue({
      enrollment: {
        enrollmentId: '66',
        studentId: '12',
        classId: '43',
        startDate: '2025-02-01',
        cancellationDate: null,
        cancellationRequestedAt: null,
      },
      etag: '"enrollment-v1"',
    });
    renderPage();
    await user.type(screen.getByLabelText('Buscar aluno sem matrícula ativa'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.click(await screen.findByRole('button', { name: /Ana.*ana@example\.test/ }));
    await user.selectOptions(screen.getByLabelText('Ano letivo'), '2026');
    await user.selectOptions(screen.getByLabelText('Série'), '44');
    fireEvent.change(screen.getByLabelText('Data de início'), {
      target: { value: '2026-02-01' },
    });
    await user.click(screen.getByRole('button', { name: 'Criar matrícula' }));
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Confirmar renovação de matrícula?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(lifecycle.confirmAcademicEnrollment).not.toHaveBeenCalled();
  });
});
