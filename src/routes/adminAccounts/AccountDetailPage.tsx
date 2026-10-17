import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import type {
  AccountProfile,
  ActivationEmailStatus,
  StudentEnrollmentHistoryItem,
} from '../../api/adminAccounts';
import {
  accountIdentifier,
  loadAccountDetail,
  resendActivation,
  type AccountDetail,
} from '../../accounts/accountService';
import { AccountPageShell } from './AccountPageShell';
import { Badge } from '../../components/Badge';
import { Icon } from '../../components/Icon';
import { Toast, type ToastTone } from '../../components/Toast';
import { EnrollmentCancellation } from '../adminAcademic/EnrollmentCancellation';
import {
  accountCollectionPath,
  accountErrorMessage,
  activationFeedback,
  activationStatusLabel,
  activationStatusTone,
  civilDateLabel,
} from './accountUi';

interface AccountDetailPageProps {
  readonly profile: AccountProfile;
  readonly accountId: string;
  readonly locationState?: unknown;
}

function readNotice(value: unknown): {
  emailChangeTo?: string;
  message?: string;
  messageTone?: ToastTone;
} {
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  const state = value as Record<string, unknown>;
  return {
    ...(typeof state.emailChangeTo === 'string' ? { emailChangeTo: state.emailChangeTo } : {}),
    ...(typeof state.message === 'string' ? { message: state.message } : {}),
    ...(state.messageTone === 'success' ||
    state.messageTone === 'info' ||
    state.messageTone === 'warning' ||
    state.messageTone === 'error'
      ? { messageTone: state.messageTone }
      : {}),
  };
}

function isStudentDetail(account: AccountDetail) {
  return 'studentId' in account;
}

function newestEnrollmentFirst(
  left: StudentEnrollmentHistoryItem,
  right: StudentEnrollmentHistoryItem,
): number {
  const leftId = BigInt(left.enrollmentId);
  const rightId = BigInt(right.enrollmentId);
  return leftId > rightId ? -1 : leftId < rightId ? 1 : 0;
}

function saoPauloCivilDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function AccountDetailPage({ profile, accountId, locationState }: AccountDetailPageProps) {
  const notice = readNotice(locationState);
  const currentCivilDate = saoPauloCivilDate();
  const [noticeMessage, setNoticeMessage] = useState(notice.message ?? null);
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activationStatus, setActivationStatus] = useState<ActivationEmailStatus | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const dismissActivationToast = useCallback(() => setActivationStatus(null), []);
  const dismissNoticeToast = useCallback(() => setNoticeMessage(null), []);

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
    setNoticeMessage(null);
    try {
      setActivationStatus(await resendActivation(accountIdentifier(account)));
    } catch (error) {
      setResendError(accountErrorMessage(error));
    } finally {
      setResending(false);
    }
  }

  return (
    <AccountPageShell
      profile={profile}
      description="Consulte os dados e a situação desta conta."
      actions={
        <>
          <Link
            className="account-button-secondary inline-flex min-h-11 items-center gap-2 rounded-lg border border-panel-outline bg-surface px-4 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            to={accountCollectionPath(profile)}
          >
            <Icon name="arrowBack" />
            Voltar à lista
          </Link>
          {account && (
            <Link
              className="account-button-primary inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              to={
                accountCollectionPath(profile) +
                '/' +
                encodeURIComponent(accountIdentifier(account)) +
                '/editar'
              }
            >
              <Icon name="edit" />
              Editar conta
            </Link>
          )}
          {account && isStudentDetail(account) && (
            <Link
              className="account-button-primary inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary"
              to="/admin/estrutura/matriculas/nova"
            >
              <Icon name="add" />
              Nova matrícula
            </Link>
          )}
        </>
      }
    >
      {noticeMessage && (
        <Toast
          message={noticeMessage}
          onDismiss={dismissNoticeToast}
          tone={notice.messageTone ?? 'success'}
        />
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
        <Toast
          message={activationFeedback(activationStatus)}
          onDismiss={dismissActivationToast}
          tone={activationStatus === 'sent' ? 'success' : 'error'}
        />
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
              <Badge tone={activationStatusTone(account.activationStatus)}>
                {activationStatusLabel(account.activationStatus)}
              </Badge>
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
                  <div className="sm:col-span-2">
                    <p className="text-body-medium text-muted">
                      A situação atual e as ações de cancelamento aparecem no histórico abaixo.
                    </p>
                  </div>
                </>
              )}
            </dl>
            {account.activationStatus === 'pending' && (
              <div className="border-t border-outline pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-w-0 flex-1 text-body-medium text-muted">
                    <span className="block sm:inline">Esta conta ainda precisa ser ativada.</span>{' '}
                    <span className="block sm:inline">Você pode reenviar o link.</span>
                  </p>
                  <button
                    className="account-button-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-success px-4 text-label-large font-semibold text-on-primary hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success disabled:cursor-wait disabled:opacity-70 sm:self-auto"
                    disabled={resending}
                    onClick={() => void resend()}
                    type="button"
                  >
                    <Icon name="refresh" />
                    {resending ? 'Solicitando…' : 'Reenviar ativação'}
                  </button>
                </div>
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
                  {[...account.enrollments].sort(newestEnrollmentFirst).map((enrollment) => {
                    const cancelledBeforeStart =
                      enrollment.cancellationDate === null &&
                      enrollment.cancellationRequestedAt !== null;
                    const finalizationDate =
                      enrollment.cancellationDate ??
                      (cancelledBeforeStart && enrollment.cancellationRequestedAt !== null
                        ? saoPauloCivilDate(new Date(enrollment.cancellationRequestedAt))
                        : null);
                    const cancelled =
                      enrollment.cancellationRequestedAt !== null &&
                      (enrollment.cancellationDate === null ||
                        enrollment.cancellationDate <= currentCivilDate);
                    const open =
                      enrollment.cancellationDate === null &&
                      enrollment.cancellationRequestedAt === null;
                    const active =
                      open &&
                      account.enrollmentStatus === 'active' &&
                      account.currentClass?.series === enrollment.class.series &&
                      account.currentClass.schoolYear === enrollment.class.schoolYear;

                    return (
                      <li key={enrollment.enrollmentId}>
                        <article
                          aria-labelledby={'enrollment-history-' + enrollment.enrollmentId}
                          className="panel-surface grid gap-4 rounded-2xl bg-surface p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-start"
                        >
                          <div className="min-w-0 space-y-3">
                            <h3
                              className="text-title-medium font-semibold text-on-surface"
                              id={'enrollment-history-' + enrollment.enrollmentId}
                            >
                              {enrollment.class.series}ª série · {enrollment.class.schoolYear}
                            </h3>
                            <dl className="grid gap-3 text-body-medium sm:grid-cols-2">
                              <div>
                                <dt className="font-semibold">Início</dt>
                                <dd>{civilDateLabel(enrollment.startDate)}</dd>
                              </div>
                              {finalizationDate !== null && (
                                <div>
                                  <dt className="font-semibold">Data de finalização</dt>
                                  <dd>{civilDateLabel(finalizationDate)}</dd>
                                </div>
                              )}
                            </dl>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
                            {active && <Badge tone="positive">Matrícula ativa</Badge>}
                            {cancelledBeforeStart && (
                              <Badge tone="neutral">Cancelada antes do início</Badge>
                            )}
                            {cancelled && !cancelledBeforeStart && (
                              <Badge tone="neutral">Matrícula cancelada</Badge>
                            )}
                            {open && (
                              <EnrollmentCancellation
                                enrollmentId={enrollment.enrollmentId}
                                onCompleted={() => void refresh()}
                              />
                            )}
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </>
      ) : null}
    </AccountPageShell>
  );
}
