import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import type { AccountProfile, StudentAccountDetail } from '../../api/adminAccounts';
import {
  accountIdentifier,
  createAccount,
  findAccountIdentifierByEmail,
  loadAccountDetail,
  updateAccount,
  type AccountCreateInput,
  type AccountDetail,
  type AccountPatchInput,
} from '../../accounts/accountService';
import { MAXIMUM_PASSWORD_LENGTH, MINIMUM_PASSWORD_LENGTH } from '../../auth/passwordPolicy';
import { ActionLink } from '../../components/ActionLink';
import { Button } from '../../components/Button';
import { Toast } from '../../components/Toast';
import { AccountPageShell } from './AccountPageShell';
import {
  type AccountFormErrors,
  type AccountFormField,
  accountCollectionPath,
  accountRegisterLabel,
  accountCreatedFeedback,
  accountErrorMessage,
  getAccountFormErrors,
} from './accountUi';

interface AccountFormPageProps {
  readonly profile: AccountProfile;
  readonly accountId?: string;
}

interface FormValues {
  readonly name: string;
  readonly email: string;
  readonly contactPhone: string;
  readonly guardianPhone: string;
}

function emptyValues(): FormValues {
  return { name: '', email: '', contactPhone: '', guardianPhone: '' };
}

function emptyErrors(): AccountFormErrors {
  return {
    messages: [],
    fields: {
      name: [],
      email: [],
      contactPhone: [],
      guardianPhone: [],
      currentPassword: [],
    },
  };
}

