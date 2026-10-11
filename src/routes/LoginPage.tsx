import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { GENERIC_API_ERROR_MESSAGE, type AuthProblemField } from '../api/problemDetails';
import { getAuthFormErrors, hasAuthFormErrors, type AuthFormErrors } from '../auth/apiFormErrors';
import { AuthPageLayout } from '../components/AuthPageLayout';

const emptyFormErrors: AuthFormErrors = { messages: [], fields: { email: [], password: [] } };

function fieldErrorIds(field: AuthProblemField, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `login-${field}-error-${index}`);
}

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { message?: unknown; sessionExpired?: unknown } | null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiErrors, setApiErrors] = useState<AuthFormErrors>(emptyFormErrors);
  const [notice, setNotice] = useState(() => {
    if (typeof routeState?.message === 'string') {
      return routeState.message;
    }
    return routeState?.sessionExpired === true ? 'Sua sessão expirou. Entre novamente.' : null;
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (location.state !== null) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (auth.state.status === 'authenticated') {
      navigate('/admin', { replace: true });
    }
  }, [auth.state.status, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setApiErrors(emptyFormErrors);
    setNotice(null);

    try {
      const accepted = await auth.login(email.trim(), password);
      setPassword('');
      if (accepted) {
        navigate('/admin', { replace: true });
      } else {
        setApiErrors({
          messages: ['Esta conta não tem acesso à área administrativa.'],
          fields: { email: [], password: [] },
        });
      }
    } catch (error) {
      setPassword('');
      const errors = getAuthFormErrors(error, ['email', 'password'], [email.trim(), password]);
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
      title="Entrar"
      description="Acesse sua conta administrativa."
      visuallyHideHeader
    >
      <form aria-busy={pending} className="space-y-5" onSubmit={submit}>
        {notice && (
          <p
            aria-live="polite"
            className="rounded-lg border border-primary bg-surface-container px-4 py-3 text-body-medium text-on-surface"
            role="status"
          >
            {notice}
          </p>
        )}
        {auth.state.status === 'forbidden' && apiErrors.messages.length === 0 && (
          <p className="rounded-lg border border-primary bg-surface-container px-4 py-3 text-body-medium text-on-surface">
            Esta conta não tem acesso à área administrativa.
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

        <div className="space-y-2">
          <label className="text-label-large font-medium text-on-surface" htmlFor="login-email">
            E-mail institucional
          </label>
          <input
            autoComplete="username"
            autoFocus
            className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            id="login-email"
            name="email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            aria-describedby={
              apiErrors.fields.email.length > 0
                ? fieldErrorIds('email', apiErrors.fields.email.length).join(' ')
                : undefined
            }
            aria-invalid={apiErrors.fields.email.length > 0 || undefined}
            type="email"
            value={email}
          />
          {apiErrors.fields.email.length > 0 && (
            <ul className="space-y-1 text-body-small text-danger">
              {apiErrors.fields.email.map((message, index) => (
                <li id={`login-email-error-${index}`} key={`${index}-${message}`}>
                  {message}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-label-large font-medium text-on-surface" htmlFor="login-password">
            Senha
          </label>
          <input
            autoComplete="current-password"
            className="min-h-12 w-full rounded-lg border border-outline bg-surface px-3 text-body-large text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            id="login-password"
            name="password"
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            aria-describedby={
              apiErrors.fields.password.length > 0
                ? fieldErrorIds('password', apiErrors.fields.password.length).join(' ')
                : undefined
            }
            aria-invalid={apiErrors.fields.password.length > 0 || undefined}
            type="password"
            value={password}
          />
          {apiErrors.fields.password.length > 0 && (
            <ul className="space-y-1 text-body-small text-danger">
              {apiErrors.fields.password.map((message, index) => (
                <li id={`login-password-error-${index}`} key={`${index}-${message}`}>
                  {message}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="auth-login-actions flex flex-col items-stretch gap-3 pt-1">
          <Link
            className="min-h-11 self-end content-center rounded-lg px-2 text-label-large font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            to="/recuperar-senha"
          >
            Esqueci minha senha
          </Link>
          <button
            className="min-h-12 w-full max-w-56 self-center rounded-lg bg-primary px-6 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
            disabled={pending}
            type="submit"
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </AuthPageLayout>
  );
}
