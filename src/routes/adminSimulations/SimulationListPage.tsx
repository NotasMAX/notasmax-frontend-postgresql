import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { loadAdminClasses, type AdminClassOption } from '../../api/adminAcademicCatalog';
import {
  listOfferedSubjects,
  listSimulations,
  type OfferedSubject,
  type Simulation,
  type SimulationFilters,
  type SimulationPage,
} from '../../api/adminSimulations';
import { GENERIC_API_ERROR_MESSAGE, getApiProblemPresentation } from '../../api/problemDetails';
import { Badge } from '../../components/Badge';
import { SelectField } from '../../components/SelectField';
import { civilDateLabel, classLabel } from '../adminAccounts/accountUi';
import { SimulationActionIcon } from './SimulationActionIcon';
import {
  emptySimulationFilters,
  type SimulationFiltersDraft,
} from '../../simulations/simulationUi';

const pageSizes = [20, 50, 100] as const;

function readFilters(draft: SimulationFiltersDraft, page: number): SimulationFilters {
  return {
    page,
    pageSize: draft.pageSize,
    ...(draft.bimester ? { bimester: Number(draft.bimester) } : {}),
    ...(draft.type ? { type: draft.type } : {}),
    ...(draft.subjectId ? { subjectId: draft.subjectId } : {}),
    ...(draft.fromDate ? { fromDate: draft.fromDate } : {}),
    ...(draft.toDate ? { toDate: draft.toDate } : {}),
  };
}

function typeLabel(type: Simulation['type']): string {
  return type === 'objetivo' ? 'Objetivo' : 'Dissertativo';
}