function valuesFromAccount(account: AccountDetail): FormValues {
  return {
    name: account.name,
    email: account.email,
    contactPhone: normalizedPhone(account.contactPhone ?? ''),
    guardianPhone: 'guardianPhone' in account ? normalizedPhone(account.guardianPhone) : '',
  };
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizedPhone(value: string): string {
  return value.replace(/\D/g, '');
}

function isStudentAccount(account: AccountDetail): account is StudentAccountDetail {
  return 'studentId' in account;
}

function visibleFields(profile: AccountProfile): readonly AccountFormField[] {
  return profile === 'student'
    ? ['name', 'email', 'contactPhone', 'guardianPhone', 'currentPassword']
    : ['name', 'email', 'contactPhone', 'currentPassword'];
}

interface TextFieldProps {
  readonly field: Exclude<AccountFormField, 'currentPassword'>;
  readonly label: string;
  readonly value: string;
  readonly type?: 'text' | 'email' | 'tel';
  readonly required?: boolean;
  readonly autoComplete?: string;
  readonly maxLength?: number;
  readonly inputMode?: 'numeric';
  readonly pattern?: string;
  readonly errors: AccountFormErrors;
  onChange(value: string): void;
}

function AccountTextField({
  field,
  label,
  value,
  type = 'text',
  required = false,
  autoComplete,
  maxLength,
  inputMode,
  pattern,
  errors,
  onChange,
}: TextFieldProps) {
  const messages = errors.fields[field];
  const errorIds = messages.map((_, index) => 'account-' + field + '-error-' + index);
  const inputId = 'account-' + field;
  return (
    <div className="space-y-2">
      <label className="text-label-large font-medium text-on-surface" htmlFor={inputId}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        aria-describedby={errorIds.length > 0 ? errorIds.join(' ') : undefined}
        aria-invalid={messages.length > 0 || undefined}
        className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        id={inputId}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          onChange(
            field === 'contactPhone' || field === 'guardianPhone'
              ? nextValue.replace(/\D/g, '')
              : nextValue,
          );
        }}
        pattern={pattern}
        required={required}
        type={type}
        value={value}
      />
      {messages.length > 0 && (
        <ul className="space-y-1 text-body-small text-danger">
          {messages.map((message, index) => (
            <li id={errorIds[index]} key={errorIds[index]}>
              {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AccountFormPage({ profile, accountId }: AccountFormPageProps) {
  const navigate = useNavigate();
  const editing = accountId !== undefined;
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<AccountFormErrors>(emptyErrors);
  const [saving, setSaving] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const dismissLocalToast = useCallback(() => setLocalMessage(null), []);
  const emailChanged =
    editing && account !== null && normalizedEmail(values.email) !== normalizedEmail(account.email);

  useEffect(() => {
    if (!editing || accountId === undefined) {
      return;
    }
    let active = true;
    void loadAccountDetail(profile, accountId)
      .then((detail) => {
        if (active) {
          setAccount(detail);
          setValues(valuesFromAccount(detail));
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(accountErrorMessage(error));
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
  }, [accountId, editing, profile]);

  function changeValue(field: keyof FormValues, value: string) {
    setValues({ ...values, [field]: value });
    setErrors(emptyErrors());
    setLocalMessage(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors(emptyErrors());
    setLocalMessage(null);
    const nextEmail = values.email.trim();
    const emailIsChanging =
      editing && account !== null && normalizedEmail(nextEmail) !== normalizedEmail(account.email);
    setSaving(true);
    try {
      if (!editing) {
        const input: AccountCreateInput =
          profile === 'student'
            ? {
                name: values.name.trim(),
                email: nextEmail,
                guardianPhone: values.guardianPhone.trim(),
                ...(values.contactPhone.trim() ? { contactPhone: values.contactPhone.trim() } : {}),
              }
            : {
                name: values.name.trim(),
                email: nextEmail,
                ...(values.contactPhone.trim() ? { contactPhone: values.contactPhone.trim() } : {}),
              };
        const activationEmailStatus = await createAccount(profile, input);
        let createdAccountId: string | null = null;
        try {
          createdAccountId = await findAccountIdentifierByEmail(profile, nextEmail);
        } catch {
          // The account was created successfully; list fallback below preserves access to it.
        }

        if (createdAccountId) {
          navigate(accountCollectionPath(profile) + '/' + encodeURIComponent(createdAccountId), {
            replace: true,
            state: {
              message: accountCreatedFeedback(activationEmailStatus),
              messageTone: activationEmailStatus === 'sent' ? 'success' : 'warning',
            },
          });
        } else {
          navigate(accountCollectionPath(profile), {
            replace: true,
            state: { search: nextEmail, activationEmailStatus },
          });
        }
        return;
      }

      if (!account || accountId === undefined) {
        return;
      }

      const changes: Record<string, string | null> = {};
      if (values.name.trim() !== account.name) {
        changes.name = values.name.trim();
      }
      if (emailIsChanging) {
        changes.email = nextEmail;
        changes.currentPassword = currentPassword;
      }
      const nextContactPhone = normalizedPhone(values.contactPhone) || null;
      if (nextContactPhone !== (normalizedPhone(account.contactPhone ?? '') || null)) {
        changes.contactPhone = nextContactPhone;
      }
      if (
        isStudentAccount(account) &&
        normalizedPhone(values.guardianPhone) !== normalizedPhone(account.guardianPhone)
      ) {
        changes.guardianPhone = normalizedPhone(values.guardianPhone);
      }
      if (Object.keys(changes).length === 0) {
        setLocalMessage('Nenhuma alteração foi feita.');
        return;
      }

      await updateAccount(profile, accountId as string, changes as AccountPatchInput);
      const detailPath =
        accountCollectionPath(profile) + '/' + encodeURIComponent(accountIdentifier(account));
      navigate(detailPath, {
        replace: true,
        state: {
          ...(emailIsChanging ? { emailChangeTo: nextEmail } : {}),
          message: 'Dados da conta atualizados.',
          messageTone: 'success',
        },
      });
    } catch (error) {
      const sensitiveValues = [nextEmail, currentPassword, account?.email ?? ''];
      const parsed = getAccountFormErrors(error, visibleFields(profile), sensitiveValues);
      setErrors({
        ...parsed,
        messages:
          parsed.messages.length > 0
            ? parsed.messages
            : [accountErrorMessage(error, sensitiveValues)],
      });
    } finally {
      setSaving(false);
      setCurrentPassword('');
    }
  }

  if (loading) {
    return (
      <AccountPageShell profile={profile} description="Carregando os dados da conta.">
        <p aria-live="polite" className="py-8 text-center text-body-large text-muted" role="status">
          Carregando conta…
        </p>
      </AccountPageShell>
    );
  }

  if (loadError) {
    return (
      <AccountPageShell
        profile={profile}
        description="Não foi possível carregar os dados da conta."
      >
        <div className="space-y-3 rounded-2xl border border-danger bg-error-surface p-5">
          <p aria-live="assertive" className="text-body-medium text-danger" role="alert">
            {loadError}
          </p>
          <Button
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              if (accountId) {
                void loadAccountDetail(profile, accountId)
                  .then((detail) => {
                    setAccount(detail);
                    setValues(valuesFromAccount(detail));
                  })
                  .catch((error: unknown) => setLoadError(accountErrorMessage(error)))
                  .finally(() => setLoading(false));
              }
            }}
            variant="secondary"
          >
            Tentar novamente
          </Button>
        </div>
      </AccountPageShell>
    );
  }

  if (editing && !account) {
    return null;
  }

  const title = editing
    ? profile === 'student'
      ? 'Editar conta do aluno'
      : 'Editar conta'
    : accountRegisterLabel(profile);
  const description = editing
    ? 'Atualize os dados cadastrais da conta.'
    : 'Informe os dados para cadastrar uma nova conta.';

  return (
    <AccountPageShell
      actions={
        editing && account ? (
          <ActionLink
            className="px-4"
            leadingIcon="arrowBack"
            to={
              accountCollectionPath(profile) + '/' + encodeURIComponent(accountIdentifier(account))
            }
          >
            Voltar à conta
          </ActionLink>
        ) : !editing ? (
          <ActionLink className="px-4" leadingIcon="arrowBack" to={accountCollectionPath(profile)}>
            Voltar à lista
          </ActionLink>
        ) : undefined
      }
      description={description}
      profile={profile}
      showRegisterAction={!editing}
    >
      <div className="max-w-3xl">
        <form
          aria-busy={saving}
          className="panel-surface space-y-5 rounded-2xl bg-surface p-5 sm:p-6"
          onSubmit={submit}
        >
          <h2 className="text-center text-title-large font-semibold text-on-surface">{title}</h2>
          {errors.messages.length > 0 && (
            <div
              aria-live="assertive"
              className="rounded-lg border border-danger bg-error-surface p-4 text-body-medium text-danger"
              role="alert"
            >
              {errors.messages.map((message, index) => (
                <p key={index}>{message}</p>
              ))}
            </div>
          )}
          {localMessage && (
            <Toast message={localMessage} onDismiss={dismissLocalToast} tone="info" />
          )}
          <AccountTextField
            autoComplete="name"
            errors={errors}
            field="name"
            label="Nome completo"
            maxLength={255}
            onChange={(value) => changeValue('name', value)}
            required
            value={values.name}
          />
          <AccountTextField
            autoComplete="email"
            errors={errors}
            field="email"
            label="E-mail institucional"
            maxLength={254}
            onChange={(value) => changeValue('email', value)}
            required
            type="email"
            value={values.email}
          />
          <AccountTextField
            autoComplete="tel"
            errors={errors}
            field="contactPhone"
            label="Telefone de contato (opcional)"
            onChange={(value) => changeValue('contactPhone', value)}
            inputMode="numeric"
            pattern="[0-9]*"
            type="tel"
            value={values.contactPhone}
          />
          {profile === 'student' && (
            <AccountTextField
              autoComplete="tel"
              errors={errors}
              field="guardianPhone"
              label="Telefone do responsável"
              onChange={(value) => changeValue('guardianPhone', value)}
              inputMode="numeric"
              pattern="[0-9]*"
              required
              type="tel"
              value={values.guardianPhone}
            />
          )}
          {emailChanged && (
            <div className="space-y-3">
              <p
                aria-live="polite"
                className="rounded-lg border border-outline bg-surface-container p-4 text-body-medium text-on-surface"
                role="status"
              >
                Ao alterar o e-mail, a conta precisará ser ativada no novo endereço. A resposta
                desta alteração não confirma a entrega; depois, você poderá solicitar o reenvio na
                página da conta.
              </p>
              <div className="space-y-2">
                <label
                  className="text-label-large font-medium text-on-surface"
                  htmlFor="account-currentPassword"
                >
                  Senha atual do administrador
                </label>
                <input
                  autoComplete="current-password"
                  aria-describedby={[
                    'account-currentPassword-help',
                    ...errors.fields.currentPassword.map(
                      (_, index) => 'account-currentPassword-error-' + index,
                    ),
                  ].join(' ')}
                  aria-invalid={errors.fields.currentPassword.length > 0 || undefined}
                  className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  id="account-currentPassword"
                  maxLength={MAXIMUM_PASSWORD_LENGTH}
                  minLength={MINIMUM_PASSWORD_LENGTH}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setCurrentPassword(event.currentTarget.value)
                  }
                  required
                  type="password"
                  value={currentPassword}
                />
                <p className="text-body-small text-muted" id="account-currentPassword-help">
                  Necessária somente quando o e-mail da conta é alterado.
                </p>
                {errors.fields.currentPassword.length > 0 && (
                  <ul className="space-y-1 text-body-small text-danger">
                    {errors.fields.currentPassword.map((message, index) => (
                      <li id={'account-currentPassword-error-' + index} key={index}>
                        {message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              disabled={saving}
              leadingIcon={editing ? 'check' : 'add'}
              type="submit"
              variant={editing ? 'success' : 'primary'}
              size="large"
            >
              {saving ? 'Salvando…' : editing ? 'Salvar alterações' : accountRegisterLabel(profile)}
            </Button>
            <ActionLink
              leadingIcon="close"
              size="large"
              to={
                editing && account
                  ? accountCollectionPath(profile) +
                    '/' +
                    encodeURIComponent(accountIdentifier(account))
                  : accountCollectionPath(profile)
              }
            >
              Cancelar
            </ActionLink>
          </div>
        </form>
      </div>
    </AccountPageShell>
  );
}
