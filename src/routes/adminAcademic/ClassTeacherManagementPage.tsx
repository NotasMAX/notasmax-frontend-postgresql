import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router';
import { loadAcademicClass } from '../../academic/academicStructureService';
import {
  addAcademicTeacher,
  loadAcademicOfferPage,
  loadAcademicTeacherCandidates,
  loadAcademicTeacherPage,
  removeAcademicTeacher,
} from '../../academic/academicLifecycleService';
import type { ClassSubjectOffer, TeacherAssociation } from '../../api/adminAcademicLifecycle';
import type { AdminClass } from '../../api/adminAcademicCatalog';
import type { TeacherAccountSummary } from '../../api/adminAccounts';
import { ActionLink } from '../../components/ActionLink';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CenteredSubmitButton } from '../../components/CenteredSubmitButton';
import { accountErrorMessage } from '../adminAccounts/accountUi';
import { AcademicPageLayout } from './AcademicPageLayout';
const inputClass =
  'min-h-11 w-full rounded-lg border border-outline bg-surface px-3 text-body-medium text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

interface TeacherCollection {
  readonly items: readonly TeacherAssociation[];
  readonly etag: string;
}

export function ClassTeacherManagementPage() {
  const { classId, subjectId } = useParams();
  const [schoolClass, setSchoolClass] = useState<AdminClass | null>(null);
  const [offer, setOffer] = useState<ClassSubjectOffer | null>(null);
  const [teachers, setTeachers] = useState<TeacherCollection | null>(null);
  const [teacherQuery, setTeacherQuery] = useState('');
  const [teacherCandidates, setTeacherCandidates] = useState<readonly TeacherAccountSummary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<TeacherAssociation | null>(null);
  const mutationInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!classId || !subjectId) {
      setErrorMessage('Não foi possível localizar a turma ou a matéria.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setInitialLoadFailed(false);
    try {
      const [classResult, offerResult, teacherResult] = await Promise.all([
        loadAcademicClass(classId),
        loadAcademicOfferPage(classId),
        loadAcademicTeacherPage(classId, subjectId),
      ]);
      const selectedOffer = offerResult.items.find((item) => item.subjectId === subjectId);
      if (!selectedOffer) throw new Error('A matéria não está associada a esta turma.');

      setSchoolClass(classResult.schoolClass);
      setOffer(selectedOffer);
      setTeachers(teacherResult);
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
      setInitialLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [classId, subjectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the route's class and association data.
    void refresh();
  }, [refresh]);

  async function searchTeachers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searching || busy) return;
    setSearching(true);
    setErrorMessage(null);
    setTeacherCandidates([]);
    setHasSearched(false);
    try {
      const result = await loadAcademicTeacherCandidates({
        ...(teacherQuery.trim() ? { search: teacherQuery.trim() } : {}),
        page: 1,
        pageSize: 20,
      });
      setTeacherCandidates(result.items);
      setHasSearched(true);
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    } finally {
      setSearching(false);
    }
  }

  async function addTeacher(teacherId: string) {
    if (!classId || !subjectId || !teachers || !teacherId || busy || mutationInFlight.current)
      return;
    mutationInFlight.current = true;
    setBusy(true);
    setErrorMessage(null);
    try {
      await addAcademicTeacher(classId, subjectId, teacherId, teachers.etag);
      setTeacherCandidates([]);
      setHasSearched(false);
      await refresh();
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
      await refresh();
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  async function confirmTeacherRemoval() {
    if (
      !classId ||
      !subjectId ||
      !teachers ||
      !pendingRemoval ||
      busy ||
      mutationInFlight.current
    ) {
      return;
    }
    mutationInFlight.current = true;
    setBusy(true);
    setErrorMessage(null);
    try {
      await removeAcademicTeacher(classId, subjectId, pendingRemoval.teacherId, teachers.etag);
      setPendingRemoval(null);
      await refresh();
    } catch (error) {
      setPendingRemoval(null);
      setErrorMessage(accountErrorMessage(error));
      await refresh();
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  const availableCandidates = teacherCandidates.filter(
    (candidate) => !teachers?.items.some((teacher) => teacher.teacherId === candidate.teacherId),
  );
  const classLabel = schoolClass
    ? `${schoolClass.series}ª série — ${schoolClass.schoolYear}`
    : 'Turma';
  const backToClass = `/admin/estrutura/turmas/${encodeURIComponent(classId ?? '')}`;

  return (
    <AcademicPageLayout
      description={
        offer ? `${offer.name} · ${classLabel}` : 'Professores associados à matéria da turma.'
      }
      title="Gerenciar professores"
    >
      <div>
        <ActionLink leadingIcon="arrowBack" to={backToClass}>
          Voltar à turma
        </ActionLink>
      </div>

      {errorMessage && (
        <div className="flex flex-col items-start gap-3">
          <Alert className="w-full" tone="danger">
            {errorMessage}
          </Alert>
          {initialLoadFailed && !loading && (
            <Button onClick={() => void refresh()} type="button" variant="secondary">
              Tentar novamente
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando professores…
        </p>
      ) : offer && teachers ? (
        <>
          <section
            aria-labelledby="associated-teachers-heading"
            className="panel-surface space-y-4 rounded-2xl bg-surface p-5 sm:p-6"
          >
            <div>
              <h2
                className="text-title-large font-semibold text-on-surface"
                id="associated-teachers-heading"
              >
                Professores associados
              </h2>
              <p className="mt-1 text-body-medium text-muted">
                {offer.name} · {classLabel}
              </p>
            </div>
            {teachers.items.length === 0 ? (
              <p className="text-body-medium text-muted">
                Nenhum professor associado a esta matéria.
              </p>
            ) : (
              <ul className="space-y-3">
                {teachers.items.map((teacher) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container p-4"
                    key={teacher.teacherId}
                  >
                    <div>
                      <p className="font-medium text-on-surface">{teacher.name}</p>
                      <p className="text-body-small text-muted">{teacher.email}</p>
                    </div>
                    <Button
                      disabled={busy}
                      leadingIcon="delete"
                      onClick={() => setPendingRemoval(teacher)}
                      type="button"
                      variant="danger"
                    >
                      Remover professor
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="add-teacher-heading"
            className="panel-surface space-y-4 rounded-2xl bg-surface p-5 sm:p-6"
          >
            <div>
              <h2
                className="text-title-large font-semibold text-on-surface"
                id="add-teacher-heading"
              >
                Associar professor
              </h2>
              <p className="mt-1 text-body-medium text-muted">
                Busque pelo nome ou e-mail e associe um professor disponível.
              </p>
            </div>
            <form
              aria-busy={searching || busy}
              className="space-y-3"
              onSubmit={(event) => void searchTeachers(event)}
            >
              <label
                className="block space-y-2 text-label-large font-medium text-on-surface"
                htmlFor="teacher-search"
              >
                Buscar professor por nome ou e-mail
                <input
                  autoComplete="off"
                  className={inputClass}
                  id="teacher-search"
                  maxLength={120}
                  onChange={(event) => setTeacherQuery(event.currentTarget.value)}
                  value={teacherQuery}
                />
              </label>
              <CenteredSubmitButton disabled={busy || searching} icon="search">
                {searching ? 'Buscando…' : 'Buscar'}
              </CenteredSubmitButton>
              {availableCandidates.length > 0 && (
                <ul aria-label="Professores disponíveis" className="space-y-3">
                  {availableCandidates.map((candidate) => (
                    <li
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container p-4"
                      key={candidate.teacherId}
                    >
                      <div>
                        <p className="font-medium text-on-surface">{candidate.name}</p>
                        <p className="text-body-small text-muted">{candidate.email}</p>
                      </div>
                      <Button
                        disabled={busy}
                        leadingIcon="add"
                        onClick={() => void addTeacher(candidate.teacherId)}
                        type="button"
                        variant="primary"
                      >
                        {busy ? 'Associando…' : 'Associar professor'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {hasSearched && availableCandidates.length === 0 && (
                <p aria-live="polite" className="text-body-medium text-muted" role="status">
                  Nenhum professor disponível para associação com esta busca.
                </p>
              )}
            </form>
          </section>
        </>
      ) : null}

      {pendingRemoval && offer && (
        <ConfirmDialog
          confirmLabel="Confirmar remoção"
          onCancel={() => setPendingRemoval(null)}
          onConfirm={() => void confirmTeacherRemoval()}
          pending={busy}
          pendingLabel="Removendo…"
          title="Remover professor da matéria?"
        >
          <p>
            {pendingRemoval.name} deixará de estar associado à matéria {offer.name}. O cadastro do
            professor não será removido.
          </p>
        </ConfirmDialog>
      )}
    </AcademicPageLayout>
  );
}
