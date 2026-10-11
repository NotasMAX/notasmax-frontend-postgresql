import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ApiRequestError,
  GENERIC_API_ERROR_MESSAGE,
  getApiProblemPresentation,
} from '../api/problemDetails';
import { getAuthFormErrors, hasAuthFormErrors, type AuthFormErrors } from '../auth/apiFormErrors';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { useAuth } from '../auth/AuthContext';
import {
  MAXIMUM_PASSWORD_LENGTH,
  MINIMUM_PASSWORD_LENGTH,
  validateNewPassword,
} from '../auth/passwordPolicy';
import type { SensitiveLinkFlow } from '../auth/sensitiveLink';

interface PasswordActionPageProps {
  readonly flow: SensitiveLinkFlow;
  readonly initialToken: string | null;
  onTokenCleared(): void;
}

const flowContent = {
  'password-reset': {
    title: 'Definir nova senha',
    description: 'Escolha uma nova senha para sua conta.',
    invalidCode: 'PASSWORD_RESET_TOKEN_INVALID',
    successMessage: 'Senha alterada. Entre novamente com sua nova senha.',
  },
  activation: {
    title: 'Ativar conta',
    description: 'Escolha uma senha para concluir a ativação da sua conta.',
    invalidCode: 'ACTIVATION_TOKEN_INVALID',
    successMessage: 'Conta ativada. Entre com seu e-mail e sua nova senha.',
  },
} as const;

function passwordValidationMessage(code: ReturnType<typeof validateNewPassword>): string | null {
  switch (code) {
    case 'password-too-short':
      return `A senha deve ter pelo menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`;
    case 'password-too-long':
      return `A senha deve ter no máximo ${MAXIMUM_PASSWORD_LENGTH} caracteres.`;
    case 'password-mismatch':
      return 'As senhas não coincidem.';
    default:
      return null;
  }
}

