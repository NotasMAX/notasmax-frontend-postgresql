import { useRef, useState } from 'react';
import type { StudentAccountDetail } from '../../api/adminAccounts';
import { loadAccountPage } from '../../accounts/accountService';
import {
  cancelAcademicEnrollment,
  loadAcademicEnrollment,
} from '../../academic/academicLifecycleService';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { accountErrorMessage } from '../adminAccounts/accountUi';

export function ActiveEnrollmentCancellation({
  student,
  onCompleted,
}: {
  readonly student: StudentAccountDetail;
  readonly onCompleted: () => void;
}) {
  const [dialog, setDialog] = useState<{ id: string; etag: string } | null>(null);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelInFlight = useRef(false);

  async function prepare() {
    setError(null);
    try {
      const result = await loadAccountPage('student', {
        search: student.email,
        enrollmentStatus: 'active',
        page: 1,
        pageSize: 20,
      });
      const match = result.items.find(
        (item) => 'studentId' in item && item.studentId === student.studentId && item.enrollmentId,
      );
      if (!match || !('studentId' in match) || !match.enrollmentId)
        throw new Error(
          'Não foi possível identificar a matrícula ativa. Atualize os dados e tente novamente.',
        );
      const current = await loadAcademicEnrollment(match.enrollmentId);
      setDialog({ id: current.enrollment.enrollmentId, etag: current.etag });
    } catch (cause) {
      setError(accountErrorMessage(cause));
    }
  }

  async function confirm() {
    if (!dialog || !date || busy || cancelInFlight.current) return;
    cancelInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await cancelAcademicEnrollment(dialog.id, date, dialog.etag);
      setDialog(null);
      onCompleted();
    } catch (cause) {
      cancelInFlight.current = false;
      setDialog(null);
      setError(accountErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" aria-live="assertive" className="text-danger">
          {error}
        </p>
      )}
      <button
        className="account-button-secondary min-h-11 rounded-lg border border-panel-outline px-4 text-label-large font-medium text-primary disabled:opacity-70"
        disabled={busy || student.enrollmentStatus !== 'active'}
        onClick={() => void prepare()}
        type="button"
      >
        Cancelar matrícula ativa
      </button>
      {dialog && (
        <ConfirmDialog
          confirmLabel="Confirmar cancelamento"
          confirmDisabled={!date}
          onCancel={() => setDialog(null)}
          onConfirm={() => void confirm()}
          pending={busy}
          pendingLabel="Cancelando…"
          title="Cancelar matrícula?"
        >
          <p>
            A matrícula ativa será cancelada na data informada, desde que a turma permita o
            cancelamento.
          </p>
          <label className="mt-3 block space-y-2">
            Data efetiva do cancelamento
            <input
              autoFocus
              className="min-h-11 w-full rounded-lg border border-outline bg-surface px-3"
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.currentTarget.value)}
            />
          </label>
        </ConfirmDialog>
      )}
    </div>
  );
}
