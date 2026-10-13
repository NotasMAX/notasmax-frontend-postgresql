import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { StudentAccountSummary } from '../../api/adminAccounts';
import type { AdminClassOption } from '../../api/adminAcademicCatalog';
import { ApiRequestError } from '../../api/problemDetails';
import { loadAccountPage } from '../../accounts/accountService';
import { loadAllAcademicClasses } from '../../academic/academicStructureService';
import {
  confirmAcademicEnrollment,
  loadAcademicEnrollment,
  startAcademicEnrollment,
} from '../../academic/academicLifecycleService';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { accountErrorMessage, civilDateLabel } from '../adminAccounts/accountUi';

const field =
  'min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface';
const button =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary disabled:opacity-70';

export function EnrollmentCreatePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<readonly StudentAccountSummary[]>([]);
  const [classes, setClasses] = useState<readonly AdminClassOption[]>([]);
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [renewal, setRenewal] = useState<{ id: string; etag: string; startDate: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    void loadAllAcademicClasses()
      .then(setClasses)
      .catch((cause: unknown) => setError(accountErrorMessage(cause)));
  }, []);

  async function searchStudents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const result = await loadAccountPage('student', {
        search: query.trim(),
        enrollmentStatus: 'no_active_enrollment',
        page: 1,
        pageSize: 20,
      });
      setStudents(
        result.items.filter((item): item is StudentAccountSummary => 'studentId' in item),
      );
    } catch (cause) {
      setError(accountErrorMessage(cause));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !studentId || !classId || !startDate) return;
    submitting.current = true;
    setBusy(true);
    let completed = false;
    setError(null);
    try {
      await startAcademicEnrollment(classId, { studentId, startDate });
      navigate(`/admin/contas/alunos/${encodeURIComponent(studentId)}`, { replace: true });
      completed = true;
    } catch (cause) {
      if (
        cause instanceof ApiRequestError &&
        cause.status === 409 &&
        cause.problem?.code === 'PREVIOUS_YEAR_ENROLLMENT_CONFIRMATION_REQUIRED' &&
        cause.problem.previousEnrollmentId
      ) {
        try {
          const previous = await loadAcademicEnrollment(cause.problem.previousEnrollmentId);
          setRenewal({
            id: previous.enrollment.enrollmentId,
            etag: previous.etag,
            startDate: previous.enrollment.startDate,
          });
        } catch (readError) {
          setError(accountErrorMessage(readError));
        }
      } else setError(accountErrorMessage(cause));
    } finally {
      if (!completed) submitting.current = false;
      setBusy(false);
    }
  }

  async function confirmRenewal() {
    if (!renewal || submitting.current || !classId || !studentId || !startDate) return;
    submitting.current = true;
    setBusy(true);
    let completed = false;
    setError(null);
    try {
      await confirmAcademicEnrollment(
        classId,
        { studentId, startDate, confirmPreviousEnrollmentId: renewal.id },
        renewal.etag,
      );
      setRenewal(null);
      navigate(`/admin/contas/alunos/${encodeURIComponent(studentId)}`, { replace: true });
      completed = true;
    } catch (cause) {
      setRenewal(null);
      setError(accountErrorMessage(cause));
    } finally {
      if (!completed) submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-headline-medium font-semibold">Nova matrícula</h1>
        <p className="text-body-large text-muted">
          Selecione um aluno existente, uma turma e a data civil de início. A API valida se a turma
          aceita matrícula.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-error-surface p-4 text-danger"
        >
          {error}
        </p>
      )}
      <form
        onSubmit={searchStudents}
        className="panel-surface space-y-3 rounded-2xl bg-surface p-5"
      >
        <label className="block space-y-2">
          Buscar aluno sem matrícula ativa
          <input
            className={field}
            maxLength={120}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <button className={button} type="submit">
          Buscar alunos
        </button>
        {students.length > 0 && (
          <label className="block space-y-2">
            Aluno
            <select
              className={field}
              required
              value={studentId}
              onChange={(event) => setStudentId(event.currentTarget.value)}
            >
              <option value="">Selecione</option>
              {students.map((student) => (
                <option key={student.studentId} value={student.studentId}>
                  {student.name} · {student.email}
                </option>
              ))}
            </select>
          </label>
        )}
      </form>
      <form
        onSubmit={(event) => void submit(event)}
        className="panel-surface space-y-4 rounded-2xl bg-surface p-5"
      >
        <label className="block space-y-2">
          Turma
          <select
            className={field}
            required
            value={classId}
            onChange={(event) => setClassId(event.currentTarget.value)}
          >
            <option value="">Selecione</option>
            {classes.map((item) => (
              <option key={item.classId} value={item.classId}>
                {item.series}ª série — {item.schoolYear} · {item.classId}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          Data de início
          <input
            className={field}
            required
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.currentTarget.value)}
          />
        </label>
        <div className="flex gap-3">
          <button className={button} disabled={busy || !studentId} type="submit">
            {busy ? 'Salvando…' : 'Criar matrícula'}
          </button>
          <Link
            className="inline-flex min-h-11 items-center px-4 text-primary"
            to="/admin/contas/alunos"
          >
            Cancelar
          </Link>
        </div>
      </form>
      {renewal && (
        <ConfirmDialog
          confirmLabel="Confirmar renovação"
          onCancel={() => setRenewal(null)}
          onConfirm={() => void confirmRenewal()}
          pending={busy}
          pendingLabel="Confirmando…"
          title="Confirmar renovação de matrícula?"
        >
          A matrícula anterior iniciada em {civilDateLabel(renewal.startDate)} será considerada. A
          confirmação será enviada uma vez com a versão atual lida pela API; uma versão
          desatualizada exige nova ação manual.
        </ConfirmDialog>
      )}
    </section>
  );
}
