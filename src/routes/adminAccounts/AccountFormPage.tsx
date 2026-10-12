import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { AccountProfile, StudentAccountDetail } from '../../api/adminAccounts';
import {
  accountIdentifier,
  createAccount,
  loadAccountDetail,
  updateAccount,
  type AccountCreateInput,
  type AccountDetail,
  type AccountPatchInput,
} from '../../accounts/accountService';
import { MAXIMUM_PASSWORD_LENGTH, MINIMUM_PASSWORD_LENGTH } from '../../auth/passwordPolicy';
import { AccountPageShell } from './AccountPageShell';
import {
  type AccountFormErrors,
  type AccountFormField,
  accountCollectionPath,
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
    contactPhone: account.contactPhone ?? '',
    guardianPhone: 'guardianPhone' in account ? account.guardianPhone : '',
  };
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
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
        maxLength={maxLength}
        onChange={(event) => onChange(event.currentTarget.value)}
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
    const sensitiveValues = [
      values.name,
      values.email,
      values.contactPhone,
      values.guardianPhone,
      currentPassword,
    ];

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
        navigate(accountCollectionPath(profile), {
          replace: true,
          state: { search: nextEmail, activationEmailStatus },
        });
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
      const nextContactPhone = values.contactPhone.trim() || null;
      if (nextContactPhone !== (account.contactPhone ?? null)) {
        changes.contactPhone = nextContactPhone;
      }
      if (isStudentAccount(account) && values.guardianPhone.trim() !== account.guardianPhone) {
        changes.guardianPhone = values.guardianPhone.trim();
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
        state: emailIsChanging
          ? { emailChangeTo: nextEmail }
          : { message: 'Dados da conta atualizados.' },
      });
    } catch (error) {
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
          <button
            className="account-button-secondary min-h-11 rounded-lg border border-panel-outline bg-surface px-4 text-label-large font-medium text-primary"
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
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      </AccountPageShell>
    );
  }

  if (editing && !account) {
    return null;
  }

  const title = editing ? 'Editar conta' : 'Cadastrar conta';
  const description = editing
    ? 'Atualize os dados cadastrais da conta.'
    : 'Informe os dados para cadastrar uma nova conta.';

  return (
    <AccountPageShell profile={profile} description={description}>
      <div className="max-w-3xl">
        <form
          aria-busy={saving}
          className="panel-surface space-y-5 rounded-2xl bg-surface p-5 sm:p-6"
          onSubmit={submit}
        >
          <h2 className="text-title-large font-semibold text-on-surface">{title}</h2>
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
            <p aria-live="polite" className="text-body-medium text-muted" role="status">
              {localMessage}
            </p>
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
            className="account-button-primary min-h-12 rounded-lg bg-primary px-6 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar conta'}
            </button>
            <Link
              className="account-button-secondary inline-flex min-h-12 items-center justify-center rounded-lg border border-panel-outline px-6 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              to={
                editing && account
                  ? accountCollectionPath(profile) +
                    '/' +
                    encodeURIComponent(accountIdentifier(account))
                  : accountCollectionPath(profile)
              }
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </AccountPageShell>
  );
}
