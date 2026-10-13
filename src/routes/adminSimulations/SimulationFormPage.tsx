import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { loadAdminClasses, type AdminClassOption } from '../../api/adminAcademicCatalog';
import {
  createSimulation,
  getSimulation,
  listAllSimulationsForBimester,
  listOfferedSubjects,
  updateSimulation,
  type OfferedSubject,
  type Simulation,
} from '../../api/adminSimulations';
import { GENERIC_API_ERROR_MESSAGE, getApiProblemPresentation } from '../../api/problemDetails';
import { classLabel, civilDateLabel } from '../adminAccounts/accountUi';
import {
  allocatedWeight,
  asSimulationSubjects,
  completeSubjectSelection,
  defaultSimulationDraft,
  draftFromSimulation,
  formatPercent,
  isPastCivilDate,
  type SimulationFormDraft,
} from '../../simulations/simulationUi';

interface FieldErrors {
  readonly form: string | null;
  readonly subjects: string | null;
}

function errorMessage(error: unknown, sensitiveValues: readonly string[] = []): string {
  return getApiProblemPresentation(error, sensitiveValues).message ?? GENERIC_API_ERROR_MESSAGE;
}

export function SimulationFormPage() {
  const { classId, simulationId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(simulationId);
  const [schoolClass, setSchoolClass] = useState<AdminClassOption | null>(null);
  const [offeredSubjects, setOfferedSubjects] = useState<OfferedSubject[]>([]);
  const [existingSimulations, setExistingSimulations] = useState<Simulation[]>([]);
  const [weightStatus, setWeightStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [etag, setEtag] = useState<string | undefined>();
  const [draft, setDraft] = useState<SimulationFormDraft>(defaultSimulationDraft());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiFieldErrors, setApiFieldErrors] = useState<readonly string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({ form: null, subjects: null });
  const submitted = useRef(false);

  useEffect(() => {
    if (!classId) return;
    let active = true;
    void Promise.all([
      loadAdminClasses(),
      listOfferedSubjects(classId),
      editing && simulationId ? getSimulation(classId, simulationId) : Promise.resolve(undefined),
    ])
      .then(([classes, subjects, current]) => {
        if (!active) return;
        const match = classes.find((item) => item.classId === classId);
        if (!match) {
          setError('A turma não está disponível para esta operação.');
          return;
        }
        setSchoolClass(match);
        setOfferedSubjects(subjects);
        if (current) {
          if (current.simulation.realizedAt) {
            setError('Este simulado já teve a realização confirmada; edição indisponível.');
            return;
          }
          setDraft(draftFromSimulation(current.simulation));
          setEtag(current.etag);
        } else {
          setDraft({ ...defaultSimulationDraft(), subjects: completeSubjectSelection(subjects) });
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId, editing, simulationId]);

  useEffect(() => {
    if (!classId || !draft.bimester || !/^\d+$/.test(draft.bimester)) return;
    let active = true;
    void listAllSimulationsForBimester(classId, Number(draft.bimester))
      .then((items) => {
        if (active) {
          setExistingSimulations(items);
          setWeightStatus('ready');
        }
      })
      .catch(() => {
        if (active) {
          setExistingSimulations([]);
          setWeightStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [classId, draft.bimester]);

  function changeSubject(
    subjectId: string,
    field: 'totalQuestions' | 'weightPercent',
    value: string,
  ) {
    setDraft({
      ...draft,
      subjects: draft.subjects.map((subject) =>
        subject.subjectId === subjectId ? { ...subject, [field]: value } : subject,
      ),
    });
    setFieldErrors({ form: null, subjects: null });
    setApiFieldErrors([]);
  }

  function removeSubject(subjectId: string) {
    setDraft({
      ...draft,
      subjects: draft.subjects.filter((subject) => subject.subjectId !== subjectId),
    });
    setFieldErrors({ form: null, subjects: null });
    setApiFieldErrors([]);
  }

  function restoreSubjects() {
    const current = new Map(draft.subjects.map((subject) => [subject.subjectId, subject]));
    setDraft({
      ...draft,
      subjects: offeredSubjects.map(
        (subject) =>
          current.get(subject.subjectId) ?? {
            subjectId: subject.subjectId,
            totalQuestions: '1',
            weightPercent: '100',
          },
      ),
    });
    setApiFieldErrors([]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted.current || pending || !classId) return;
    if (schoolClass?.isClosed) {
      setError('Turmas fechadas não permitem alterar simulados.');
      return;
    }
    const subjects = asSimulationSubjects(draft.subjects);
    if (draft.subjects.length === 0) {
      setFieldErrors({ form: null, subjects: 'Selecione pelo menos uma matéria.' });
      return;
    }
    if (!subjects) {
      setFieldErrors({
        form: null,
        subjects:
          'Informe questões positivas e peso entre 0,01% e 100%, com até duas casas decimais.',
      });
      return;
    }
    if (!draft.type || !draft.scheduledDate || !['1', '2', '3', '4'].includes(draft.bimester)) {
      setFieldErrors({ form: 'Preencha o tipo, o bimestre e a data agendada.', subjects: null });
      return;
    }
    if (editing && etag === undefined) {
      setError('A API não forneceu o ETag atual. Atualize a página antes de editar.');
      return;
    }
    const input = {
      type: draft.type,
      bimester: Number(draft.bimester),
      scheduledDate: draft.scheduledDate,
      subjects,
    };
    submitted.current = true;
    setPending(true);
    setError(null);
    setApiFieldErrors([]);
    setFieldErrors({ form: null, subjects: null });
    try {
      if (editing && simulationId && etag !== undefined) {
        await updateSimulation(classId, simulationId, input, etag);
        navigate(
          `/admin/turmas/${encodeURIComponent(classId)}/simulados/${encodeURIComponent(simulationId)}`,
          { replace: true },
        );
      } else {
        const created = await createSimulation(classId, input);
        navigate(
          `/admin/turmas/${encodeURIComponent(classId)}/simulados/${encodeURIComponent(created.simulation.simulationId)}`,
          {
            replace: true,
            state: { createdNumber: created.simulation.number },
          },
        );
      }
    } catch (reason) {
      const presentation = getApiProblemPresentation(
        reason,
        subjects.map(({ subjectId }) => subjectId),
      );
      setError(presentation.message ?? GENERIC_API_ERROR_MESSAGE);
      setApiFieldErrors(presentation.fieldErrors.map(({ detail }) => detail));
      submitted.current = false;
      setPending(false);
    }
  }

  if (!classId) return null;
  const title = editing ? 'Editar simulado' : 'Novo simulado';
  const selectedIds = new Set(draft.subjects.map(({ subjectId }) => subjectId));
  const selectedSubjects = offeredSubjects.filter(({ subjectId }) => selectedIds.has(subjectId));
  const exceptSimulationId = editing ? simulationId : undefined;

  return (
    <section aria-labelledby="simulation-form-title" className="mx-auto max-w-4xl space-y-5">
      <Link
        className="text-label-large font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        to={`/admin/turmas/${encodeURIComponent(classId)}/simulados`}
      >
        ← Voltar aos simulados
      </Link>
      <div>
        <p className="text-label-large font-semibold uppercase tracking-wide text-primary">
          {schoolClass ? classLabel(schoolClass) : 'Simulado'}
        </p>
        <h1
          className="mt-2 text-headline-small font-semibold text-on-surface"
          id="simulation-form-title"
        >
          {title}
        </h1>
      </div>
      {loading && (
        <p aria-live="polite" className="text-body-large text-muted" role="status">
          Carregando dados do formulário…
        </p>
      )}
      {error && (
        <p
          className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
      {apiFieldErrors.length > 0 && (
        <ul
          aria-label="Erros de validação da API"
          className="space-y-1 rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
          role="alert"
        >
          {apiFieldErrors.map((message, index) => (
            <li key={`${index}:${message}`}>{message}</li>
          ))}
        </ul>
      )}
      {!loading && !error && schoolClass?.isClosed && (
        <p
          className="rounded-lg border border-warning bg-warning-surface p-4 text-body-medium text-on-surface"
          role="status"
        >
          Turmas fechadas permitem consulta histórica, mas não criação ou edição de simulados.
        </p>
      )}
      {!loading && !error && schoolClass && !schoolClass.isClosed && (
        <form
          className="panel-surface space-y-6 rounded-2xl bg-surface p-5 sm:p-6"
          onSubmit={submit}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="simulation-type"
              >
                Tipo
              </label>
              <select
                className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
                id="simulation-type"
                onChange={(event) => {
                  setDraft({
                    ...draft,
                    type: event.currentTarget.value as SimulationFormDraft['type'],
                  });
                  setApiFieldErrors([]);
                }}
                required
                value={draft.type}
              >
                <option value="" disabled>
                  Selecione
                </option>
                <option value="objetivo">Objetivo</option>
                <option value="dissertativo">Dissertativo</option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="simulation-bimester"
              >
                Bimestre
              </label>
              <select
                className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
                id="simulation-bimester"
                onChange={(event) => {
                  setDraft({ ...draft, bimester: event.currentTarget.value });
                  setWeightStatus('loading');
                  setExistingSimulations([]);
                  setApiFieldErrors([]);
                }}
                required
                value={draft.bimester}
              >
                {[1, 2, 3, 4].map((value) => (
                  <option key={value} value={value}>
                    {value}º bimestre
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="simulation-date"
              >
                Data agendada
              </label>
              <input
                className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
                id="simulation-date"
                onChange={(event) => {
                  setDraft({ ...draft, scheduledDate: event.currentTarget.value });
                  setApiFieldErrors([]);
                }}
                required
                type="date"
                value={draft.scheduledDate}
              />
            </div>
          </div>
          {isPastCivilDate(draft.scheduledDate) && (
            <p
              className="rounded-lg border border-warning bg-warning-surface p-3 text-body-medium text-on-surface"
              role="status"
            >
              A data agendada ({civilDateLabel(draft.scheduledDate)}) está no passado. Você ainda
              pode salvar o simulado.
            </p>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-title-medium font-semibold text-on-surface">
                  Matérias e pesos
                </h2>
                <p className="mt-1 text-body-small text-muted">
                  Os saldos são estimativas; a API valida a alocação no momento do salvamento.
                </p>
              </div>
              <button
                className="min-h-10 rounded-lg border border-panel-outline px-3 text-label-medium font-medium text-primary focus-visible:outline-2 focus-visible:outline-primary"
                onClick={restoreSubjects}
                type="button"
              >
                Restaurar todas
              </button>
            </div>
            {offeredSubjects.length === 0 && (
              <p className="rounded-lg border border-warning bg-warning-surface p-4 text-body-medium text-on-surface">
                Esta turma não tem matérias oferecidas no momento.
              </p>
            )}
            {fieldErrors.subjects && (
              <p className="text-body-medium text-danger" role="alert">
                {fieldErrors.subjects}
              </p>
            )}
            <ul className="space-y-3">
              {selectedSubjects.map((subject) => {
                const values = draft.subjects.find(
                  ({ subjectId }) => subjectId === subject.subjectId,
                );
                if (!values) return null;
                const allocated = allocatedWeight(
                  existingSimulations,
                  subject.subjectId,
                  Number(draft.bimester),
                  exceptSimulationId,
                );
                return (
                  <li
                    className="rounded-xl border border-panel-outline p-4"
                    key={subject.subjectId}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="text-title-small font-semibold text-on-surface">
                        {subject.name}
                      </h3>
                      <button
                        aria-label={`Remover ${subject.name}`}
                        className="min-h-10 rounded-lg px-3 text-label-medium font-medium text-danger underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-danger"
                        onClick={() => removeSubject(subject.subjectId)}
                        type="button"
                      >
                        Remover
                      </button>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          className="text-label-medium font-medium text-on-surface"
                          htmlFor={`questions-${subject.subjectId}`}
                        >
                          Quantidade de questões
                        </label>
                        <input
                          className="min-h-11 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
                          id={`questions-${subject.subjectId}`}
                          min="1"
                          onChange={(event) =>
                            changeSubject(
                              subject.subjectId,
                              'totalQuestions',
                              event.currentTarget.value,
                            )
                          }
                          required
                          step="1"
                          type="number"
                          value={values.totalQuestions}
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          className="text-label-medium font-medium text-on-surface"
                          htmlFor={`weight-${subject.subjectId}`}
                        >
                          Peso (%)
                        </label>
                        <input
                          className="min-h-11 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
                          id={`weight-${subject.subjectId}`}
                          max="100"
                          min="0.01"
                          onChange={(event) =>
                            changeSubject(
                              subject.subjectId,
                              'weightPercent',
                              event.currentTarget.value,
                            )
                          }
                          required
                          step="0.01"
                          type="number"
                          value={values.weightPercent}
                        />
                      </div>
                    </div>
                    {weightStatus === 'ready' && (
                      <p className="mt-3 text-body-small text-muted">
                        Já alocado neste bimestre: {formatPercent(allocated)} · Saldo estimado:{' '}
                        {formatPercent(100 - allocated)}
                      </p>
                    )}
                    {weightStatus === 'loading' && (
                      <p
                        aria-live="polite"
                        className="mt-3 text-body-small text-muted"
                        role="status"
                      >
                        Carregando pesos já alocados…
                      </p>
                    )}
                    {weightStatus === 'error' && (
                      <p className="mt-3 text-body-small text-danger" role="status">
                        Não foi possível carregar os pesos existentes; o saldo não está disponível.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            {selectedSubjects.length === 0 && offeredSubjects.length > 0 && (
              <p className="text-body-medium text-muted">
                Nenhuma matéria selecionada. Restaure as matérias ou selecione pelo menos uma.
              </p>
            )}
          </div>
          {fieldErrors.form && (
            <p className="text-body-medium text-danger" role="alert">
              {fieldErrors.form}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              className="account-button-primary min-h-12 rounded-lg bg-primary px-6 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
              disabled={pending || offeredSubjects.length === 0 || (editing && etag === undefined)}
              type="submit"
            >
              {pending ? 'Salvando…' : 'Salvar simulado'}
            </button>
            <Link
              className="account-button-secondary inline-flex min-h-12 items-center justify-center rounded-lg border border-panel-outline px-6 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              to={`/admin/turmas/${encodeURIComponent(classId)}/simulados`}
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
