import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { AdminClass, AdminSubjectOption } from '../../api/adminAcademicCatalog';
import {
  createAcademicClass,
  createAcademicSubject,
  loadAcademicClass,
  loadAcademicClasses,
  loadAcademicSchoolYears,
  loadAcademicSubject,
  loadAcademicSubjects,
  loadAllAcademicClasses,
  updateAcademicClass,
  updateAcademicSubject,
} from '../../academic/academicStructureService';
import { civilDateLabel, accountErrorMessage } from '../adminAccounts/accountUi';
import { ClassOfferManagement } from './ClassOfferManagement';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CenteredSubmitButton } from '../../components/CenteredSubmitButton';
import { SelectField } from '../../components/SelectField';
import { AcademicPageLayout } from './AcademicPageLayout';
import {
  dangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './academicButtonStyles';
import {
  closeAcademicClass,
  createAcademicClassWithClosures,
  prepareClassClosureSelection,
} from '../../academic/academicLifecycleService';

const PAGE_SIZE = 20;
const CLASS_SERIES_OPTIONS = [1, 2, 3] as const;
const fieldClass =
  'min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

function LoadError({ message, retry }: { readonly message: string; readonly retry: () => void }) {
  return (
    <div className="space-y-3 rounded-2xl border border-danger bg-error-surface p-5">
      <p aria-live="assertive" className="text-body-medium text-danger" role="alert">
        {message}
      </p>
      <button className={secondaryButtonClass} onClick={retry} type="button">
        Tentar novamente
      </button>
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onPageChange,
}: {
  readonly page: number;
  readonly totalPages: number;
  readonly onPageChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-3">
      <button
        className={secondaryButtonClass}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        Anterior
      </button>
      <p aria-live="polite" className="text-body-medium text-muted">
        Página {page} de {totalPages}
      </p>
      <button
        className={secondaryButtonClass}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        Próxima
      </button>
    </nav>
  );
}

export function AcademicSubjectListPage() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [subjects, setSubjects] = useState<readonly AdminSubjectOption[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function refresh(nextPage = page, query = appliedSearch) {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await loadAcademicSubjects({
        ...(query ? { search: query } : {}),
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setSubjects(result.items);
      setTotalPages(result.pagination.totalPages);
      setPage(nextPage);
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- begin the page's asynchronous data load.
    void refresh(1, '');
    // Initial load is scoped to this mounted page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSearch = search.trim();
    setAppliedSearch(nextSearch);
    void refresh(1, nextSearch);
  }

  return (
    <AcademicPageLayout
      actions={
        <Link className={primaryButtonClass} to="/admin/estrutura/materias/nova">
          Cadastrar matéria
        </Link>
      }
      description="Consulte, pesquise, cadastre e edite as matérias disponíveis."
      title="Matérias"
    >
      <form className="panel-surface space-y-3 rounded-2xl bg-surface p-4" onSubmit={submitSearch}>
        <div className="min-w-0 flex-1 space-y-2">
          <label className="text-label-large font-medium text-on-surface" htmlFor="subject-search">
            Buscar por nome
          </label>
          <input
            className={fieldClass}
            id="subject-search"
            maxLength={120}
            onChange={(event) => setSearch(event.currentTarget.value)}
            value={search}
          />
        </div>
        <CenteredSubmitButton disabled={loading} icon="search">
          Buscar
        </CenteredSubmitButton>
      </form>
      {loading ? (
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando matérias…
        </p>
      ) : errorMessage ? (
        <LoadError message={errorMessage} retry={() => void refresh()} />
      ) : subjects.length === 0 ? (
        <p className="panel-surface rounded-2xl bg-surface p-6 text-body-large text-muted">
          Nenhuma matéria encontrada.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {subjects.map((subject) => (
              <li
                className="panel-surface flex flex-col justify-between gap-4 rounded-2xl bg-surface p-5 sm:flex-row sm:items-center"
                key={subject.subjectId}
              >
                <div className="space-y-1">
                  <h2 className="text-title-medium font-semibold text-on-surface">
                    {subject.name}
                  </h2>
                  <p className="text-body-medium text-muted">
                    {subject.description || 'Sem descrição.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className={secondaryButtonClass}
                    to={`/admin/estrutura/materias/${encodeURIComponent(subject.subjectId)}`}
                  >
                    Ver matéria
                  </Link>
                  <Link
                    className={primaryButtonClass}
                    to={`/admin/estrutura/materias/${encodeURIComponent(subject.subjectId)}/editar`}
                  >
                    Editar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <Pager onPageChange={(next) => void refresh(next)} page={page} totalPages={totalPages} />
        </>
      )}
    </AcademicPageLayout>
  );
}

export function AcademicSubjectDetailPage() {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState<AdminSubjectOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function refresh() {
    if (!subjectId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      setSubject(await loadAcademicSubject(subjectId));
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- begin the page's asynchronous data load.
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  return (
    <AcademicPageLayout
      actions={
        <div className="flex w-full items-center justify-between gap-3">
          <Link className={secondaryButtonClass} to="/admin/estrutura/materias">
            Voltar à lista
          </Link>
          {subjectId && (
            <Link
              className={primaryButtonClass}
              to={`/admin/estrutura/materias/${encodeURIComponent(subjectId)}/editar`}
            >
              Editar matéria
            </Link>
          )}
        </div>
      }
      description="Veja os detalhes desta matéria."
      title={subject?.name ?? 'Detalhes da matéria'}
    >
      {loading ? (
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando matéria…
        </p>
      ) : errorMessage ? (
        <LoadError message={errorMessage} retry={() => void refresh()} />
      ) : subject ? (
        <dl className="panel-surface grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-2">
          <div>
            <dt className="text-label-large font-medium text-muted">Nome</dt>
            <dd className="text-body-large text-on-surface">{subject.name}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-label-large font-medium text-muted">Descrição</dt>
            <dd className="whitespace-pre-wrap text-body-large text-on-surface">
              {subject.description || 'Sem descrição.'}
            </dd>
          </div>
        </dl>
      ) : null}
    </AcademicPageLayout>
  );
}

export function AcademicSubjectFormPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(subjectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(editing);
  const [subjectLoaded, setSubjectLoaded] = useState(!editing);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    let active = true;
    void loadAcademicSubject(subjectId)
      .then((subject) => {
        if (active) {
          setName(subject.name);
          setDescription(subject.description ?? '');
          setSubjectLoaded(true);
        }
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(accountErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [subjectId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !name.trim() || (editing && !subjectLoaded)) return;
    submitting.current = true;
    let completed = false;
    setSaving(true);
    setErrorMessage(null);
    try {
      const input = { name: name.trim(), description: description.trim() || null };
      const subject = editing
        ? await updateAcademicSubject(subjectId!, input)
        : await createAcademicSubject({
            name: input.name,
            ...(input.description ? { description: input.description } : {}),
          });
      navigate(`/admin/estrutura/materias/${encodeURIComponent(subject.subjectId)}`, {
        replace: true,
      });
      completed = true;
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    } finally {
      if (!completed) submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <AcademicPageLayout
      description={
        editing
          ? 'Atualize os dados cadastrais da matéria.'
          : 'Informe os dados para cadastrar uma matéria.'
      }
      title={editing ? 'Editar matéria' : 'Cadastrar matéria'}
    >
      {loading ? (
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando matéria…
        </p>
      ) : (
        <form
          aria-busy={saving}
          className="panel-surface max-w-3xl space-y-5 rounded-2xl bg-surface p-5 sm:p-6"
          onSubmit={submit}
        >
          {errorMessage && (
            <p
              aria-live="assertive"
              className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
          <div className="space-y-2">
            <label className="text-label-large font-medium text-on-surface" htmlFor="subject-name">
              Nome
            </label>
            <input
              autoComplete="off"
              className={fieldClass}
              id="subject-name"
              maxLength={120}
              onChange={(event) => setName(event.currentTarget.value)}
              required
              value={name}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-label-large font-medium text-on-surface"
              htmlFor="subject-description"
            >
              Descrição (opcional)
            </label>
            <textarea
              className={`${fieldClass} min-h-32 py-3`}
              id="subject-description"
              maxLength={500}
              onChange={(event) => setDescription(event.currentTarget.value)}
              value={description}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className={primaryButtonClass}
              disabled={saving || (editing && !subjectLoaded)}
              type="submit"
            >
              {saving ? 'Salvando…' : 'Salvar matéria'}
            </button>
            <Link className={secondaryButtonClass} to="/admin/estrutura/materias">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </AcademicPageLayout>
  );
}

export function AcademicClassListPage() {
  const [schoolYears, setSchoolYears] = useState<readonly number[]>([]);
  const [schoolYear, setSchoolYear] = useState('');
  const [page, setPage] = useState(1);
  const [classes, setClasses] = useState<
    readonly Pick<AdminClass, 'classId' | 'series' | 'schoolYear'>[]
  >([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function refresh(nextPage = page, year = schoolYear) {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await loadAcademicClasses({
        ...(year ? { schoolYear: Number(year) } : {}),
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setClasses(result.items);
      setTotalPages(result.pagination.totalPages);
      setPage(nextPage);
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void loadAcademicSchoolYears()
      .then((years) => {
        if (active) {
          setSchoolYears(years);
          const initialYear = years.length > 0 ? String(years[0]) : '';
          setSchoolYear(initialYear);
          void refresh(1, initialYear);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(accountErrorMessage(error));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AcademicPageLayout
      actions={
        <Link className={primaryButtonClass} to="/admin/estrutura/turmas/nova">
          Cadastrar turma
        </Link>
      }
      description="Consulte turmas por ano letivo e abra os dados da turma para edição."
      title="Turmas"
    >
      <form
        className="panel-surface space-y-3 rounded-2xl bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void refresh(1);
        }}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <label
            className="text-label-large font-medium text-on-surface"
            htmlFor="class-school-year"
          >
            Ano letivo
          </label>
          <SelectField
            id="class-school-year"
            onChange={(event) => setSchoolYear(event.currentTarget.value)}
            value={schoolYear}
          >
            <option value="">Ano letivo atual</option>
            {schoolYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </SelectField>
        </div>
        <CenteredSubmitButton disabled={loading} icon="search">
          Buscar
        </CenteredSubmitButton>
      </form>
      {loading ? (
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando turmas…
        </p>
      ) : errorMessage ? (
        <LoadError message={errorMessage} retry={() => void refresh()} />
      ) : classes.length === 0 ? (
        <p className="panel-surface rounded-2xl bg-surface p-6 text-body-large text-muted">
          Nenhuma turma encontrada para o ano selecionado.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {classes.map((schoolClass) => (
              <li
                className="panel-surface flex flex-col justify-between gap-4 rounded-2xl bg-surface p-5 sm:flex-row sm:items-center"
                key={schoolClass.classId}
              >
                <div>
                  <h2 className="text-title-medium font-semibold text-on-surface">
                    {schoolClass.series}ª série — {schoolClass.schoolYear}
                  </h2>
                  <p className="text-body-medium text-muted">Turma {schoolClass.classId}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className={secondaryButtonClass}
                    to={`/admin/estrutura/turmas/${encodeURIComponent(schoolClass.classId)}`}
                  >
                    Ver turma
                  </Link>
                  <Link
                    className={primaryButtonClass}
                    to={`/admin/estrutura/turmas/${encodeURIComponent(schoolClass.classId)}/editar`}
                  >
                    Editar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <Pager onPageChange={(next) => void refresh(next)} page={page} totalPages={totalPages} />
        </>
      )}
    </AcademicPageLayout>
  );
}

export function AcademicClassDetailPage() {
  const { classId } = useParams();
  const [schoolClass, setSchoolClass] = useState<AdminClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);
  const closureInFlight = useRef(false);

  async function refresh() {
    if (!classId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await loadAcademicClass(classId);
      setSchoolClass(result.schoolClass);
      setEtag(result.etag);
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function confirmClassClosure() {
    if (!classId || !etag || closing || closureInFlight.current) return;
    closureInFlight.current = true;
    setClosing(true);
    setErrorMessage(null);
    try {
      await closeAcademicClass(classId, etag);
      setClosed(true);
      setConfirmClose(false);
      await refresh();
    } catch (error) {
      setConfirmClose(false);
      setErrorMessage(accountErrorMessage(error));
      await refresh();
      closureInFlight.current = false;
    } finally {
      setClosing(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- begin the page's asynchronous data load.
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  return (
    <AcademicPageLayout
      actions={
        <div className="flex w-full items-center justify-between gap-3">
          <Link className={secondaryButtonClass} to="/admin/estrutura/turmas">
            Voltar à lista
          </Link>
          <div className="flex flex-wrap justify-end gap-3">
            {classId && (
              <Link
                className={primaryButtonClass}
                to={`/admin/estrutura/turmas/${encodeURIComponent(classId)}/editar`}
              >
                Editar turma
              </Link>
            )}
            {classId && !closed && (
              <button
                className={dangerButtonClass}
                disabled={!etag || closing}
                onClick={() => setConfirmClose(true)}
                type="button"
              >
                Encerrar turma
              </button>
            )}
          </div>
        </div>
      }
      description="Veja os detalhes desta turma."
      title={
        schoolClass
          ? `${schoolClass.series}ª série — ${schoolClass.schoolYear}`
          : 'Detalhes da turma'
      }
    >
      {loading ? (
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando turma…
        </p>
      ) : errorMessage ? (
        <LoadError message={errorMessage} retry={() => void refresh()} />
      ) : schoolClass ? (
        <>
          <dl className="panel-surface grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-2">
            <div>
              <dt className="text-label-large font-medium text-muted">Série</dt>
              <dd className="text-body-large text-on-surface">{schoolClass.series}ª</dd>
            </div>
            <div>
              <dt className="text-label-large font-medium text-muted">Ano letivo</dt>
              <dd className="text-body-large text-on-surface">{schoolClass.schoolYear}</dd>
            </div>
            <div>
              <dt className="text-label-large font-medium text-muted">Início</dt>
              <dd className="text-body-large text-on-surface">
                {civilDateLabel(schoolClass.startDate)}
              </dd>
            </div>
          </dl>
          {closed && (
            <p
              aria-live="polite"
              className="rounded-lg bg-surface p-4 text-body-medium text-muted"
              role="status"
            >
              Turma encerrada. Ela não aceitará novas matrículas nem alterações.
            </p>
          )}
          {classId && <ClassOfferManagement classId={classId} />}
          {confirmClose && (
            <ConfirmDialog
              confirmLabel="Encerrar turma"
              confirmTone="danger"
              onCancel={() => setConfirmClose(false)}
              onConfirm={() => void confirmClassClosure()}
              pending={closing}
              pendingLabel="Encerrando…"
              title="Encerrar esta turma?"
            >
              A turma deixará de aceitar alterações e novas matrículas. Essa ação não pode ser
              desfeita nesta tela.
            </ConfirmDialog>
          )}
        </>
      ) : null}
    </AcademicPageLayout>
  );
}

export function AcademicClassFormPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(classId);
  const [series, setSeries] = useState('1');
  const [schoolYear, setSchoolYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [schoolYears, setSchoolYears] = useState<readonly number[]>([]);
  const [etag, setEtag] = useState<string | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidateClasses, setCandidateClasses] = useState<
    readonly { classId: string; series: number; schoolYear: number }[]
  >([]);
  const [selectedCloseIds, setSelectedCloseIds] = useState<readonly string[]>([]);
  const [confirmCreate, setConfirmCreate] = useState(false);

  useEffect(() => {
    let active = true;
    void loadAcademicSchoolYears()
      .then((years) => {
        if (active) setSchoolYears(years);
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(accountErrorMessage(error));
      });
    if (!classId)
      return () => {
        active = false;
      };
    void loadAcademicClass(classId)
      .then(({ schoolClass, etag: currentEtag }) => {
        if (active) {
          setSeries(String(schoolClass.series));
          setSchoolYear(String(schoolClass.schoolYear));
          setStartDate(schoolClass.startDate);
          setEtag(currentEtag);
        }
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(accountErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || (editing && !etag) || !schoolYear.trim() || (!editing && !startDate))
      return;
    const year = Number(schoolYear);
    const selectedSeries = Number(series);
    if (!Number.isInteger(year) || !Number.isInteger(selectedSeries)) return;
    if (!editing) {
      const candidates = await loadAllAcademicClasses(year - 1).catch((error: unknown) => {
        setErrorMessage(accountErrorMessage(error));
        return null;
      });
      if (!candidates) return;
      setCandidateClasses(candidates);
      setConfirmCreate(true);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = editing
        ? await updateAcademicClass(classId!, { series: selectedSeries, schoolYear: year }, etag!)
        : await createAcademicClass({ series: selectedSeries, schoolYear: year, startDate });
      navigate(`/admin/estrutura/turmas/${encodeURIComponent(result.classId)}`, { replace: true });
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  async function confirmClassCreate() {
    if (submitting.current || !schoolYear.trim() || !startDate) return;
    submitting.current = true;
    let completed = false;
    setSaving(true);
    setErrorMessage(null);
    try {
      const closures = await prepareClassClosureSelection(selectedCloseIds);
      const created = await createAcademicClassWithClosures(
        { series: Number(series), schoolYear: Number(schoolYear), startDate },
        closures,
      );
      navigate(`/admin/estrutura/turmas/${encodeURIComponent(created.classId)}`, { replace: true });
      completed = true;
    } catch (error) {
      setConfirmCreate(false);
      setErrorMessage(accountErrorMessage(error));
    } finally {
      if (!completed) submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <AcademicPageLayout
      description={
        editing
          ? 'Atualize a série e o ano letivo da turma.'
          : 'Informe a série, o ano letivo e a data civil de início.'
      }
      title={editing ? 'Editar turma' : 'Cadastrar turma'}
    >
      {loading ? (
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando turma…
        </p>
      ) : (
        <form
          aria-busy={saving}
          className="panel-surface max-w-3xl space-y-5 rounded-2xl bg-surface p-5 sm:p-6"
          onSubmit={submit}
        >
          {errorMessage && (
            <p
              aria-live="assertive"
              className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
          <div className="space-y-2">
            <label className="text-label-large font-medium text-on-surface" htmlFor="class-series">
              Série
            </label>
            <SelectField
              id="class-series"
              onChange={(event) => {
                setSeries(event.currentTarget.value);
                setSelectedCloseIds([]);
              }}
              value={series}
            >
              {CLASS_SERIES_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}ª série
                </option>
              ))}
            </SelectField>
          </div>
          <div className="space-y-2">
            <label
              className="text-label-large font-medium text-on-surface"
              htmlFor="class-school-year"
            >
              Ano letivo
            </label>
            <input
              className={fieldClass}
              id="class-school-year"
              list="class-school-years"
              onChange={(event) => {
                setSchoolYear(event.currentTarget.value);
                setCandidateClasses([]);
                setSelectedCloseIds([]);
              }}
              required
              type="number"
              value={schoolYear}
            />
            <datalist id="class-school-years">
              {schoolYears.map((year) => (
                <option key={year} value={year} />
              ))}
            </datalist>
          </div>
          {editing ? (
            <div className="space-y-2">
              <p className="text-label-large font-medium text-on-surface">Data de início</p>
              <p className="text-body-large text-on-surface">{civilDateLabel(startDate)}</p>
              <p className="text-body-small text-muted">
                A data de início não pode ser alterada nesta operação.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label
                className="text-label-large font-medium text-on-surface"
                htmlFor="class-start-date"
              >
                Data de início
              </label>
              <input
                className={fieldClass}
                id="class-start-date"
                onChange={(event) => setStartDate(event.currentTarget.value)}
                required
                type="date"
                value={startDate}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              className={primaryButtonClass}
              disabled={saving || (editing && !etag)}
              type="submit"
            >
              {saving ? 'Salvando…' : 'Salvar turma'}
            </button>
            <Link className={secondaryButtonClass} to="/admin/estrutura/turmas">
              Cancelar
            </Link>
          </div>
        </form>
      )}
      {confirmCreate && (
        <ConfirmDialog
          confirmLabel="Confirmar cadastro"
          onCancel={() => setConfirmCreate(false)}
          onConfirm={() => void confirmClassCreate()}
          pending={saving}
          pendingLabel="Cadastrando…"
          title="Confirmar cadastro da turma?"
        >
          <div className="space-y-3">
            <p>
              {selectedCloseIds.length
                ? `A nova turma só será criada se todas as ${selectedCloseIds.length} turma(s) escolhidas puderem ser encerradas. Se algo impedir a ação, nenhuma mudança será feita.`
                : 'A turma será criada com os dados informados.'}
            </p>
            {candidateClasses.some((candidate) => candidate.series === Number(series)) && (
              <fieldset className="space-y-2">
                <legend className="text-label-large font-medium text-on-surface">
                  Turmas do ano anterior para encerrar, se aplicável
                </legend>
                <p className="text-body-small text-muted">
                  Nem todas as turmas da lista podem ser encerradas. Se alguma não puder, a nova
                  turma não será criada.
                </p>
                {candidateClasses
                  .filter((candidate) => candidate.series === Number(series))
                  .map((candidate) => (
                    <label className="flex gap-2 text-body-medium" key={candidate.classId}>
                      <input
                        checked={selectedCloseIds.includes(candidate.classId)}
                        onChange={(event) =>
                          setSelectedCloseIds((current) =>
                            event.target.checked
                              ? [...current, candidate.classId]
                              : current.filter((id) => id !== candidate.classId),
                          )
                        }
                        type="checkbox"
                      />
                      {candidate.series}ª série — {candidate.schoolYear} · {candidate.classId}
                    </label>
                  ))}
              </fieldset>
            )}
          </div>
        </ConfirmDialog>
      )}
    </AcademicPageLayout>
  );
}
