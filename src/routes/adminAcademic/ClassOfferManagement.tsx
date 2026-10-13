import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CenteredSubmitButton } from '../../components/CenteredSubmitButton';
import { SelectField } from '../../components/SelectField';
import { accountErrorMessage } from '../adminAccounts/accountUi';
import {
  addAcademicOffer,
  loadAcademicOfferPage,
  loadAcademicSubjectChoices,
  removeAcademicOffer,
} from '../../academic/academicLifecycleService';
import type { ClassSubjectOffer } from '../../api/adminAcademicLifecycle';
import type { AdminSubjectOption } from '../../api/adminAcademicCatalog';
import { dangerButtonClass, primaryButtonClass } from './academicButtonStyles';

export function ClassOfferManagement({ classId }: { readonly classId: string }) {
  const [offers, setOffers] = useState<readonly ClassSubjectOffer[]>([]);
  const [offerEtag, setOfferEtag] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<readonly AdminSubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<ClassSubjectOffer | null>(null);
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
      await removeAcademicOffer(classId, pendingRemoval.subjectId, offerEtag);
      setPendingRemoval(null);
      await refreshOffers();
    } catch (error) {
      setPendingRemoval(null);
      setErrorMessage(accountErrorMessage(error));
      await refreshOffers();
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  const availableSubjects = subjects.filter(
    (subject) => !offers.some((offer) => offer.subjectId === subject.subjectId),
  );

  return (
    <div className="space-y-5">
      {errorMessage && (
        <p
          aria-live="assertive"
          className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
      <section
        aria-labelledby="add-class-offer-heading"
        className="panel-surface space-y-4 rounded-2xl bg-surface p-5 sm:p-6"
      >
        <h2 className="text-title-large font-semibold text-on-surface" id="add-class-offer-heading">
          Adicionar matéria
        </h2>
        <form className="space-y-3" onSubmit={(event) => void addOffer(event)}>
          <label className="sr-only" htmlFor="offer-subject">
            Matéria para adicionar
          </label>
          <SelectField
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
          </SelectField>
          <CenteredSubmitButton disabled={busy || !offerEtag || !selectedSubjectId} icon="add">
            {busy ? 'Salvando…' : 'Adicionar matéria'}
          </CenteredSubmitButton>
        </form>
      </section>
      <section
        aria-labelledby="class-offers-heading"
        className="panel-surface space-y-5 rounded-2xl bg-surface p-5 sm:p-6"
      >
        <div>
          <h2 className="text-title-large font-semibold text-on-surface" id="class-offers-heading">
            Matérias da turma
          </h2>
          <p className="mt-1 text-body-medium text-muted">
            Consulte as matérias associadas e acesse a gestão de professores em uma página própria.
          </p>
        </div>
        {loading ? (
          <p aria-live="polite" className="text-body-medium text-muted" role="status">
            Carregando matérias…
          </p>
        ) : offers.length === 0 ? (
          <p className="text-body-medium text-muted">Nenhuma matéria associada a esta turma.</p>
        ) : (
          <ul aria-label="Matérias associadas" className="space-y-3">
            {offers.map((offer) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container p-4"
                key={offer.subjectId}
              >
                <div>
                  <h3 className="font-semibold text-on-surface">{offer.name}</h3>
                  {offer.description && (
                    <p className="text-body-small text-muted">{offer.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className={primaryButtonClass}
                    to={`/admin/estrutura/turmas/${encodeURIComponent(classId)}/materias/${encodeURIComponent(offer.subjectId)}/professores`}
                  >
                    Gerenciar professores
                  </Link>
                  <button
                    className={dangerButtonClass}
                    disabled={busy || !offerEtag}
                    onClick={() => setPendingRemoval(offer)}
                    type="button"
                  >
                    Remover matéria
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {pendingRemoval && (
        <ConfirmDialog
          confirmLabel="Confirmar remoção"
          onCancel={() => setPendingRemoval(null)}
          onConfirm={() => void confirmRemoval()}
          pending={busy}
          pendingLabel="Removendo…"
          title="Remover matéria da turma?"
        >
          <p>
            A matéria {pendingRemoval.name} e seus vínculos atuais com professores serão removidos
            desta turma. Não é possível removê-la se ela já tiver sido usada em simulados ou houver
            resultados relacionados.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
