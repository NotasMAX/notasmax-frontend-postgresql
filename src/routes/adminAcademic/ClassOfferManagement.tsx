import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { accountErrorMessage } from '../adminAccounts/accountUi';
import {
  addAcademicOffer,
  addAcademicTeacher,
  loadAcademicOfferPage,
  loadAcademicSubjectChoices,
  loadAcademicTeacherCandidates,
  loadAcademicTeacherPage,
  removeAcademicOffer,
  removeAcademicTeacher,
} from '../../academic/academicLifecycleService';
import type { ClassSubjectOffer, TeacherAssociation } from '../../api/adminAcademicLifecycle';
import type { AdminSubjectOption } from '../../api/adminAcademicCatalog';
import type { TeacherAccountSummary } from '../../api/adminAccounts';

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-panel-outline bg-surface px-4 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70';
const primaryClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70';
const inputClass =
  'min-h-11 w-full rounded-lg border border-outline bg-surface px-3 text-body-medium text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

interface TeacherCollection {
  readonly items: readonly TeacherAssociation[];
  readonly etag: string;
}

type PendingRemoval =
  | { readonly kind: 'offer'; readonly offer: ClassSubjectOffer }
  | {
      readonly kind: 'teacher';
      readonly offer: ClassSubjectOffer;
      readonly teacher: TeacherAssociation;
    };

