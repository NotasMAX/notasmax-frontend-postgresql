// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as accountService from '../../accounts/accountService';
import * as lifecycle from '../../academic/academicLifecycleService';
import { ActiveEnrollmentCancellation } from './ActiveEnrollmentCancellation';

vi.mock('../../accounts/accountService', () => ({ loadAccountPage: vi.fn() }));
vi.mock('../../academic/academicLifecycleService', () => ({
  cancelAcademicEnrollment: vi.fn(),
  loadAcademicEnrollment: vi.fn(),
}));
const student = {
  studentId: '12',
  name: 'Ana',
  email: 'ana@example.test',
  activationStatus: 'activated' as const,
  guardianPhone: '000',
  enrollmentStatus: 'active' as const,
  currentClass: { series: 2, schoolYear: 2026 },
  enrollments: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(accountService.loadAccountPage).mockResolvedValue({
    items: [{ ...student, enrollmentId: '77' }],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
  vi.mocked(lifecycle.loadAcademicEnrollment).mockResolvedValue({
    enrollment: {
      enrollmentId: '77',
      studentId: '12',
      classId: '44',
      startDate: '2026-02-01',
      cancellationDate: null,
    },
    etag: '"enrollment-v1"',
  });
});
afterEach(() => cleanup());

describe('active enrollment cancellation', () => {
  it('canceling the confirmation writes nothing', async () => {
    const user = userEvent.setup();
    render(<ActiveEnrollmentCancellation onCompleted={vi.fn()} student={student} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar matrícula ativa' }));
    expect(accountService.loadAccountPage).toHaveBeenCalledWith('student', {
      search: student.email,
      enrollmentStatus: 'active',
      page: 1,
      pageSize: 20,
    });
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
    );
    expect(lifecycle.cancelAcademicEnrollment).not.toHaveBeenCalled();
  });

  it('does not expose an account lookup failure diagnostic', async () => {
    const user = userEvent.setup();
    vi.mocked(accountService.loadAccountPage).mockRejectedValueOnce(
      new Error('internal database diagnostic'),
    );
    render(<ActiveEnrollmentCancellation onCompleted={vi.fn()} student={student} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar matrícula ativa' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).not.toContain('internal database diagnostic');
    expect(lifecycle.loadAcademicEnrollment).not.toHaveBeenCalled();
    expect(lifecycle.cancelAcademicEnrollment).not.toHaveBeenCalled();
  });

  it('confirms one cancellation with the civil date and current enrollment ETag', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    vi.mocked(lifecycle.cancelAcademicEnrollment).mockResolvedValue();
    render(<ActiveEnrollmentCancellation onCompleted={onCompleted} student={student} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar matrícula ativa' }));
    fireEvent.change(await screen.findByLabelText('Data efetiva do cancelamento'), {
      target: { value: '2026-06-15' },
    });
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    await waitFor(() => expect(lifecycle.cancelAcademicEnrollment).toHaveBeenCalledOnce());
    expect(lifecycle.cancelAcademicEnrollment).toHaveBeenCalledWith(
      '77',
      '2026-06-15',
      '"enrollment-v1"',
    );
    expect(onCompleted).toHaveBeenCalledOnce();
  });
});
