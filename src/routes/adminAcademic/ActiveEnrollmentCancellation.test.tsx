// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as lifecycle from '../../academic/academicLifecycleService';
import { ApiRequestError } from '../../api/problemDetails';
import { EnrollmentCancellation, saoPauloCivilDate } from './EnrollmentCancellation';
vi.mock('../../academic/academicLifecycleService', () => ({
  cancelAcademicEnrollment: vi.fn(),
  loadAcademicEnrollment: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(lifecycle.loadAcademicEnrollment).mockResolvedValue({
    enrollment: {
      enrollmentId: '77',
      studentId: '12',
      classId: '44',
      startDate: '2026-02-01',
      cancellationDate: null,
      cancellationRequestedAt: null,
    },
    etag: '"enrollment-v1"',
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('enrollment cancellation', () => {
  it('uses the Sao Paulo civil date across the UTC date boundary', () => {
    expect(saoPauloCivilDate(new Date('2026-10-16T02:59:59.999Z'))).toBe('2026-10-15');
    expect(saoPauloCivilDate(new Date('2026-10-16T03:00:00.000Z'))).toBe('2026-10-16');
  });

  it.each([
    {
      instant: '2026-10-16T02:59:59.999Z',
      civilDate: '2026-10-15',
      beforeStart: true,
    },
    {
      instant: '2026-10-16T03:00:00.000Z',
      civilDate: '2026-10-16',
      beforeStart: false,
    },
  ])(
    'chooses the cancellation flow using the Sao Paulo date at $instant',
    async ({ instant, civilDate, beforeStart }) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(instant));
      vi.mocked(lifecycle.loadAcademicEnrollment).mockResolvedValueOnce({
        enrollment: {
          enrollmentId: '77',
          studentId: '12',
          classId: '44',
          startDate: '2026-10-16',
          cancellationDate: null,
          cancellationRequestedAt: null,
        },
        etag: '"enrollment-v1"',
      });
      vi.mocked(lifecycle.cancelAcademicEnrollment).mockResolvedValue();
      render(<EnrollmentCancellation enrollmentId="77" onCompleted={vi.fn()} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar matrícula' }));
        await Promise.resolve();
      });

      if (beforeStart) {
        expect(screen.getByText(/ainda não começou/i)).toBeTruthy();
        expect(screen.queryByLabelText('Data efetiva do cancelamento')).toBeNull();
        expect(lifecycle.cancelAcademicEnrollment).not.toHaveBeenCalled();
        return;
      }

      const dateInput = screen.getByLabelText('Data efetiva do cancelamento');
      expect(dateInput.getAttribute('min')).toBe(civilDate);
      expect(dateInput.hasAttribute('required')).toBe(true);
      const confirmButton = screen.getByRole('button', { name: 'Confirmar cancelamento' });
      expect((confirmButton as HTMLButtonElement).disabled).toBe(true);

      await act(async () => {
        fireEvent.change(dateInput, { target: { value: civilDate } });
      });
      expect((confirmButton as HTMLButtonElement).disabled).toBe(false);
      await act(async () => {
        fireEvent.click(confirmButton);
        await Promise.resolve();
      });
      expect(lifecycle.cancelAcademicEnrollment).toHaveBeenCalledWith(
        '77',
        '2026-10-16',
        '"enrollment-v1"',
      );
    },
  );

  it('cycles through the started-enrollment date and actions with Tab and Shift+Tab', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycle.loadAcademicEnrollment).mockResolvedValueOnce({
      enrollment: {
        enrollmentId: '77',
        studentId: '12',
        classId: '44',
        startDate: '1900-01-01',
        cancellationDate: null,
        cancellationRequestedAt: null,
      },
      etag: '"enrollment-v1"',
    });
    render(<EnrollmentCancellation enrollmentId="77" onCompleted={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar matrícula' }));

    const date = screen.getByLabelText('Data efetiva do cancelamento');
    const dialog = screen.getByRole('alertdialog', { name: 'Cancelar matrícula?' });
    const cancel = within(dialog).getByRole('button', { name: 'Cancelar' });
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar cancelamento' });
    expect(document.activeElement).toBe(date);
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(date, { target: { value: saoPauloCivilDate() } });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);

    await user.tab();
    expect(document.activeElement).toBe(cancel);
    await user.tab();
    expect(document.activeElement).toBe(confirm);
    await user.tab();
    expect(document.activeElement).toBe(date);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirm);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(cancel);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(date);
    expect(lifecycle.cancelAcademicEnrollment).not.toHaveBeenCalled();
  });

  it('returns focus to the cancellation trigger after Escape', async () => {
    const user = userEvent.setup();
    render(<EnrollmentCancellation enrollmentId="77" onCompleted={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Cancelar matrícula' });

    await user.click(trigger);
    const date = await screen.findByLabelText('Data efetiva do cancelamento');
    expect(document.activeElement).toBe(date);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(lifecycle.cancelAcademicEnrollment).not.toHaveBeenCalled();
  });

  it.each([
    {
      instant: '2026-10-16T02:59:59.999Z',
      civilDate: '2026-10-15',
    },
    {
      instant: '2026-10-16T03:00:00.000Z',
      civilDate: '2026-10-16',
    },
  ])(
    'sets the started-enrollment date minimum to the Sao Paulo date at $instant',
    async ({ instant, civilDate }) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(instant));
      vi.mocked(lifecycle.loadAcademicEnrollment).mockResolvedValueOnce({
        enrollment: {
          enrollmentId: '77',
          studentId: '12',
          classId: '44',
          startDate: '2026-10-01',
          cancellationDate: null,
          cancellationRequestedAt: null,
        },
        etag: '"enrollment-v1"',
      });
      render(<EnrollmentCancellation enrollmentId="77" onCompleted={vi.fn()} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar matrícula' }));
        await Promise.resolve();
      });

      const dateInput = screen.getByLabelText('Data efetiva do cancelamento');
      expect(dateInput.getAttribute('min')).toBe(civilDate);
    },
  );

  it('canceling the confirmation writes nothing', async () => {
    const user = userEvent.setup();
    render(<EnrollmentCancellation enrollmentId="77" onCompleted={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar matrícula' }));
    expect(lifecycle.loadAcademicEnrollment).toHaveBeenCalledWith('77');
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
    );
    expect(lifecycle.cancelAcademicEnrollment).not.toHaveBeenCalled();
  });

  it('does not expose an enrollment lookup failure diagnostic', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycle.loadAcademicEnrollment).mockRejectedValueOnce(
      new Error('internal database diagnostic'),
    );
    render(<EnrollmentCancellation enrollmentId="77" onCompleted={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar matrícula' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).not.toContain('internal database diagnostic');
    expect(lifecycle.cancelAcademicEnrollment).not.toHaveBeenCalled();
  });

  it('confirms one cancellation with the civil date and current enrollment ETag', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    vi.mocked(lifecycle.cancelAcademicEnrollment).mockResolvedValue();
    render(<EnrollmentCancellation enrollmentId="77" onCompleted={onCompleted} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar matrícula' }));
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

  it('cancels a scheduled enrollment immediately and explains that it has not started', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    vi.mocked(lifecycle.loadAcademicEnrollment).mockResolvedValueOnce({
      enrollment: {
        enrollmentId: '77',
        studentId: '12',
        classId: '44',
        startDate: '2999-02-01',
        cancellationDate: null,
        cancellationRequestedAt: null,
      },
      etag: '"enrollment-v1"',
    });
    vi.mocked(lifecycle.cancelAcademicEnrollment).mockResolvedValue();
    render(<EnrollmentCancellation enrollmentId="77" onCompleted={onCompleted} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar matrícula' }));
    expect(await screen.findByText(/ainda não começou/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    await waitFor(() =>
      expect(lifecycle.cancelAcademicEnrollment).toHaveBeenCalledWith(
        '77',
        undefined,
        '"enrollment-v1"',
      ),
    );
    expect(onCompleted).toHaveBeenCalledOnce();
  });

  it('keeps the dialog open after rejection and shows only safe public field text', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    const error = new ApiRequestError({
      status: 422,
      problem: {
        type: 'about:blank',
        title: 'Dados inválidos',
        status: 422,
        detail: 'Revise a data efetiva informada.',
        code: 'VALIDATION_ERROR',
        errors: [
          {
            code: 'INVALID_VALUE',
            detail: 'A data efetiva deve ser posterior ao início da matrícula.',
            source: { in: 'body', pointer: '/cancellationDate' },
          },
        ],
      },
    });
    error.message = 'internal database diagnostic';
    vi.mocked(lifecycle.cancelAcademicEnrollment).mockRejectedValueOnce(error);
    render(<EnrollmentCancellation enrollmentId="77" onCompleted={onCompleted} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar matrícula' }));
    fireEvent.change(await screen.findByLabelText('Data efetiva do cancelamento'), {
      target: { value: '2026-06-15' },
    });
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));

    const dialog = await screen.findByRole('alertdialog');
    const alert = within(dialog).getByRole('alert');
    expect(alert.textContent).toContain(
      'A data efetiva deve ser posterior ao início da matrícula.',
    );
    expect(alert.textContent).not.toContain('internal database diagnostic');
    expect(screen.getByRole('heading', { name: 'Cancelar matrícula?' })).toBeTruthy();
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and uses the generic message for an internal rejection', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    vi.mocked(lifecycle.cancelAcademicEnrollment).mockRejectedValueOnce(
      new Error('internal database diagnostic; SELECT secret_value'),
    );
    render(<EnrollmentCancellation enrollmentId="77" onCompleted={onCompleted} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar matrícula' }));
    fireEvent.change(await screen.findByLabelText('Data efetiva do cancelamento'), {
      target: { value: '2026-06-15' },
    });
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));

    const dialog = await screen.findByRole('alertdialog');
    const alert = within(dialog).getByRole('alert');
    expect(alert.textContent).toBe('Não foi possível concluir esta ação. Tente novamente.');
    expect(alert.textContent).not.toContain('internal database diagnostic');
    expect(alert.textContent).not.toContain('SELECT secret_value');
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
