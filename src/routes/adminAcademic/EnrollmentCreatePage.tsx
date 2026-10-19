import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
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
import { Badge } from '../../components/Badge';
import { ActionLink } from '../../components/ActionLink';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import {
  accountErrorMessage,
  activationStatusLabel,
  activationStatusTone,
  civilDateLabel,
  enrollmentStatusLabel,
} from '../adminAccounts/accountUi';
import { CenteredSubmitButton } from '../../components/CenteredSubmitButton';
import { SelectField } from '../../components/SelectField';
import { AcademicPageLayout } from './AcademicPageLayout';

const field =
  'min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';
export function EnrollmentCreatePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<readonly StudentAccountSummary[]>([]);
  const [classes, setClasses] = useState<readonly AdminClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [classId, setClassId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [renewal, setRenewal] = useState<{ id: string; etag: string; startDate: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const classesErrorRef = useRef<HTMLDivElement>(null);
  const enrollmentFormRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const refreshClasses = useCallback(async () => {
    setClassesLoading(true);
    setClassesError(null);
    try {
      setClasses(await loadAllAcademicClasses());
    } catch (cause) {
      setClassesError(accountErrorMessage(cause));
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    const form = enrollmentFormRef.current;
    if (!studentId || !form) return;
    form.focus();
    form.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [studentId]);

  useEffect(() => {
    if (!error) return;
    errorRef.current?.focus();
    errorRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the route's asynchronous class-choice load.
    void refreshClasses();
  }, [refreshClasses]);

  useEffect(() => {
    if (!classesError) return;
    classesErrorRef.current?.focus();
    classesErrorRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [classesError]);

  async function searchStudents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searching) return;
    setError(null);
    setHasSearched(false);
    setSearching(true);
    setStudentId('');
    setSchoolYear('');
    setClassId('');
    setStartDate('');
    setRenewal(null);
    setStudents([]);
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
      setHasSearched(true);
    } catch (cause) {
      setError(accountErrorMessage(cause));
    } finally {
      setSearching(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      submitting.current ||
      classesLoading ||
      classesError ||
      !studentId ||
      !classId ||
      !startDate
    ) {
      return;
    }
    submitting.current = true;
    setBusy(true);
    let completed = false;
    setError(null);
    try {
      await startAcademicEnrollment(classId, { studentId, startDate });
      navigate(`/admin/contas/alunos/${encodeURIComponent(studentId)}`, {
        replace: true,
        state: { message: 'Matrícula cadastrada com sucesso.', messageTone: 'success' },
      });
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
    if (
      !renewal ||
      submitting.current ||
      classesLoading ||
      classesError ||
      !classId ||
      !studentId ||
      !startDate
    ) {
      return;
    }
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
      navigate(`/admin/contas/alunos/${encodeURIComponent(studentId)}`, {
        replace: true,
        state: { message: 'Matrícula cadastrada com sucesso.', messageTone: 'success' },
      });
      completed = true;
    } catch (cause) {
      setRenewal(null);
      setError(accountErrorMessage(cause));
    } finally {
      if (!completed) submitting.current = false;
      setBusy(false);
    }
  }

  function returnToStudentList() {
    setStudentId('');
    setSchoolYear('');
    setClassId('');
    setStartDate('');
    setRenewal(null);
    setError(null);
  }

  const visibleStudents = studentId
    ? students.filter((student) => student.studentId === studentId)
    : students;
  const schoolYears = [...new Set(classes.map((item) => item.schoolYear))];
  const classesForSchoolYear = schoolYear
    ? classes.filter((item) => item.schoolYear === Number(schoolYear))
    : [];
  const seriesCounts = classesForSchoolYear.reduce<Map<number, number>>((counts, item) => {
    counts.set(item.series, (counts.get(item.series) ?? 0) + 1);
    return counts;
  }, new Map());
  const errorAlert = error ? (
    <p
      ref={errorRef}
      aria-live="assertive"
      className="rounded-lg bg-error-surface p-4 text-danger focus:outline-2 focus:outline-offset-2 focus:outline-danger"
      role="alert"
      tabIndex={-1}
    >
      {error}
    </p>
  ) : null;

  return (
    <AcademicPageLayout
      description="Escolha um aluno, uma turma e a data de início para criar a matrícula."
      title="Nova matrícula"
    >
      <form
        aria-busy={searching}
        onSubmit={searchStudents}
        className="panel-surface space-y-3 rounded-2xl bg-surface p-4"
      >
        <label className="block space-y-2 text-label-large font-medium text-on-surface">
          Buscar aluno sem matrícula ativa
          <input
            className={field}
            maxLength={120}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <CenteredSubmitButton disabled={searching} icon="search">
          {searching ? 'Buscando…' : 'Buscar'}
        </CenteredSubmitButton>
      </form>
      {classesError && (
        <div
          ref={classesErrorRef}
          aria-live="assertive"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger focus:outline-2 focus:outline-offset-2 focus:outline-danger"
          role="alert"
          tabIndex={-1}
        >
          <span>{classesError}</span>
          <Button
            disabled={classesLoading}
            leadingIcon="refresh"
            onClick={() => void refreshClasses()}
            type="button"
            variant="secondary"
          >
            {classesLoading ? 'Carregando…' : 'Tentar novamente'}
          </Button>
        </div>
      )}
      {!studentId && errorAlert}
      {!studentId && searching && (
        <p
          aria-live="polite"
          className="py-4 text-center text-body-medium text-muted"
          role="status"
        >
          Buscando alunos…
        </p>
      )}
      {!studentId && hasSearched && students.length === 0 && !error && (
        <p
          aria-live="polite"
          className="panel-surface rounded-2xl bg-surface p-6 text-body-large text-muted"
          role="status"
        >
          Nenhum aluno encontrado para esta busca.
        </p>
      )}
      {visibleStudents.length > 0 && (
        <section aria-labelledby="available-students-heading" className="space-y-3">
          <h2
            className="text-title-large font-semibold text-on-surface"
            id="available-students-heading"
          >
            {studentId ? 'Aluno selecionado' : 'Selecione um aluno'}
          </h2>
          <ul className="grid grid-cols-1 gap-4">
            {visibleStudents.map((student) => {
              const selected = studentId === student.studentId;
              return (
                <li key={student.studentId}>
                  <div
                    className={`panel-surface group grid grid-cols-1 gap-4 rounded-2xl bg-surface p-5 transition sm:items-center ${selected ? 'border-primary ring-2 ring-primary sm:grid-cols-[minmax(0,1fr)_auto]' : 'hover:-translate-y-0.5 hover:border-primary hover:shadow-md'}`}
                  >
                    <button
                      aria-pressed={selected}
                      className="grid min-w-0 w-full grid-cols-1 gap-4 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      onClick={() => {
                        setSchoolYear('');
                        setClassId('');
                        setStartDate('');
                        setStudentId(student.studentId);
                      }}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-title-large font-semibold text-on-surface">
                          {student.name}
                        </span>
                        <span className="block break-all text-body-medium text-muted">
                          {student.email}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-2 text-body-medium text-on-surface">
                        <Badge tone={activationStatusTone(student.activationStatus)}>
                          {activationStatusLabel(student.activationStatus)}
                        </Badge>
                        <Badge tone="neutral">
                          {enrollmentStatusLabel(student.enrollmentStatus)}
                        </Badge>
                      </span>
                    </button>
                    {selected && (
                      <Button
                        aria-label="Voltar à lista de alunos"
                        className="justify-self-end"
                        onClick={returnToStudentList}
                        size="icon"
                        title="Voltar à lista"
                        type="button"
                        variant="secondary"
                      >
                        <Icon name="close" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {studentId && errorAlert}
      {studentId && (
        <form
          aria-label="Formulário de criação de matrícula"
          aria-busy={busy || classesLoading}
          ref={enrollmentFormRef}
          tabIndex={-1}
          onSubmit={(event) => void submit(event)}
          className="panel-surface w-full max-w-[45rem] space-y-4 rounded-2xl bg-surface p-5 focus:outline-2 focus:outline-offset-2 focus:outline-primary sm:p-6"
        >
          {classesLoading && (
            <p aria-live="polite" className="text-body-medium text-muted" role="status">
              Carregando turmas…
            </p>
          )}
          {!classesLoading && !classesError && classes.length === 0 && (
            <p aria-live="polite" className="text-body-medium text-muted" role="status">
              Nenhuma turma disponível para matrícula.
            </p>
          )}
          <label className="block space-y-2 text-label-large font-medium text-on-surface">
            Ano letivo
            <SelectField
              disabled={classesLoading || Boolean(classesError) || classes.length === 0}
              required
              value={schoolYear}
              onChange={(event) => {
                setSchoolYear(event.currentTarget.value);
                setClassId('');
              }}
            >
              <option value="">Selecione</option>
              {schoolYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectField>
          </label>
          <label className="block space-y-2 text-label-large font-medium text-on-surface">
            Série
            <SelectField
              disabled={!schoolYear || classesLoading || Boolean(classesError)}
              required
              value={classId}
              onChange={(event) => setClassId(event.currentTarget.value)}
            >
              <option value="">Selecione</option>
              {classesForSchoolYear.map((item) => (
                <option key={item.classId} value={item.classId}>
                  {item.series}ª série
                  {(seriesCounts.get(item.series) ?? 0) > 1 ? ` · turma ${item.classId}` : ''}
                </option>
              ))}
            </SelectField>
          </label>
          <label className="block space-y-2 text-label-large font-medium text-on-surface">
            Data de início
            <input
              className={field}
              required
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.currentTarget.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={busy || !studentId || classesLoading || Boolean(classesError)}
              leadingIcon="check"
              type="submit"
              variant="primary"
            >
              {busy ? 'Salvando…' : 'Criar matrícula'}
            </Button>
            <ActionLink leadingIcon="close" to="/admin/contas/alunos">
              Cancelar
            </ActionLink>
          </div>
        </form>
      )}
      {renewal && (
        <ConfirmDialog
          confirmLabel="Confirmar renovação"
          onCancel={() => setRenewal(null)}
          onConfirm={() => void confirmRenewal()}
          pending={busy}
          pendingLabel="Confirmando…"
          title="Confirmar renovação de matrícula?"
        >
          A matrícula anterior iniciada em {civilDateLabel(renewal.startDate)} será considerada. Se
          os dados dela tiverem mudado, revise as informações e tente novamente.
        </ConfirmDialog>
      )}
    </AcademicPageLayout>
  );
}