export function ClassOfferManagement({ classId }: { readonly classId: string }) {
  const [offers, setOffers] = useState<readonly ClassSubjectOffer[]>([]);
  const [offerEtag, setOfferEtag] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<readonly AdminSubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherCollection | null>(null);
  const [teacherQuery, setTeacherQuery] = useState('');
  const [teacherCandidates, setTeacherCandidates] = useState<readonly TeacherAccountSummary[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const mutationInFlight = useRef(false);

  const refreshOffers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await loadAcademicOfferPage(classId);
      setOffers(result.items);
      setOfferEtag(result.etag);
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- begin collection reads when the class changes.
    void refreshOffers();
    void loadAcademicSubjectChoices()
      .then(setSubjects)
      .catch((error: unknown) => {
        setErrorMessage(accountErrorMessage(error));
      });
  }, [refreshOffers]);

  async function expandOffer(offer: ClassSubjectOffer) {
    if (expandedSubjectId === offer.subjectId) {
      setExpandedSubjectId(null);
      setTeachers(null);
      return;
    }
    setExpandedSubjectId(offer.subjectId);
    setTeachers(null);
    setSelectedTeacherId('');
    try {
      setTeachers(await loadAcademicTeacherPage(classId, offer.subjectId));
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    }
  }

  async function searchTeachers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const page = await loadAcademicTeacherCandidates({
        ...(teacherQuery.trim() ? { search: teacherQuery.trim() } : {}),
        page: 1,
        pageSize: 20,
      });
      setTeacherCandidates(page.items);
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    }
  }

  async function addOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offerEtag || !selectedSubjectId || busy || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setErrorMessage(null);
    try {
      await addAcademicOffer(classId, selectedSubjectId, offerEtag);
      setSelectedSubjectId('');
      await refreshOffers();
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
      await refreshOffers();
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  async function confirmRemoval() {
    if (!pendingRemoval || busy || !offerEtag || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setErrorMessage(null);
    try {
      if (pendingRemoval.kind === 'offer') {
        await removeAcademicOffer(classId, pendingRemoval.offer.subjectId, offerEtag);
        if (expandedSubjectId === pendingRemoval.offer.subjectId) {
          setExpandedSubjectId(null);
          setTeachers(null);
        }
      } else {
        if (!teachers) return;
        await removeAcademicTeacher(
          classId,
          pendingRemoval.offer.subjectId,
          pendingRemoval.teacher.teacherId,
          teachers.etag,
        );
      }
      setPendingRemoval(null);
      await refreshOffers();
      if (pendingRemoval.kind === 'teacher') {
        setTeachers(await loadAcademicTeacherPage(classId, pendingRemoval.offer.subjectId));
      }
    } catch (error) {
      setPendingRemoval(null);
      setErrorMessage(accountErrorMessage(error));
      await refreshOffers();
      if (pendingRemoval.kind === 'teacher') {
        try {
          setTeachers(await loadAcademicTeacherPage(classId, pendingRemoval.offer.subjectId));
        } catch {
          setTeachers(null);
        }
      }
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  async function addTeacher(offer: ClassSubjectOffer) {
    if (!teachers || !selectedTeacherId || busy || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setErrorMessage(null);
    try {
      await addAcademicTeacher(classId, offer.subjectId, selectedTeacherId, teachers.etag);
      setTeachers(await loadAcademicTeacherPage(classId, offer.subjectId));
      setSelectedTeacherId('');
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
      try {
        setTeachers(await loadAcademicTeacherPage(classId, offer.subjectId));
      } catch {
        setTeachers(null);
      }
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  const availableSubjects = subjects.filter(
    (subject) => !offers.some((offer) => offer.subjectId === subject.subjectId),
  );

  return (
    <section
      aria-labelledby="class-offers-heading"
      className="panel-surface space-y-5 rounded-2xl bg-surface p-5 sm:p-6"
    >
      <div>
        <h2 className="text-title-large font-semibold text-on-surface" id="class-offers-heading">
          Matérias e professores da turma
        </h2>
        <p className="mt-1 text-body-medium text-muted">
          Uma matéria pode ter vários professores associados. A API valida se a turma continua
          aberta e se a versão está atualizada.
        </p>
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
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void addOffer(event)}>
        <label className="sr-only" htmlFor="offer-subject">
          Matéria para adicionar
        </label>
        <select
          className={inputClass}
          disabled={busy || availableSubjects.length === 0}
          id="offer-subject"
          onChange={(event) => setSelectedSubjectId(event.currentTarget.value)}
          required
          value={selectedSubjectId}
        >
          <option value="">Selecione uma matéria</option>
          {availableSubjects.map((subject) => (
            <option key={subject.subjectId} value={subject.subjectId}>
              {subject.name}
            </option>
          ))}
        </select>
        <button
          className={primaryClass}
          disabled={busy || !offerEtag || !selectedSubjectId}
          type="submit"
        >
          {busy ? 'Salvando…' : 'Adicionar matéria'}
        </button>
      </form>
      {loading ? (
        <p aria-live="polite" className="text-body-medium text-muted" role="status">
          Carregando matérias…
        </p>
      ) : offers.length === 0 ? (
        <p className="text-body-medium text-muted">Nenhuma matéria associada a esta turma.</p>
      ) : (
        <ul className="space-y-4">
          {offers.map((offer) => (
            <li className="space-y-4 rounded-xl border border-outline p-4" key={offer.subjectId}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-on-surface">{offer.name}</h3>
                  {offer.description && (
                    <p className="text-body-small text-muted">{offer.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => void expandOffer(offer)}
                    type="button"
                  >
                    {expandedSubjectId === offer.subjectId
                      ? 'Ocultar professores'
                      : 'Gerenciar professores'}
                  </button>
                  <button
                    className={buttonClass}
                    disabled={busy || !offerEtag}
                    onClick={() => setPendingRemoval({ kind: 'offer', offer })}
                    type="button"
                  >
                    Remover matéria
                  </button>
                </div>
              </div>
              {expandedSubjectId === offer.subjectId && (
                <div className="space-y-4 border-t border-outline pt-4">
                  {teachers ? (
                    <>
                      {teachers.items.length === 0 ? (
                        <p className="text-body-medium text-muted">Nenhum professor associado.</p>
                      ) : (
                        <ul aria-label={`Professores de ${offer.name}`} className="space-y-2">
                          {teachers.items.map((teacher) => (
                            <li
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container p-3"
                              key={teacher.teacherId}
                            >
                              <span className="text-body-medium text-on-surface">
                                {teacher.name}
                              </span>
                              <button
                                className={buttonClass}
                                disabled={busy}
                                onClick={() =>
                                  setPendingRemoval({ kind: 'teacher', offer, teacher })
                                }
                                type="button"
                              >
                                Remover professor
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <form className="space-y-3" onSubmit={(event) => void searchTeachers(event)}>
                        <label
                          className="block space-y-2 text-label-large font-medium text-on-surface"
                          htmlFor={`teacher-search-${offer.subjectId}`}
                        >
                          <span>Buscar professor para associar</span>
                          <input
                            autoComplete="off"
                            className={inputClass}
                            id={`teacher-search-${offer.subjectId}`}
                            maxLength={120}
                            onChange={(event) => setTeacherQuery(event.currentTarget.value)}
                            value={teacherQuery}
                          />
                        </label>
                        <button className={buttonClass} disabled={busy} type="submit">
                          Buscar professores
                        </button>
                        {teacherCandidates.length > 0 && (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <label
                              className="sr-only"
                              htmlFor={`teacher-candidate-${offer.subjectId}`}
                            >
                              Professor
                            </label>
                            <select
                              className={inputClass}
                              id={`teacher-candidate-${offer.subjectId}`}
                              onChange={(event) => setSelectedTeacherId(event.currentTarget.value)}
                              value={selectedTeacherId}
                            >
                              <option value="">Selecione um professor</option>
                              {teacherCandidates.map((candidate) => (
                                <option key={candidate.teacherId} value={candidate.teacherId}>
                                  {candidate.name} · {candidate.email}
                                </option>
                              ))}
                            </select>
                            <button
                              className={primaryClass}
                              disabled={busy || !selectedTeacherId}
                              onClick={() => void addTeacher(offer)}
                              type="button"
                            >
                              {busy ? 'Salvando…' : 'Associar professor'}
                            </button>
                          </div>
                        )}
                      </form>
                    </>
                  ) : (
                    <p aria-live="polite" className="text-body-medium text-muted" role="status">
                      Carregando professores…
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {pendingRemoval && (
        <ConfirmDialog
          confirmLabel="Confirmar remoção"
          onCancel={() => setPendingRemoval(null)}
          onConfirm={() => void confirmRemoval()}
          pending={busy}
          pendingLabel="Removendo…"
          title={
            pendingRemoval.kind === 'offer'
              ? 'Remover matéria da turma?'
              : 'Remover professor da matéria?'
          }
        >
          {pendingRemoval.kind === 'offer' ? (
            <p>
              A matéria {pendingRemoval.offer.name} e seus vínculos atuais com professores serão
              removidos desta turma. A API pode impedir a operação se houver simulado realizado ou
              resultados vinculados.
            </p>
          ) : (
            <p>
              {pendingRemoval.teacher.name} deixará de estar associado à matéria{' '}
              {pendingRemoval.offer.name}. O cadastro do professor não será removido.
            </p>
          )}
        </ConfirmDialog>
      )}
    </section>
  );
}