export function SimulationListPage() {
  const { classId } = useParams();
  const [schoolClass, setSchoolClass] = useState<AdminClassOption | null>(null);
  const [subjects, setSubjects] = useState<OfferedSubject[]>([]);
  const [draft, setDraft] = useState<SimulationFiltersDraft>(emptySimulationFilters);
  const [filters, setFilters] = useState<SimulationFilters>(
    readFilters(emptySimulationFilters(), 1),
  );
  const [result, setResult] = useState<SimulationPage | null>(null);
  const [classLoading, setClassLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [classError, setClassError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;
    let active = true;
    void Promise.all([loadAdminClasses(), listOfferedSubjects(classId)])
      .then(([availableClasses, offered]) => {
        if (!active) return;
        setClassError(null);
        const match = availableClasses.find((item) => item.classId === classId);
        if (!match) {
          setClassError('A turma não está disponível para consulta.');
          return;
        }
        setSchoolClass(match);
        setSubjects(offered);
      })
      .catch((reason: unknown) => {
        if (active)
          setClassError(getApiProblemPresentation(reason).message ?? GENERIC_API_ERROR_MESSAGE);
      })
      .finally(() => {
        if (active) setClassLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    let active = true;
    void listSimulations(classId, filters)
      .then((page) => {
        if (active) {
          setResult(page);
          setListError(null);
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setListError(getApiProblemPresentation(reason).message ?? GENERIC_API_ERROR_MESSAGE);
      })
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId, filters]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setFilterError('A data inicial deve ser anterior ou igual à data final.');
      return;
    }
    setFilterError(null);
    setListLoading(true);
    setListError(null);
    setFilters(readFilters(draft, 1));
  }

  function resetFilters() {
    const clean = emptySimulationFilters();
    setDraft(clean);
    setFilterError(null);
    setListLoading(true);
    setListError(null);
    setFilters(readFilters(clean, 1));
  }

  if (!classId) return null;
  return (
    <section aria-labelledby="simulations-title" className="space-y-5">
      <Link
        className="account-button-secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-panel-outline bg-surface px-3 text-label-medium font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        to="/admin/simulados"
      >
        ← Escolher outra turma
      </Link>
      {classLoading && (
        <p aria-live="polite" className="text-body-large text-muted" role="status">
          Carregando turma…
        </p>
      )}
      {classError && (
        <p
          className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
          role="alert"
        >
          {classError}
        </p>
      )}
      {!classLoading && !classError && schoolClass && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1
                className="text-headline-small font-semibold text-on-surface"
                id="simulations-title"
              >
                Simulados
              </h1>
              <p className="mt-1 text-body-large text-muted">{classLabel(schoolClass)}</p>
              {schoolClass.isClosed && (
                <p className="mt-2 rounded-lg border border-warning bg-warning-surface p-3 text-body-medium text-on-surface">
                  Turma fechada. A consulta histórica continua disponível; alterações não estão
                  disponíveis.
                </p>
              )}
            </div>
            {!schoolClass.isClosed && (
              <Link
                className="account-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                to={`/admin/turmas/${encodeURIComponent(classId)}/simulados/novo`}
              >
                <SimulationActionIcon name="plus" />
                Novo simulado
              </Link>
            )}
          </div>

          <form
            className="panel-surface grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-2 xl:grid-cols-3"
            onSubmit={applyFilters}
          >
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="simulation-filter-bimester"
              >
                Bimestre
              </label>
              <SelectField
                id="simulation-filter-bimester"
                onChange={(event) => setDraft({ ...draft, bimester: event.currentTarget.value })}
                value={draft.bimester}
              >
                <option value="">Todos</option>
                {[1, 2, 3, 4].map((value) => (
                  <option key={value} value={value}>
                    {value}º bimestre
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="simulation-filter-type"
              >
                Tipo
              </label>
              <SelectField
                id="simulation-filter-type"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    type: event.currentTarget.value as SimulationFiltersDraft['type'],
                  })
                }
                value={draft.type}
              >
                <option value="">Todos</option>
                <option value="objetivo">Objetivo</option>
                <option value="dissertativo">Dissertativo</option>
              </SelectField>
            </div>
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="simulation-filter-subject"
              >
                Matéria
              </label>
              <SelectField
                id="simulation-filter-subject"
                onChange={(event) => setDraft({ ...draft, subjectId: event.currentTarget.value })}
                value={draft.subjectId}
              >
                <option value="">Todas</option>
                {subjects.map((subject) => (
                  <option key={subject.subjectId} value={subject.subjectId}>
                    {subject.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="simulation-filter-from"
              >
                Data inicial
              </label>
              <input
                className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                id="simulation-filter-from"
                onChange={(event) => setDraft({ ...draft, fromDate: event.currentTarget.value })}
                type="date"
                value={draft.fromDate}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="simulation-filter-to"
              >
                Data final
              </label>
              <input
                className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                id="simulation-filter-to"
                onChange={(event) => setDraft({ ...draft, toDate: event.currentTarget.value })}
                type="date"
                value={draft.toDate}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="simulation-page-size"
              >
                Itens por página
              </label>
              <SelectField
                id="simulation-page-size"
                onChange={(event) =>
                  setDraft({ ...draft, pageSize: Number(event.currentTarget.value) })
                }
                value={draft.pageSize}
              >
                {pageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </SelectField>
            </div>
            {filterError && (
              <p className="text-body-medium text-danger sm:col-span-2 xl:col-span-3" role="alert">
                {filterError}
              </p>
            )}
            <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-3">
              <button
                className="account-button-primary min-h-11 rounded-lg bg-primary px-5 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                type="submit"
              >
                Aplicar filtros
              </button>
              <button
                className="account-button-secondary min-h-11 rounded-lg border border-panel-outline px-5 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={resetFilters}
                type="button"
              >
                Limpar filtros
              </button>
            </div>
          </form>

          {listError && (
            <p
              className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
              role="alert"
            >
              {listError}
            </p>
          )}
          {listLoading && (
            <p aria-live="polite" className="text-body-large text-muted" role="status">
              Carregando simulados…
            </p>
          )}
          {!listLoading && !listError && result && result.items.length === 0 && (
            <div className="panel-surface rounded-2xl bg-surface p-6">
              <p className="text-body-large text-on-surface">
                Nenhum simulado encontrado para estes filtros.
              </p>
            </div>
          )}
          {!listLoading && !listError && result && result.items.length > 0 && (
            <>
              <ul className="space-y-3">
                {result.items.map((simulation) => (
                  <li
                    className="panel-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-5"
                    key={simulation.simulationId}
                  >
                    <div className="space-y-1">
                      <h2 className="text-title-medium font-semibold text-on-surface">
                        Simulado nº {simulation.number}
                      </h2>
                      <p className="text-body-medium text-muted">
                        {typeLabel(simulation.type)} · {simulation.bimester}º bimestre ·{' '}
                        {civilDateLabel(simulation.scheduledDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {simulation.realizedAt && <Badge tone="positive">Realizado</Badge>}
                      <Link
                        className="account-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        to={`/admin/turmas/${encodeURIComponent(classId)}/simulados/${encodeURIComponent(simulation.simulationId)}`}
                      >
                        <SimulationActionIcon name="arrow-right" />
                        Abrir detalhe
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
              <nav
                aria-label="Paginação de simulados"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4"
              >
                <p className="text-body-medium text-muted">
                  {result.pagination.totalItems} simulados · página {result.pagination.page} de{' '}
                  {Math.max(1, result.pagination.totalPages)}
                </p>
                <div className="flex gap-2">
                  <button
                    className="min-h-11 rounded-lg border border-panel-outline px-4 text-label-large text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                    disabled={listLoading || filters.page <= 1}
                    onClick={() => {
                      setListLoading(true);
                      setListError(null);
                      setFilters({ ...filters, page: filters.page - 1 });
                    }}
                    type="button"
                  >
                    Anterior
                  </button>
                  <button
                    className="min-h-11 rounded-lg border border-panel-outline px-4 text-label-large text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                    disabled={listLoading || filters.page >= result.pagination.totalPages}
                    onClick={() => {
                      setListLoading(true);
                      setListError(null);
                      setFilters({ ...filters, page: filters.page + 1 });
                    }}
                    type="button"
                  >
                    Próxima
                  </button>
                </div>
              </nav>
            </>
          )}
        </>
      )}
    </section>
  );
}