export function PasswordActionPage({
  flow,
  initialToken,
  onTokenCleared,
}: PasswordActionPageProps) {
  const content = flowContent[flow];
  const auth = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validationError, setValidationError] =
    useState<ReturnType<typeof validateNewPassword>>(null);
  const [apiErrors, setApiErrors] = useState<AuthFormErrors>({
    messages: [],
    fields: { email: [], password: [] },
  });
  const [pending, setPending] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const [invalidTokenMessage, setInvalidTokenMessage] = useState<string | null>(null);
  const validationErrorId = `${flow}-password-validation-error`;
  const validationMessage = passwordValidationMessage(validationError);
  const passwordInvalid =
    validationError === 'password-too-short' ||
    validationError === 'password-too-long' ||
    validationError === 'password-mismatch';
  const confirmationInvalid = validationError === 'password-mismatch';
  const passwordServerErrorIds = apiErrors.fields.password.map(
    (_, index) => `${flow}-password-server-error-${index}`,
  );
  const passwordDescriptionIds = [
    `${flow}-password-help`,
    ...(passwordInvalid ? [validationErrorId] : []),
    ...passwordServerErrorIds,
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setApiErrors({ messages: [], fields: { email: [], password: [] } });
    setInvalidTokenMessage(null);

    const passwordError = validateNewPassword(password, confirmation);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }

    if (!token) {
      setInvalidToken(true);
      return;
    }

    setPending(true);
    try {
      if (flow === 'password-reset') {
        await auth.completePasswordReset(token, password);
      } else {
        await auth.activateAccount(token, password);
      }

      setToken(null);
      onTokenCleared();
      setPassword('');
      setConfirmation('');
      navigate('/', { replace: true, state: { message: content.successMessage } });
    } catch (error) {
      if (error instanceof ApiRequestError && error.problem?.code === content.invalidCode) {
        const presentation = getApiProblemPresentation(error, [token, password, confirmation]);
        setInvalidTokenMessage(
          presentation.message ?? presentation.fieldErrors[0]?.detail ?? GENERIC_API_ERROR_MESSAGE,
        );
        setToken(null);
        onTokenCleared();
        setPassword('');
        setConfirmation('');
        setInvalidToken(true);
      } else {
        const errors = getAuthFormErrors(error, ['password'], [token, password, confirmation]);
        setApiErrors(
          hasAuthFormErrors(errors)
            ? errors
            : { messages: [GENERIC_API_ERROR_MESSAGE], fields: { email: [], password: [] } },
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPageLayout title={content.title} description={content.description}>
      {!token || invalidToken ? (
        <div className="space-y-5">
          <p
            aria-live="assertive"
            className="rounded-lg border border-danger bg-error-surface px-4 py-3 text-body-medium text-danger"
            role="alert"
          >
            {invalidTokenMessage ?? GENERIC_API_ERROR_MESSAGE}
          </p>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-label-large font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            to={flow === 'password-reset' ? '/recuperar-senha' : '/'}
          >
            {flow === 'password-reset' ? 'Solicitar outro link' : 'Voltar para entrar'}
          </Link>
        </div>
      ) : (
        <form aria-busy={pending} className="space-y-5" onSubmit={submit}>
          {validationMessage && (
            <p
              aria-live="assertive"
              className="rounded-lg border border-danger bg-error-surface px-4 py-3 text-body-medium text-danger"
              id={validationErrorId}
              role="alert"
            >
              {validationMessage}
            </p>
          )}
          {apiErrors.messages.length > 0 && (
            <p
              aria-live="assertive"
              className="rounded-lg border border-danger bg-error-surface px-4 py-3 text-body-medium text-danger"
              role="alert"
            >
              {apiErrors.messages.map((message, index) => (
                <span key={`${index}-${message}`}>
                  {index > 0 && <br />}
                  {message}
                </span>
              ))}
            </p>
          )}
          {apiErrors.fields.password.length > 0 && (
            <ul className="space-y-1 text-body-small text-danger">
              {apiErrors.fields.password.map((message, index) => (
                <li id={passwordServerErrorIds[index]} key={`${index}-${message}`}>
                  {message}
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-2">
            <label
              className="text-label-large font-medium text-on-surface"
              htmlFor={`${flow}-password`}
            >
              Nova senha
            </label>
            <p className="text-body-small text-muted" id={`${flow}-password-help`}>
              Use de {MINIMUM_PASSWORD_LENGTH} a {MAXIMUM_PASSWORD_LENGTH} caracteres. Espaços e
              caracteres especiais são aceitos.
            </p>
            <input
              autoComplete="new-password"
              className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              id={`${flow}-password`}
              maxLength={MAXIMUM_PASSWORD_LENGTH}
              minLength={MINIMUM_PASSWORD_LENGTH}
              name="password"
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              aria-describedby={passwordDescriptionIds.join(' ')}
              aria-invalid={passwordInvalid || apiErrors.fields.password.length > 0 || undefined}
              type="password"
              value={password}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-label-large font-medium text-on-surface"
              htmlFor={`${flow}-password-confirmation`}
            >
              Confirmar nova senha
            </label>
            <input
              autoComplete="new-password"
              className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              id={`${flow}-password-confirmation`}
              maxLength={MAXIMUM_PASSWORD_LENGTH}
              minLength={MINIMUM_PASSWORD_LENGTH}
              name="password-confirmation"
              onChange={(event) => setConfirmation(event.currentTarget.value)}
              required
              aria-describedby={confirmationInvalid ? validationErrorId : undefined}
              aria-invalid={confirmationInvalid || undefined}
              type="password"
              value={confirmation}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="min-h-11 content-center rounded-lg px-2 text-label-large font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => {
                setToken(null);
                onTokenCleared();
              }}
              to="/"
            >
              Cancelar
            </Link>
            <button
              className="min-h-12 rounded-lg bg-primary px-6 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
              disabled={pending}
              type="submit"
            >
              {pending ? 'Salvando…' : 'Confirmar senha'}
            </button>
          </div>
        </form>
      )}
    </AuthPageLayout>
  );
}
