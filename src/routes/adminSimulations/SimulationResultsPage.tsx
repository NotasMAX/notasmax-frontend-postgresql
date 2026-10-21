import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { loadAdminClasses } from '../../api/adminAcademicCatalog';
import {
  type OfferedSubject,
  getSimulation,
  listOfferedSubjects,
} from '../../api/adminSimulations';
import {
  listSimulationResults,
  type SimulationResult,
  type SimulationResultPage,
  type SimulationResultStatus,
} from '../../api/adminSimulationResults';
import { Badge } from '../../components/Badge';
import { ActionLink } from '../../components/ActionLink';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { SelectField } from '../../components/SelectField';
import { GENERIC_API_ERROR_MESSAGE, getApiProblemPresentation } from '../../api/problemDetails';
import { classLabel } from '../adminAccounts/accountUi';
import { resultNumberLabel, resultStatusLabel, resultStatusTone } from '../../results/resultUi';

const initialPageSize = 20;
const pageSizeOptions = [20, 50, 100];

function publicError(error: unknown): string {
  return getApiProblemPresentation(error).message ?? GENERIC_API_ERROR_MESSAGE;
}

function resultHref(classId: string, simulationId: string, result: SimulationResult): string {
  return `/admin/turmas/${encodeURIComponent(classId)}/simulados/${encodeURIComponent(simulationId)}/resultados/${encodeURIComponent(result.studentId)}/${encodeURIComponent(result.subjectId)}`;
}

