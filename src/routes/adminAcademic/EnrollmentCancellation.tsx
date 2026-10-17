import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  loadAcademicEnrollment,
  cancelAcademicEnrollment,
} from '../../academic/academicLifecycleService';
import { getApiProblemPresentation } from '../../api/problemDetails';
import { accountErrorMessage } from '../adminAccounts/accountUi';

interface EnrollmentCancellationProps {
  readonly enrollmentId: string;
  readonly onCompleted: () => void;
}

interface CancellationDialogState {
  readonly id: string;
  readonly etag: string;
  readonly beforeStart: boolean;
}

export function saoPauloCivilDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function cancellationErrorMessage(error: unknown): string {
  const presentation = getApiProblemPresentation(error);
  const fieldErrors = presentation.fieldErrors.map(({ detail }) => detail);
  if (fieldErrors.length > 0) return fieldErrors.join(' ');
  return presentation.message ?? accountErrorMessage(error);
}

export function EnrollmentCancellation({ enrollmentId, onCompleted }: EnrollmentCancellationProps) {
  const [dialog, setDialog] = useState<CancellationDialogState | null>(null);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelInFlight = useRef(false);

  async function prepare() {
    setError(null);
    setDate('');
    try {
      const current = await loadAcademicEnrollment(enrollmentId);
      setDialog({
        id: current.enrollment.enrollmentId,
        etag: current.etag,
        beforeStart: current.enrollment.startDate > saoPauloCivilDate(),
      });
    } catch (cause) {
      setError(accountErrorMessage(cause));
    }
  }

  async function confirm() {
    if (!dialog || (!dialog.beforeStart && !date) || busy || cancelInFlight.current) return;
    cancelInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await cancelAcademicEnrollment(dialog.id, dialog.beforeStart ? undefined : date, dialog.etag);
      setDialog(null);
      onCompleted();
    } catch (cause) {
      cancelInFlight.current = false;
      setError(cancellationErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && !dialog && (
        <p aria-live="assertive" className="text-danger" role="alert">
          {error}
        </p>
      )}
      <Button leadingIcon="close" onClick={() => void prepare()} type="button" variant="danger">
        Cancelar matrícula
      </Button>
      {dialog && (
        <ConfirmDialog
          confirmLabel="Confirmar cancelamento"
          confirmDisabled={!dialog.beforeStart && !date}
          confirmTone="danger"
          errorMessage={error}
          onCancel={() => {
            setDialog(null);
            setError(null);
          }}
          onConfirm={() => void confirm()}
          pending={busy}
          pendingLabel="Cancelando…"
          title="Cancelar matrícula?"
        >
          {dialog.beforeStart ? (
            <p>
              A matrícula ainda não começou. O cancelamento será imediato e ficará registrado no
              histórico do aluno.
            </p>
          ) : (
            <>
              <p>
                A matrícula será encerrada na data informada e continuará no histórico do aluno.
              </p>
              <label className="mt-3 block space-y-2">
                Data efetiva do cancelamento
                <input
                  className="min-h-11 w-full rounded-lg border border-outline bg-surface px-3"
                  min={saoPauloCivilDate()}
                  required
                  type="date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.currentTarget.value);
                    setError(null);
                  }}
                />
              </label>
            </>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
