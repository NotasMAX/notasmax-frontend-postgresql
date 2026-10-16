import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type {
  AccountActivationStatus,
  AccountFilters,
  AccountProfile,
  ActivationEmailStatus,
  PaginatedAccountList,
  StudentEnrollmentStatus,
} from '../../api/adminAccounts';
import {
  loadAccountFilterOptions,
  type AccountFilterOptions,
} from '../../api/adminAcademicCatalog';
import {
  accountIdentifier,
  loadAccountPage,
  type AccountListItem,
} from '../../accounts/accountService';
import { AccountPageShell } from './AccountPageShell';
import { Badge } from '../../components/Badge';
import { SelectField } from '../../components/SelectField';
import { Toast } from '../../components/Toast';
import {
  accountCreatedFeedback,
  accountCollectionPath,
  accountErrorMessage,
  activationStatusLabel,
  activationStatusTone,
  buildAccountFilters,
  classLabel,
  enrollmentStatusLabel,
  type AccountFilterDraft,
} from './accountUi';

const pageSizeOptions = [20, 50, 100] as const;

interface AccountListLocationState {
  readonly search?: string;
  readonly activationEmailStatus?: ActivationEmailStatus;
  readonly photoNotSaved?: boolean;
}

function readLocationState(value: unknown): AccountListLocationState {
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  const state = value as Record<string, unknown>;
  return {
    ...(typeof state.search === 'string' ? { search: state.search } : {}),
    ...(state.activationEmailStatus === 'sent' || state.activationEmailStatus === 'failed'
      ? { activationEmailStatus: state.activationEmailStatus }
      : {}),
    ...(state.photoNotSaved === true ? { photoNotSaved: true } : {}),
  };
}

function emptyDraft(search = ''): AccountFilterDraft {
  return {
    search,
    activationStatus: '',
    enrollmentStatus: '',
    schoolYear: '',
    series: '',
    subjectId: '',
    pageSize: 20,
  };
}

interface AccountListPageProps {
  readonly profile: AccountProfile;
  readonly locationState?: unknown;
}

interface AcademicClassFiltersProps {
  readonly draft: AccountFilterDraft;
  readonly classes: AccountFilterOptions['classes'];
  readonly disabled: boolean;
  readonly onSchoolYearChange: (schoolYear: string) => void;
  readonly onSeriesChange: (series: string) => void;
}

