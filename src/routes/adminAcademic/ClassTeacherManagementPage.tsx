import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router';
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
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SelectField } from '../../components/SelectField';
import { accountErrorMessage } from '../adminAccounts/accountUi';
import { AcademicPageLayout } from './AcademicPageLayout';
import {
  primaryButtonClass,
  secondaryButtonClass,
  secondaryDisabledButtonClass,
} from './academicButtonStyles';
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
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    try {
      const result = await loadAcademicTeacherCandidates({
        ...(teacherQuery.trim() ? { search: teacherQuery.trim() } : {}),
        page: 1,
        pageSize: 20,
      });
      setTeacherCandidates(result.items);
      setSelectedTeacherId('');
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    } finally {
      setSearching(false);
    }
  }

  async function addTeacher() {
    if (
      !classId ||
      !subjectId ||
      !teachers ||
      !selectedTeacherId ||
      busy ||
      mutationInFlight.current
    )
      return;
    mutationInFlight.current = true;
    setBusy(true);
    setErrorMessage(null);
    try {
      await addAcademicTeacher(classId, subjectId, selectedTeacherId, teachers.etag);
      setTeacherCandidates([]);
      setSelectedTeacherId('');
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
        <Link className={secondaryButtonClass} to={backToClass}>
          Voltar à turma
        </Link>
      </div>

      {errorMessage && (
        <p
          aria-live="assertive"
          className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
          role="alert"
        >
          {errorMessage}
        </p>
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
                    <button
                      className={secondaryDisabledButtonClass}
                      disabled={busy}
                      onClick={() => setPendingRemoval(teacher)}
                      type="button"
                    >
                      Remover professor
                    </button>
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
                Busque pelo nome ou e-mail e selecione um professor disponível.
              </p>
            </div>
            <form className="space-y-3" onSubmit={(event) => void searchTeachers(event)}>
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
              <button
                className={secondaryDisabledButtonClass}
                disabled={busy || searching}
                type="submit"
              >
                {searching ? 'Buscando…' : 'Buscar professores'}
              </button>
              {availableCandidates.length > 0 && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="teacher-candidate">
                    Professor disponível
                  </label>
                  <SelectField
                    disabled={busy}
                    id="teacher-candidate"
                    onChange={(event) => setSelectedTeacherId(event.currentTarget.value)}
                    value={selectedTeacherId}
                  >
                    <option value="">Selecione um professor</option>
                    {availableCandidates.map((candidate) => (
                      <option key={candidate.teacherId} value={candidate.teacherId}>
                        {candidate.name} · {candidate.email}
                      </option>
                    ))}
                  </SelectField>
                  <button
                    className={primaryButtonClass}
                    disabled={busy || !selectedTeacherId}
                    onClick={() => void addTeacher()}
                    type="button"
                  >
                    {busy ? 'Salvando…' : 'Associar professor'}
                  </button>
                </div>
              )}
              {teacherCandidates.length > 0 && availableCandidates.length === 0 && (
                <p className="text-body-medium text-muted">
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
