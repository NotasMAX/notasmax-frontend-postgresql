import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AccountProfile, ActivationEmailStatus } from '../../api/adminAccounts';
import {
  accountIdentifier,
  loadAccountDetail,
  resendActivation,
  type AccountDetail,
} from '../../accounts/accountService';
import { AccountPageShell } from './AccountPageShell';
import {
  accountCollectionPath,
  accountErrorMessage,
  activationFeedback,
  activationStatusLabel,
  classLabel,
  civilDateLabel,
  enrollmentStatusLabel,
} from './accountUi';

interface AccountDetailPageProps {
  readonly profile: AccountProfile;
  readonly accountId: string;
  readonly locationState?: unknown;
}

function readNotice(value: unknown): { emailChangeTo?: string; message?: string } {
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  const state = value as Record<string, unknown>;
  return {
    ...(typeof state.emailChangeTo === 'string' ? { emailChangeTo: state.emailChangeTo } : {}),
    ...(typeof state.message === 'string' ? { message: state.message } : {}),
  };
}

function isStudentDetail(account: AccountDetail) {
  return 'studentId' in account;
}

export function AccountDetailPage({ profile, accountId, locationState }: AccountDetailPageProps) {
  const notice = readNotice(locationState);
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activationStatus, setActivationStatus] = useState<ActivationEmailStatus | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function refresh() {
    setLoading(true);
    setErrorMessage(null);
    try {
      setAccount(await loadAccountDetail(profile, accountId));
    } catch (error) {
      setErrorMessage(accountErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void loadAccountDetail(profile, accountId)
      .then((detail) => {
        if (active) {
          setAccount(detail);
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
  }, [accountId, profile]);

  async function resend() {
    if (!account) {
      return;
    }
    setResending(true);
    setResendError(null);
    setActivationStatus(null);
    try {
      setActivationStatus(await resendActivation(accountIdentifier(account)));
    } catch (error) {
      setResendError(accountErrorMessage(error, [account.email]));
    } finally {
      setResending(false);
    }
  }

  return (
    <AccountPageShell
      profile={profile}
      description="Consulte os dados cadastrais e os estados retornados pela API."
    >
      <div className="flex flex-wrap gap-3">
        <Link
          className="account-button-secondary inline-flex min-h-11 items-center rounded-lg border border-panel-outline bg-surface px-4 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          to={accountCollectionPath(profile)}
        >
          Voltar à lista
        </Link>
        {account && (
          <Link
            className="account-button-primary inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            to={
              accountCollectionPath(profile) +
              '/' +
              encodeURIComponent(accountIdentifier(account)) +
              '/editar'
            }
          >
            Editar conta
          </Link>
        )}
      </div>
      {notice.message && (
        <p
          aria-live="polite"
          className="rounded-lg border border-outline bg-surface p-4 text-body-medium text-on-surface"
          role="status"
        >
          {notice.message}
        </p>
      )}
      {notice.emailChangeTo && (
        <p
          aria-live="polite"
          className="rounded-lg border border-outline bg-surface p-4 text-body-medium text-on-surface"
          role="status"
        >
          A conta precisará ser ativada no novo endereço {notice.emailChangeTo}. A alteração não
          confirma a entrega do e-mail. Se precisar de outro link, use Reenviar ativação.
        </p>
      )}
      {activationStatus && (
        <p
          aria-live="polite"
          className="rounded-lg border border-outline bg-surface p-4 text-body-medium text-on-surface"
          role="status"
        >
          {activationFeedback(activationStatus)}
        </p>
      )}
      {resendError && (
        <p
          aria-live="assertive"
          className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
          role="alert"
        >
          {resendError}
        </p>
      )}
      {loading ? (
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando conta…
        </p>
      ) : errorMessage ? (
        <div className="space-y-3 rounded-2xl border border-danger bg-error-surface p-5">
          <p aria-live="assertive" className="text-body-medium text-danger" role="alert">
            {errorMessage}
          </p>
          <button
            className="account-button-secondary min-h-11 rounded-lg border border-panel-outline bg-surface px-4 text-label-large font-medium text-primary"
            onClick={() => void refresh()}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      ) : account ? (
        <>
          <section
            aria-labelledby="account-detail-heading"
            className="panel-surface space-y-5 rounded-2xl bg-surface p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2
                  className="text-title-large font-semibold text-on-surface"
                  id="account-detail-heading"
                >
                  {account.name}
                </h2>
                <p className="break-all text-body-medium text-muted">{account.email}</p>
              </div>
              <span className="rounded-full border border-outline px-3 py-1 text-label-medium font-medium text-on-surface">
                {activationStatusLabel(account.activationStatus)}
              </span>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-label-medium font-semibold text-muted">Telefone de contato</dt>
                <dd className="break-all text-body-large text-on-surface">
                  {account.contactPhone ?? 'Não informado'}
                </dd>
              </div>
              {isStudentDetail(account) && (
                <div>
                  <dt className="text-label-medium font-semibold text-muted">
                    Telefone do responsável
                  </dt>
                  <dd className="break-all text-body-large text-on-surface">
                    {account.guardianPhone}
                  </dd>
                </div>
              )}
              {isStudentDetail(account) && (
                <>
                  <div>
                    <dt className="text-label-medium font-semibold text-muted">
                      Situação da matrícula
                    </dt>
                    <dd className="text-body-large text-on-surface">
                      {enrollmentStatusLabel(account.enrollmentStatus)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-label-medium font-semibold text-muted">
                      Turma associada à matrícula ativa
                    </dt>
                    <dd className="text-body-large text-on-surface">
                      {account.currentClass ? classLabel(account.currentClass) : 'Nenhuma'}
                    </dd>
                  </div>
                </>
              )}
            </dl>
            {account.activationStatus === 'pending' && (
              <div className="space-y-2 border-t border-outline pt-4">
                <p className="text-body-medium text-muted">
                  A conta está pendente de ativação. O reenvio informa a aceitação do pedido pelo
                  serviço, não a entrega na caixa postal.
                </p>
                <button
                  className="account-button-secondary min-h-11 rounded-lg border border-panel-outline px-4 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
                  disabled={resending}
                  onClick={() => void resend()}
                  type="button"
                >
                  {resending ? 'Solicitando…' : 'Reenviar ativação'}
                </button>
              </div>
            )}
          </section>
          {isStudentDetail(account) && (
            <section
              aria-labelledby="enrollment-history-heading"
              className="panel-surface space-y-4 rounded-2xl bg-surface p-5 sm:p-6"
            >
              <h2
                className="text-title-large font-semibold text-on-surface"
                id="enrollment-history-heading"
              >
                Histórico de matrículas
              </h2>
              {account.enrollments.length === 0 ? (
                <p className="text-body-medium text-muted">Nenhuma matrícula registrada.</p>
              ) : (
                <ul className="space-y-3">
                  {account.enrollments.map((enrollment) => (
                    <li
                      className="rounded-xl border border-outline p-4"
                      key={enrollment.enrollmentId}
                    >
                      <h3 className="text-title-small font-semibold text-on-surface">
                        {classLabel(enrollment.class)}
                      </h3>
                      <dl className="mt-2 grid gap-2 text-body-medium sm:grid-cols-2">
                        <div>
                          <dt className="font-semibold">Início</dt>
                          <dd>{civilDateLabel(enrollment.startDate)}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold">Cancelamento</dt>
                          <dd>
                            {enrollment.cancellationDate
                              ? civilDateLabel(enrollment.cancellationDate)
                              : 'Não informado'}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      ) : null}
    </AccountPageShell>
  );
}
