import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { loadAdminClasses, type AdminClassOption } from '../../api/adminAcademicCatalog';
import {
  deleteSimulation,
  getSimulation,
  listOfferedSubjects,
  realizeSimulation,
  type OfferedSubject,
  type Simulation,
} from '../../api/adminSimulations';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Badge } from '../../components/Badge';
import { classLabel, civilDateLabel } from '../adminAccounts/accountUi';
import { simulationErrorMessage, SIMULATION_VERSION_UNAVAILABLE_MESSAGE } from './simulationErrors';

type ConfirmationAction = 'realize' | 'delete' | null;

interface DetailLocationState {
  readonly createdNumber?: number;
}

function createdNumberFromState(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const number = (value as DetailLocationState).createdNumber;
  return Number.isSafeInteger(number) && Number(number) > 0 ? Number(number) : undefined;
}

export function SimulationDetailPage() {
  const { classId, simulationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [schoolClass, setSchoolClass] = useState<AdminClassOption | null>(null);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [subjects, setSubjects] = useState<OfferedSubject[]>([]);
  const [etag, setEtag] = useState<string | undefined>();
  const [confirmation, setConfirmation] = useState<ConfirmationAction>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const mutationStarted = useRef(false);
  const createdNumber = createdNumberFromState(location.state);

  const load = useCallback(async () => {
    if (!classId || !simulationId) return;
    const [classes, offered, current] = await Promise.all([
      loadAdminClasses(),
      listOfferedSubjects(classId),
      getSimulation(classId, simulationId),
    ]);
    const match = classes.find((item) => item.classId === classId);
    if (!match) throw new Error('class-unavailable');
    return {
      schoolClass: match,
      subjects: offered,
      simulation: current.simulation,
      etag: current.etag,
    };
  }, [classId, simulationId]);

  useEffect(() => {
    let active = true;
    void load()
      .then((result) => {
        if (!active || !result) return;
        setSchoolClass(result.schoolClass);
        setSubjects(result.subjects);
        setSimulation(result.simulation);
        setEtag(result.etag);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error && reason.message === 'class-unavailable'
              ? 'A turma não está disponível para consulta.'
              : simulationErrorMessage(reason),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  async function confirmAction() {
    if (!classId || !simulationId || !etag || !confirmation || mutationStarted.current || pending)
      return;
    mutationStarted.current = true;
    setPending(true);
    setError(null);
    try {
      if (confirmation === 'realize') {
        const result = await realizeSimulation(classId, simulationId, etag);
        setSimulation(result.simulation);
        setEtag(result.etag);
        setFeedback('Simulado realizado. Ele não poderá mais ser alterado.');
      } else {
        await deleteSimulation(classId, simulationId, etag);
        navigate(`/admin/turmas/${encodeURIComponent(classId)}/simulados`, {
          replace: true,
          state: { deletedSimulationNumber: simulation?.number },
        });
      }
      setConfirmation(null);
    } catch (reason) {
      setError(simulationErrorMessage(reason));
      setConfirmation(null);
      try {
        const refreshed = await load();
        if (refreshed) {
          setSchoolClass(refreshed.schoolClass);
          setSubjects(refreshed.subjects);
          setSimulation(refreshed.simulation);
          setEtag(refreshed.etag);
        }
      } catch {
        // The original safe API error remains visible if refresh also fails.
      }
    } finally {
      mutationStarted.current = false;
      setPending(false);
    }
  }

  if (!classId || !simulationId) return null;
  const subjectById = new Map(subjects.map((subject) => [subject.subjectId, subject.name]));
  const canMutate = Boolean(
    schoolClass && !schoolClass.isClosed && simulation && !simulation.realizedAt && etag,
  );

  return (
    <section aria-labelledby="simulation-detail-title" className="mx-auto max-w-4xl space-y-5">
      <Link
        className="account-button-secondary inline-flex min-h-10 items-center justify-center rounded-lg bg-surface px-3 text-label-medium font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        to={`/admin/turmas/${encodeURIComponent(classId)}/simulados`}
      >
        ← Voltar aos simulados
      </Link>
      {loading && (
        <p aria-live="polite" className="text-body-large text-muted" role="status">
          Carregando simulado…
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
      {feedback && (
        <p
          className="rounded-lg border border-success bg-success-surface p-4 text-body-medium text-success"
          role="status"
        >
          {feedback}
        </p>
      )}
      {!loading && !error && schoolClass && simulation && (
        <>
          {createdNumber === simulation.number && (
            <p
              className="rounded-lg border border-success bg-success-surface p-4 text-body-medium text-success"
              role="status"
            >
              Simulado nº {simulation.number} criado.
            </p>
          )}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="text-headline-small font-semibold text-on-surface"
                id="simulation-detail-title"
              >
                Simulado nº {simulation.number}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {schoolClass.isClosed && <Badge tone="warning">Turma fechada</Badge>}
              {simulation.realizedAt ? (
                <Badge tone="positive">Realizado</Badge>
              ) : (
                <Badge tone="neutral">Agendado</Badge>
              )}
            </div>
          </header>
          {schoolClass.isClosed && (
            <p
              className="rounded-lg border border-warning bg-warning-surface p-4 text-body-medium text-on-surface"
              role="status"
            >
              Esta turma está encerrada. O simulado pode ser consultado, mas não pode ser alterado.
            </p>
          )}
          {simulation.realizedAt && (
            <p
              className="rounded-lg border border-warning bg-warning-surface p-4 text-body-medium text-on-surface"
              role="status"
            >
              A realização foi confirmada em{' '}
              {new Date(simulation.realizedAt).toLocaleString('pt-BR')}. Edição e exclusão não estão
              disponíveis.
            </p>
          )}
          {!simulation.realizedAt && !schoolClass.isClosed && !etag && (
            <p
              className="rounded-lg border border-warning bg-warning-surface p-4 text-body-medium text-on-surface"
              role="status"
            >
              {SIMULATION_VERSION_UNAVAILABLE_MESSAGE}
            </p>
          )}

          {canMutate && (
            <div
              aria-label="Ações do simulado"
              className="flex flex-wrap items-center justify-between gap-3"
              role="group"
            >
              <Link
                className="account-button-primary inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                to={`/admin/turmas/${encodeURIComponent(classId)}/simulados/${encodeURIComponent(simulationId)}/editar`}
              >
                Editar simulado
              </Link>
              <div className="ml-auto flex flex-wrap gap-3">
                <button
                  className="account-button-primary min-h-11 rounded-lg bg-success px-4 text-label-large font-semibold text-on-primary hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success disabled:opacity-60"
                  disabled={pending}
                  onClick={() => setConfirmation('realize')}
                  type="button"
                >
                  Confirmar realização
                </button>
                <button
                  className="account-button-primary min-h-11 rounded-lg bg-danger px-4 text-label-large font-semibold text-on-primary hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
                  disabled={pending}
                  onClick={() => setConfirmation('delete')}
                  type="button"
                >
                  Excluir simulado
                </button>
              </div>
            </div>
          )}
          {simulation.realizedAt && (
            <Link
              className="account-button-primary inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              to={`/admin/turmas/${encodeURIComponent(classId)}/simulados/${encodeURIComponent(simulationId)}/resultados`}
            >
              Ver resultados
            </Link>
          )}

          <div className="panel-surface space-y-5 rounded-2xl bg-surface p-5 sm:p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-label-medium font-medium text-muted">Turma</dt>
                <dd className="mt-1 text-body-large text-on-surface">{classLabel(schoolClass)}</dd>
              </div>
              <div>
                <dt className="text-label-medium font-medium text-muted">Ano letivo</dt>
                <dd className="mt-1 text-body-large text-on-surface">{schoolClass.schoolYear}</dd>
              </div>
              <div>
                <dt className="text-label-medium font-medium text-muted">Tipo</dt>
                <dd className="mt-1 text-body-large text-on-surface">
                  {simulation.type === 'objetivo' ? 'Objetivo' : 'Dissertativo'}
                </dd>
              </div>
              <div>
                <dt className="text-label-medium font-medium text-muted">Bimestre</dt>
                <dd className="mt-1 text-body-large text-on-surface">{simulation.bimester}º</dd>
              </div>
              <div>
                <dt className="text-label-medium font-medium text-muted">Data agendada</dt>
                <dd className="mt-1 text-body-large text-on-surface">
                  {civilDateLabel(simulation.scheduledDate)}
                </dd>
              </div>
              <div>
                <dt className="text-label-medium font-medium text-muted">Número</dt>
                <dd className="mt-1 text-body-large text-on-surface">{simulation.number}</dd>
              </div>
            </dl>
          </div>
          <div className="panel-surface space-y-4 rounded-2xl bg-surface p-5 sm:p-6">
            <h2 className="text-title-medium font-semibold text-on-surface">Matérias</h2>
            <ul className="grid gap-3">
              {simulation.subjects.map((subject) => (
                <li
                  className="panel-surface flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface p-4 text-body-medium text-on-surface"
                  key={subject.subjectId}
                >
                  <span>
                    {subjectById.get(subject.subjectId) ?? `Matéria ${subject.subjectId}`}
                  </span>
                  <span>
                    {subject.totalQuestions} questões ·{' '}
                    {subject.weightPercent.toFixed(2).replace('.', ',')}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {confirmation === 'realize' && simulation && (
        <ConfirmDialog
          confirmLabel="Confirmar realização"
          description={`Ao confirmar, o simulado nº ${simulation.number} não poderá mais ser alterado e somente os alunos aptos poderão realizá-lo. Esta ação não pode ser desfeita.`}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void confirmAction()}
          pending={pending}
          title="Confirmar realização do simulado?"
        />
      )}
      {confirmation === 'delete' && simulation && (
        <ConfirmDialog
          confirmLabel="Excluir simulado"
          description={`O simulado nº ${simulation.number} será removido. Não será possível removê-lo se já tiver sido realizado ou tiver resultados registrados.`}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void confirmAction()}
          pending={pending}
          title="Excluir simulado?"
        />
      )}
    </section>
  );
}
