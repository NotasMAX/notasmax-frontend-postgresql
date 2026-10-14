import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { getAuthFormErrors, hasAuthFormErrors, type AuthFormErrors } from '../auth/apiFormErrors';
import { GENERIC_API_ERROR_MESSAGE } from '../api/problemDetails';
import { AuthPageLayout } from '../components/AuthPageLayout';

const genericConfirmation =
  'Se houver uma conta ativa associada a este e-mail, enviaremos um link para redefinir sua senha.';
const emptyFormErrors: AuthFormErrors = { messages: [], fields: { email: [], password: [] } };

export function PasswordResetRequestPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<AuthFormErrors>(emptyFormErrors);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setApiErrors(emptyFormErrors);

    try {
      await auth.requestPasswordReset(email.trim());
      setMessage(genericConfirmation);
    } catch (error) {
      const errors = getAuthFormErrors(error, ['email']);
      setApiErrors(
        hasAuthFormErrors(errors)
          ? errors
          : { ...emptyFormErrors, messages: [GENERIC_API_ERROR_MESSAGE] },
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPageLayout
      title="Recuperar senha"
      description="Informe o e-mail institucional associado à sua conta."
    >
      <form aria-busy={pending} className="space-y-5" onSubmit={submit}>
        {message && (
          <p
            aria-live="polite"
            className="rounded-lg border border-primary bg-surface-container px-4 py-3 text-body-medium text-on-surface"
            role="status"
          >
            {message}
          </p>
        )}
        {apiErrors.messages.length > 0 && (
          <p
            aria-live="assertive"
            className="rounded-lg border border-danger bg-error-surface px-4 py-3 text-body-medium text-danger"
            role="alert"
          >
            {apiErrors.messages.map((errorMessage, index) => (
              <span key={`${index}-${errorMessage}`}>
                {index > 0 && <br />}
                {errorMessage}
              </span>
            ))}
          </p>
        )}
        <div className="space-y-2">
          <label
            className="text-label-large font-medium text-on-surface"
            htmlFor="reset-request-email"
          >
            E-mail institucional
          </label>
          <input
            autoComplete="email"
            className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            id="reset-request-email"
            name="email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            aria-describedby={
              apiErrors.fields.email.length > 0
                ? apiErrors.fields.email
                    .map((_, index) => `reset-request-email-error-${index}`)
                    .join(' ')
                : undefined
            }
            aria-invalid={apiErrors.fields.email.length > 0 || undefined}
            type="email"
            value={email}
          />
          {apiErrors.fields.email.length > 0 && (
            <ul className="space-y-1 text-body-small text-danger">
              {apiErrors.fields.email.map((errorMessage, index) => (
                <li id={`reset-request-email-error-${index}`} key={`${index}-${errorMessage}`}>
                  {errorMessage}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="min-h-11 content-center rounded-lg px-2 text-label-large font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            to="/"
          >
            Voltar para entrar
          </Link>
          <button
            className="min-h-12 rounded-lg bg-primary px-6 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
            disabled={pending}
            type="submit"
          >
            {pending ? 'Enviando…' : 'Solicitar link'}
          </button>
        </div>
      </form>
    </AuthPageLayout>
  );
}
