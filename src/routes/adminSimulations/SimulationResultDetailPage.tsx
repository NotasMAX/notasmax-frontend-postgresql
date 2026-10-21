import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import {
  getSimulationResult,
  updateSimulationResult,
  type SimulationResult,
  type SimulationResultStatus,
} from '../../api/adminSimulationResults';
import { GENERIC_API_ERROR_MESSAGE, getApiProblemPresentation } from '../../api/problemDetails';
import { ActionLink } from '../../components/ActionLink';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { SelectField } from '../../components/SelectField';
import { Toast } from '../../components/Toast';
import { resultNumberLabel, resultStatusLabel, resultStatusTone } from '../../results/resultUi';

function publicError(error: unknown): string {
  return getApiProblemPresentation(error).message ?? GENERIC_API_ERROR_MESSAGE;
}

export function SimulationResultDetailPage() {
  const { classId, simulationId, studentId, subjectId } = useParams();
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftStatus, setDraftStatus] = useState<SimulationResultStatus>('pending');
  const [draftCorrectAnswers, setDraftCorrectAnswers] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const mutationStarted = useRef(false);
  const dismissToast = useCallback(() => setToastMessage(null), []);

  const load = useCallback(async () => {
    if (!classId || !simulationId || !studentId || !subjectId) return null;
    return getSimulationResult(classId, simulationId, studentId, subjectId);
  }, [classId, simulationId, studentId, subjectId]);

  useEffect(() => {
    let active = true;
    void load()
      .then((current) => {
        if (!active || !current) return;
        setResult(current.result);
        setEtag(current.etag);
      })
      .catch((reason: unknown) => {
        if (active) setError(publicError(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  if (!classId || !simulationId || !studentId || !subjectId) return null;
  const routeClassId = classId;
  const routeSimulationId = simulationId;
  const routeStudentId = studentId;
  const routeSubjectId = subjectId;
  const listPath = `/admin/turmas/${encodeURIComponent(routeClassId)}/simulados/${encodeURIComponent(routeSimulationId)}/resultados`;

  function beginEditing() {
    if (!result) return;
    setDraftStatus(result.status);
    setDraftCorrectAnswers(result.correctAnswers === null ? '' : String(result.correctAnswers));
    setFormError(null);
    setFeedback(null);
    setToastMessage(null);
    setEditing(true);
  }

  async function refreshResult() {
    setRefreshing(true);
    setError(null);
    try {
      const current = await load();
      if (current) {
        setResult(current.result);
        setEtag(current.etag);
        setFeedback('Os dados atualizados foram carregados.');
      }
    } catch (reason) {
      setError(publicError(reason));
    } finally {
      setRefreshing(false);
    }
  }

  async function saveResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentEtag = etag;
    if (!result || !currentEtag || pending || mutationStarted.current) return;
    if (draftStatus === 'pending') {
      setFormError('Escolha se o resultado foi avaliado ou se o aluno esteve ausente.');
      return;
    }
    if (result.status === 'absent' && draftStatus === 'absent') {
      setFormError('Selecione Avaliado para lançar uma nota neste resultado.');
      return;
    }

    let update: { status: 'assessed'; correctAnswers: number } | { status: 'absent' };
    if (draftStatus === 'absent') {
      update = { status: 'absent' };
    } else {
      const correctAnswers = Number(draftCorrectAnswers);
      if (
        !/^\d+$/.test(draftCorrectAnswers) ||
        !Number.isSafeInteger(correctAnswers) ||
        correctAnswers < 0 ||
        correctAnswers > result.totalQuestions
      ) {
        setFormError(`Informe um número inteiro entre 0 e ${result.totalQuestions}.`);
        return;
      }
      update = { status: 'assessed', correctAnswers };
    }

    mutationStarted.current = true;
    setPending(true);
    setError(null);
    setFormError(null);
    setFeedback(null);
    try {
      const saved = await updateSimulationResult(
        routeClassId,
        routeSimulationId,
        routeStudentId,
        routeSubjectId,
        update,
        currentEtag,
      );
      setResult(saved.result);
      setEtag(saved.etag);
      setEditing(false);
      setFeedback(null);
      setToastMessage('Resultado salvo.');
    } catch (reason) {
      setError(publicError(reason));
      setEditing(false);
    } finally {
      mutationStarted.current = false;
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="simulation-result-title" className="mx-auto max-w-4xl space-y-6">
      {toastMessage && <Toast message={toastMessage} onDismiss={dismissToast} tone="success" />}
      <ActionLink to={listPath}>← Voltar aos resultados</ActionLink>
      {loading ? (
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando resultado…
        </p>
      ) : error ? (
        <div className="space-y-3">
          <p
            className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
            role="alert"
          >
            {error}
          </p>
          <Button
            disabled={refreshing}
            leadingIcon="refresh"
            onClick={() => void refreshResult()}
            variant="secondary"
          >
            {refreshing ? 'Atualizando…' : 'Atualizar resultado'}
          </Button>
        </div>
      ) : result ? (
        <>
          <header className="space-y-2">
            <p className="text-label-large font-semibold uppercase tracking-wide text-primary">
              Resultado do simulado
            </p>
            <h1
              className="text-headline-medium font-semibold text-on-surface"
              id="simulation-result-title"
            >
              {result.studentName}
            </h1>
            <p className="text-body-large text-muted">{result.subjectName}</p>
          </header>

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

          <div className="panel-surface grid gap-5 rounded-2xl bg-surface p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <h2 className="text-title-medium font-semibold text-on-surface">Resultado atual</h2>
              <div className="mt-3">
                <Badge tone={resultStatusTone(result.status)}>
                  {resultStatusLabel(result.status)}
                </Badge>
              </div>
            </div>
            <dl className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <div>
                <dt className="text-label-medium font-medium text-muted">Acertos</dt>
                <dd className="mt-1 text-body-large text-on-surface">
                  {result.correctAnswers === null ? '—' : result.correctAnswers}
                </dd>
              </div>
              <div>
                <dt className="text-label-medium font-medium text-muted">Questões</dt>
                <dd className="mt-1 text-body-large text-on-surface">{result.totalQuestions}</dd>
              </div>
              <div>
                <dt className="text-label-medium font-medium text-muted">Nota</dt>
                <dd className="mt-1 text-body-large text-on-surface">
                  {resultNumberLabel(result.score)}
                </dd>
              </div>
              <div>
                <dt className="text-label-medium font-medium text-muted">Peso</dt>
                <dd className="mt-1 text-body-large text-on-surface">
                  {resultNumberLabel(result.weightPercent)}%
                </dd>
              </div>
              <div>
                <dt className="text-label-medium font-medium text-muted">Média parcial</dt>
                <dd className="mt-1 text-body-large text-on-surface">
                  {resultNumberLabel(result.weightedContribution)}
                </dd>
              </div>
            </dl>

            {!editing ? (
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button onClick={beginEditing} variant="primary">
                  Editar
                </Button>
              </div>
            ) : (
              <form
                className="space-y-4 sm:col-span-2"
                onSubmit={(event) => void saveResult(event)}
              >
                <h2 className="text-title-medium font-semibold text-on-surface">
                  Editar resultado
                </h2>
                {result.status === 'assessed' ? (
                  <p className="text-body-medium text-on-surface">
                    Situação: Avaliado. Uma nota lançada pode ser corrigida, mas não alterada para
                    ausência.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <label
                      className="text-label-large font-medium text-on-surface"
                      htmlFor="result-next-status"
                    >
                      Nova situação
                    </label>
                    <SelectField
                      id="result-next-status"
                      onChange={(event) => {
                        setDraftStatus(event.currentTarget.value as SimulationResultStatus);
                        setFormError(null);
                      }}
                      value={draftStatus}
                    >
                      {result.status === 'pending' && (
                        <option value="pending">Selecione uma ação</option>
                      )}
                      {result.status === 'absent' && (
                        <option value="absent">Ausente (situação atual)</option>
                      )}
                      <option value="assessed">Avaliado</option>
                      {result.status === 'pending' && <option value="absent">Ausente</option>}
                    </SelectField>
                    {result.status === 'absent' && draftStatus === 'absent' && (
                      <p className="text-body-small text-muted">
                        O resultado já está registrado como ausente. Selecione Avaliado para lançar
                        uma nota.
                      </p>
                    )}
                  </div>
                )}
                {draftStatus === 'assessed' && (
                  <div className="space-y-2">
                    <label
                      className="text-label-large font-medium text-on-surface"
                      htmlFor="result-correct-answers"
                    >
                      Acertos (0 a {result.totalQuestions})
                    </label>
                    <input
                      aria-describedby={formError ? 'result-form-error' : undefined}
                      aria-invalid={Boolean(formError)}
                      className="field-control min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      id="result-correct-answers"
                      inputMode="numeric"
                      max={result.totalQuestions}
                      min={0}
                      onChange={(event) => {
                        setDraftCorrectAnswers(event.currentTarget.value);
                        setFormError(null);
                      }}
                      required
                      step={1}
                      type="number"
                      value={draftCorrectAnswers}
                    />
                  </div>
                )}
                {formError && (
                  <p className="text-body-small text-danger" id="result-form-error" role="alert">
                    {formError}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={
                      pending ||
                      draftStatus === 'pending' ||
                      (result.status === 'absent' && draftStatus === 'absent')
                    }
                    type="submit"
                    variant="primary"
                  >
                    {pending ? 'Salvando…' : 'Salvar'}
                  </Button>
                  <Button
                    disabled={pending}
                    onClick={() => {
                      setEditing(false);
                      setFormError(null);
                    }}
                    variant="secondary"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