function AcademicClassFilters({
  draft,
  classes,
  disabled,
  onSchoolYearChange,
  onSeriesChange,
}: AcademicClassFiltersProps) {
  const availableSchoolYears = [...new Set(classes.map((item) => item.schoolYear))].sort(
    (left, right) => right - left,
  );
  const classesForSelectedYear = classes
    .filter((item) => String(item.schoolYear) === draft.schoolYear)
    .sort((left, right) => left.series - right.series);
  const availableSeries = [...new Set(classesForSelectedYear.map((item) => item.series))];

  return (
    <>
      <div className="space-y-2">
        <label
          className="text-label-large font-medium text-on-surface"
          htmlFor="account-school-year-filter"
        >
          Ano letivo
        </label>
        <SelectField
          id="account-school-year-filter"
          disabled={disabled}
          onChange={(event) => onSchoolYearChange(event.currentTarget.value)}
          value={draft.schoolYear}
        >
          <option value="">Todos os anos</option>
          {availableSchoolYears.map((schoolYear) => (
            <option key={schoolYear} value={schoolYear}>
              {schoolYear}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="space-y-2">
        <label
          className="text-label-large font-medium text-on-surface"
          htmlFor="account-series-filter"
        >
          Série
        </label>
        <SelectField
          id="account-series-filter"
          disabled={!draft.schoolYear || disabled}
          onChange={(event) => onSeriesChange(event.currentTarget.value)}
          value={draft.series}
        >
          <option value="">{draft.schoolYear ? 'Selecione uma série' : 'Todas as séries'}</option>
          {availableSeries.map((series) => (
            <option key={series} value={series}>
              {series}ª série
            </option>
          ))}
        </SelectField>
      </div>
    </>
  );
}

export function AccountListPage({ profile, locationState }: AccountListPageProps) {
  const initialState = readLocationState(locationState);
  const initialDraft = emptyDraft(initialState.search ?? '');
  const [draft, setDraft] = useState<AccountFilterDraft>(initialDraft);
  const [appliedDraft, setAppliedDraft] = useState<AccountFilterDraft>(initialDraft);
  const [filters, setFilters] = useState<AccountFilters>(() =>
    buildAccountFilters(profile, initialDraft, 1),
  );
  const [result, setResult] = useState<PaginatedAccountList<AccountListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<AccountFilterOptions>({
    classes: [],
    subjects: [],
  });
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(profile !== 'administrator');
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);
  const [filterValidationError, setFilterValidationError] = useState<string | null>(null);
  const [filterOptionsRetry, setFilterOptionsRetry] = useState(0);
  const [showCreatedToast, setShowCreatedToast] = useState(
    initialState.activationEmailStatus !== undefined,
  );
  const dismissCreatedToast = useCallback(() => setShowCreatedToast(false), []);

  useEffect(() => {
    if (profile === 'administrator') return;

    let active = true;
    void loadAccountFilterOptions(profile)
      .then((options) => {
        if (active) setFilterOptions(options);
      })
      .catch((error: unknown) => {
        if (active) setFilterOptionsError(accountErrorMessage(error));
      })
      .finally(() => {
        if (active) setFilterOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filterOptionsRetry, profile]);

  useEffect(() => {
    let active = true;
    void loadAccountPage(profile, filters)
      .then((page) => {
        if (active) {
          setResult(page);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(accountErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [filters, profile]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      (profile === 'student' || profile === 'teacher') &&
      Boolean(draft.schoolYear) !== Boolean(draft.series)
    ) {
      setFilterValidationError('Para filtrar por turma, selecione o ano letivo e a série.');
      return;
    }
    if ((profile === 'student' || profile === 'teacher') && draft.schoolYear && draft.series) {
      const matchingClass = filterOptions.classes.some(
        (item) =>
          item.schoolYear === Number(draft.schoolYear) && item.series === Number(draft.series),
      );
      if (!matchingClass) {
        setFilterValidationError(
          'Não há turma disponível para o ano letivo e a série selecionados.',
        );
        return;
      }
    }
    setFilterValidationError(null);
    setLoading(true);
    setErrorMessage(null);
    setAppliedDraft(draft);
    setFilters(buildAccountFilters(profile, draft, 1, filterOptions.classes));
  }

  function clearFilters() {
    const next = emptyDraft();
    setLoading(true);
    setErrorMessage(null);
    setDraft(next);
    setAppliedDraft(next);
    setFilterValidationError(null);
    setFilters(buildAccountFilters(profile, next, 1, filterOptions.classes));
  }

  function changePage(page: number) {
    setLoading(true);
    setErrorMessage(null);
    setFilters(buildAccountFilters(profile, appliedDraft, page, filterOptions.classes));
  }

  function changePageSize(value: string) {
    const pageSize = Number(value);
    if (!pageSizeOptions.some((option) => option === pageSize)) {
      return;
    }
    const next = { ...draft, pageSize };
    setLoading(true);
    setErrorMessage(null);
    setDraft(next);
    setAppliedDraft(next);
    setFilters(buildAccountFilters(profile, next, 1, filterOptions.classes));
  }

  return (
    <AccountPageShell
      profile={profile}
      description="Use a busca e os filtros para encontrar as contas que procura."
      showRegisterAction={false}
    >
      {showCreatedToast && initialState.activationEmailStatus && (
        <Toast
          message={accountCreatedFeedback(
            initialState.activationEmailStatus,
            initialState.photoNotSaved,
          )}
          onDismiss={dismissCreatedToast}
          tone={
            initialState.activationEmailStatus === 'sent' && !initialState.photoNotSaved
              ? 'success'
              : 'warning'
          }
        />
      )}
      <form
        aria-label="Filtros de contas"
        className="panel-surface space-y-4 rounded-2xl bg-surface p-5 sm:p-6"
        onSubmit={applyFilters}
      >
        {filterOptionsError && profile !== 'administrator' && (
          <div className="space-y-3 rounded-lg border border-danger bg-error-surface p-4">
            <p className="text-body-medium text-danger" role="alert">
              {filterOptionsError}
            </p>
            <button
              className="account-button-secondary min-h-10 rounded-lg border border-panel-outline bg-surface px-4 text-label-large font-medium text-primary"
              onClick={() => {
                setFilterOptionsLoading(true);
                setFilterOptionsError(null);
                setFilterOptionsRetry((attempt) => attempt + 1);
              }}
              type="button"
            >
              Tentar carregar filtros novamente
            </button>
          </div>
        )}
        {filterOptionsLoading && profile !== 'administrator' && (
          <p aria-live="polite" className="text-body-medium text-muted" role="status">
            Carregando opções acadêmicas…
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <label
              className="text-label-large font-medium text-on-surface"
              htmlFor="account-search"
            >
              Buscar por nome ou e-mail
            </label>
            <input
              autoComplete="off"
              className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              id="account-search"
              onChange={(event) => setDraft({ ...draft, search: event.currentTarget.value })}
              type="search"
              value={draft.search}
            />
          </div>
          {profile === 'student' && (
            <>
              <div className="space-y-2">
                <label
                  className="text-label-large font-medium text-on-surface"
                  htmlFor="account-activation-filter"
                >
                  Ativação
                </label>
                <SelectField
                  id="account-activation-filter"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      activationStatus: event.currentTarget.value as '' | AccountActivationStatus,
                    })
                  }
                  value={draft.activationStatus}
                >
                  <option value="">Todas</option>
                  <option value="pending">Pendente</option>
                  <option value="activated">Ativada</option>
                </SelectField>
              </div>
              <div className="space-y-2">
                <label
                  className="text-label-large font-medium text-on-surface"
                  htmlFor="account-enrollment-filter"
                >
                  Matrícula
                </label>
                <SelectField
                  id="account-enrollment-filter"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      enrollmentStatus: event.currentTarget.value as '' | StudentEnrollmentStatus,
                    })
                  }
                  value={draft.enrollmentStatus}
                >
                  <option value="">Todas</option>
                  <option value="active">Com matrícula ativa</option>
                  <option value="no_active_enrollment">Sem matrícula ativa</option>
                </SelectField>
              </div>
            </>
          )}
          {profile === 'teacher' && (
            <>
              <div className="space-y-2">
                <label
                  className="text-label-large font-medium text-on-surface"
                  htmlFor="account-subject-filter"
                >
                  Matéria
                </label>
                <SelectField
                  id="account-subject-filter"
                  disabled={filterOptionsLoading || Boolean(filterOptionsError)}
                  onChange={(event) => setDraft({ ...draft, subjectId: event.currentTarget.value })}
                  value={draft.subjectId}
                >
                  <option value="">Todas as matérias</option>
                  {filterOptions.subjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.name}
                    </option>
                  ))}
                </SelectField>
              </div>
            </>
          )}
          {(profile === 'student' || profile === 'teacher') && (
            <AcademicClassFilters
              classes={filterOptions.classes}
              disabled={filterOptionsLoading || Boolean(filterOptionsError)}
              draft={draft}
              onSchoolYearChange={(schoolYear) => {
                setDraft({ ...draft, schoolYear, series: '' });
                setFilterValidationError(null);
              }}
              onSeriesChange={(series) => {
                setDraft({ ...draft, series });
                setFilterValidationError(null);
              }}
            />
          )}
        </div>
        {filterValidationError && (
          <p className="text-body-medium text-danger" role="alert">
            {filterValidationError}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="account-button-primary min-h-11 rounded-lg bg-primary px-5 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            type="submit"
          >
            Aplicar filtros
          </button>
          <button
            className="account-button-secondary min-h-11 rounded-lg border border-panel-outline px-5 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={clearFilters}
            type="button"
          >
            Limpar filtros
          </button>
          <label className="flex items-center gap-2 text-body-medium text-on-surface sm:ml-auto">
            Itens por página
            <SelectField
              aria-label="Itens por página"
              density="compact"
              onChange={(event) => changePageSize(event.currentTarget.value)}
              value={draft.pageSize}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </SelectField>
          </label>
        </div>
      </form>

      <div className="flex justify-end">
        <Link
          className="account-button-primary inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          to={accountCollectionPath(profile) + '/novo'}
        >
          Cadastrar conta
        </Link>
      </div>

      {loading ? (
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando contas…
        </p>
      ) : errorMessage ? (
        <div className="space-y-3 rounded-2xl border border-danger bg-error-surface p-5">
          <p aria-live="assertive" className="text-body-medium text-danger" role="alert">
            {errorMessage}
          </p>
          <button
            className="account-button-secondary min-h-11 rounded-lg border border-panel-outline bg-surface px-4 text-label-large font-medium text-primary"
            onClick={() => {
              setLoading(true);
              setErrorMessage(null);
              setFilters({ ...filters });
            }}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      ) : result ? (
        <>
          {result.items.length === 0 ? (
            <div className="panel-surface rounded-2xl bg-surface p-6">
              <p className="text-body-large text-on-surface">
                Ajuste os filtros ou cadastre uma conta.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4">
              {result.items.map((account) => {
                const id = accountIdentifier(account);
                return (
                  <li key={id}>
                    <article className="panel-surface flex h-full flex-col gap-4 rounded-2xl bg-surface p-5">
                      <div className="flex min-w-0 items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="truncate text-title-large font-semibold text-on-surface">
                            {account.name}
                          </h2>
                          <p className="break-all text-body-medium text-muted">{account.email}</p>
                          {'currentClass' in account && account.currentClass && (
                            <p className="mt-2 text-body-medium text-on-surface">
                              <span className="font-semibold">Turma:</span>{' '}
                              {classLabel(account.currentClass)}
                            </p>
                          )}
                        </div>
                        <dl className="flex shrink-0 flex-col items-end gap-2 text-body-medium text-on-surface">
                          <div>
                            <dt className="sr-only">Ativação</dt>
                            <dd>
                              <Badge tone={activationStatusTone(account.activationStatus)}>
                                {activationStatusLabel(account.activationStatus)}
                              </Badge>
                            </dd>
                          </div>
                          {'currentClass' in account && (
                            <div>
                              <dt className="sr-only">Matrícula</dt>
                              <dd>
                                <Badge
                                  tone={
                                    account.enrollmentStatus === 'active' ? 'positive' : 'neutral'
                                  }
                                >
                                  {enrollmentStatusLabel(account.enrollmentStatus)}
                                </Badge>
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                      <Link
                        className="account-button-secondary mt-auto inline-flex min-h-11 w-fit items-center rounded-lg border border-panel-outline px-4 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        to={accountCollectionPath(profile) + '/' + encodeURIComponent(id)}
                      >
                        Ver detalhes
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-body-medium text-muted" role="status">
              {result.pagination.totalItems === 0
                ? 'Nenhuma conta encontrada.'
                : result.pagination.totalItems +
                  ' contas encontradas · página ' +
                  result.pagination.page +
                  ' de ' +
                  result.pagination.totalPages}
            </p>
            <nav aria-label="Paginação de contas" className="flex flex-wrap items-center gap-3">
              <button
                className="account-button-secondary min-h-11 rounded-lg border border-panel-outline bg-surface px-4 text-label-large font-medium text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || filters.page <= 1}
                onClick={() => changePage(filters.page - 1)}
                type="button"
              >
                Anterior
              </button>
              <button
                className="account-button-secondary min-h-11 rounded-lg border border-panel-outline bg-surface px-4 text-label-large font-medium text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  loading ||
                  result.pagination.totalPages === 0 ||
                  filters.page >= result.pagination.totalPages
                }
                onClick={() => changePage(filters.page + 1)}
                type="button"
              >
                Próxima
              </button>
            </nav>
          </div>
        </>
      ) : null}
    </AccountPageShell>
  );
}