export function SimulationResultsPage() {
  const { classId, simulationId } = useParams();
  const [simulationNumber, setSimulationNumber] = useState<number | null>(null);
  const [className, setClassName] = useState('');
  const [subjects, setSubjects] = useState<readonly OfferedSubject[]>([]);
  const [pageData, setPageData] = useState<SimulationResultPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notRealized, setNotRealized] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageSizeDraft, setPageSizeDraft] = useState(initialPageSize);
  const [searchDraft, setSearchDraft] = useState('');
  const [subjectDraft, setSubjectDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [filters, setFilters] = useState<{
    search?: string;
    subjectId?: string;
    status?: SimulationResultStatus;
  }>({});
  const [reloadToken, setReloadToken] = useState(0);

  function retryResults() {
    setLoading(true);
    setError(null);
    setNotRealized(false);
    setReloadToken((current) => current + 1);
  }

  useEffect(() => {
    if (!classId || !simulationId) return;
    let active = true;
    void (async () => {
      try {
        const current = await getSimulation(classId, simulationId);
        if (!active) return;
        setSimulationNumber(current.simulation.number);
        const [classes, offeredSubjects] = await Promise.all([
          loadAdminClasses(),
          listOfferedSubjects(classId),
        ]);
        if (!active) return;
        const schoolClass = classes.find((item) => item.classId === classId);
        if (!schoolClass) throw new Error('class-unavailable');
        setClassName(classLabel(schoolClass));
        setSubjects(offeredSubjects);
        if (!current.simulation.realizedAt) {
          setPageData(null);
          setNotRealized(true);
          return;
        }
        const resultPage = await listSimulationResults(classId, simulationId, {
          page,
          pageSize,
          ...filters,
        });
        if (active) setPageData(resultPage);
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error && reason.message === 'class-unavailable'
              ? 'A turma não está disponível para consulta.'
              : publicError(reason),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [classId, simulationId, filters, page, pageSize, reloadToken]);

  if (!classId || !simulationId) return null;
  const subjectNames = new Map(subjects.map((subject) => [subject.subjectId, subject.name]));
  const totalPages = pageData?.pagination.totalPages ?? 0;

  return (
    <section aria-labelledby="simulation-results-title" className="space-y-6">
      <ActionLink
        to={`/admin/turmas/${encodeURIComponent(classId)}/simulados/${encodeURIComponent(simulationId)}`}
      >
        ← Voltar ao simulado
      </ActionLink>
      <header className="space-y-2">
        <p className="text-label-large font-semibold uppercase tracking-wide text-primary">
          {className}
        </p>
        <h1
          className="text-headline-medium font-semibold text-on-surface"
          id="simulation-results-title"
        >
          Resultados do simulado{simulationNumber ? ` nº ${simulationNumber}` : ''}
        </h1>
        <p className="text-body-large text-muted">
          Consulte os resultados dos alunos e atualize os lançamentos quando necessário.
        </p>
      </header>

      {error && (
        <div className="space-y-3">
          <Alert tone="danger">{error}</Alert>
          <Button leadingIcon="refresh" onClick={retryResults} variant="secondary">
            Tentar carregar resultados novamente
          </Button>
        </div>
      )}
      {notRealized && !loading && !error && (
        <p
          className="panel-surface rounded-2xl bg-surface p-5 text-body-medium text-on-surface"
          role="status"
        >
          Os resultados ficam disponíveis depois que a realização do simulado for confirmada.
        </p>
      )}

      {!notRealized && (
        <>
          <form
            className="panel-surface grid gap-4 rounded-2xl bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              setLoading(true);
              setError(null);
              setNotRealized(false);
              setFilters({
                ...(searchDraft.trim() ? { search: searchDraft.trim() } : {}),
                ...(subjectDraft ? { subjectId: subjectDraft } : {}),
                ...(statusDraft ? { status: statusDraft as SimulationResultStatus } : {}),
              });
              setPageSize(Number(pageSizeDraft));
              setPage(1);
              setReloadToken((current) => current + 1);
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="result-search"
              >
                Buscar aluno por nome ou número
              </label>
              <input
                autoComplete="off"
                className="field-control min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary"
                id="result-search"
                maxLength={120}
                onChange={(event) => setSearchDraft(event.currentTarget.value)}
                value={searchDraft}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="result-subject"
              >
                Matéria
              </label>
              <SelectField
                id="result-subject"
                onChange={(event) => setSubjectDraft(event.currentTarget.value)}
                value={subjectDraft}
              >
                <option value="">Todas as matérias</option>
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
                htmlFor="result-status"
              >
                Situação
              </label>
              <SelectField
                id="result-status"
                onChange={(event) => setStatusDraft(event.currentTarget.value)}
                value={statusDraft}
              >
                <option value="">Todas as situações</option>
                <option value="pending">Pendente</option>
                <option value="assessed">Avaliado</option>
                <option value="absent">Ausente</option>
              </SelectField>
            </div>
            <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-4">
              <div className="w-full max-w-40 space-y-2">
                <label
                  className="text-label-large font-medium text-on-surface"
                  htmlFor="result-page-size"
                >
                  Itens por página
                </label>
                <SelectField
                  id="result-page-size"
                  onChange={(event) => setPageSizeDraft(Number(event.currentTarget.value))}
                  value={pageSizeDraft}
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </SelectField>
              </div>
              <button
                className="account-button-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                Buscar
              </button>
            </div>
          </form>

          {loading ? (
            <p
              aria-live="polite"
              className="py-8 text-center text-body-large text-muted"
              role="status"
            >
              Carregando resultados…
            </p>
          ) : !error && pageData?.items.length === 0 ? (
            <p className="panel-surface rounded-2xl bg-surface p-5 text-body-medium text-on-surface">
              Nenhum resultado encontrado.
            </p>
          ) : (
            !error &&
            pageData && (
              <>
                <ul className="space-y-3">
                  {pageData.items.map((item) => (
                    <li
                      className="panel-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-4"
                      key={`${item.studentId}-${item.subjectId}`}
                    >
                      <div className="min-w-0 space-y-1">
                        <h2 className="text-title-medium font-semibold text-on-surface">
                          {item.studentName}
                        </h2>
                        <p className="text-body-medium text-muted">
                          {subjectNames.get(item.subjectId) ?? item.subjectName}
                        </p>
                        <Badge tone={resultStatusTone(item.status)}>
                          {resultStatusLabel(item.status)}
                        </Badge>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-5 gap-y-1 text-body-small sm:grid-cols-3">
                        <div>
                          <dt className="text-muted">Nota</dt>
                          <dd className="font-medium text-on-surface">
                            {resultNumberLabel(item.score)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">Peso</dt>
                          <dd className="font-medium text-on-surface">
                            {resultNumberLabel(item.weightPercent)}%
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">Média parcial</dt>
                          <dd className="font-medium text-on-surface">
                            {resultNumberLabel(item.weightedContribution)}
                          </dd>
                        </div>
                      </dl>
                      <ActionLink className="px-4" to={resultHref(classId, simulationId, item)}>
                        Ver resultado
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                <nav
                  aria-label="Paginação de resultados"
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={loading || page <= 1}
                      onClick={() => {
                        setLoading(true);
                        setError(null);
                        setPage((current) => current - 1);
                      }}
                      variant="secondary"
                    >
                      Anterior
                    </Button>
                    <Button
                      disabled={loading || page >= totalPages}
                      onClick={() => {
                        setLoading(true);
                        setError(null);
                        setPage((current) => current + 1);
                      }}
                      variant="secondary"
                    >
                      Próxima
                    </Button>
                  </div>
                  <p aria-live="polite" className="text-body-medium text-muted">
                    {pageData.pagination.totalItems} resultado(s) · página{' '}
                    {pageData.pagination.page} de {pageData.pagination.totalPages}
                  </p>
                </nav>
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
