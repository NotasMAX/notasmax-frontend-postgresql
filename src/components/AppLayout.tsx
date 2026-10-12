import { useState } from 'react';
import { Link, NavLink, Outlet, useMatch, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';

export function AppLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const accountsMatch = useMatch('/admin/contas/*');

  if (auth.state.status !== 'authenticated') {
    return null;
  }

  async function signOut() {
    setPending(true);
    setErrorMessage(null);
    try {
      const result = await auth.logout();
      if (result === 'ended') {
        navigate('/', { replace: true });
      }
    } catch {
      setErrorMessage('Não foi possível encerrar a sessão agora. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'rounded-lg bg-primary px-3 py-2 text-label-large font-medium text-on-primary'
      : 'rounded-lg px-3 py-2 text-label-large font-medium text-on-surface hover:bg-surface-container';
  const firstName = auth.state.user.displayName.trim().split(/\s+/)[0];

  return (
    <div className="app-platform min-h-screen bg-surface-container">
      <header className="border-b border-panel-outline bg-surface shadow-panel">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-6">
          <Link
            aria-label="NotasMAX, início da área administrativa"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            to="/admin"
          >
            <img
              alt=""
              className="h-11 w-11 rounded-lg object-contain"
              height="44"
              src="/notasmax-logo.png"
              width="44"
            />
            <span className="text-title-medium font-semibold text-on-surface">NotasMAX</span>
          </Link>
          <div className="flex items-center gap-3">
            <p className="max-w-48 truncate text-body-medium text-on-surface sm:max-w-none">
              {firstName ? `Bem-vindo(a), ${firstName}!` : 'Bem-vindo(a)!'}
            </p>
            <button
              className="account-button-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-panel-outline bg-surface px-4 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
              disabled={pending}
              onClick={signOut}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="size-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M10 17l5-5-5-5M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
              {pending ? 'Saindo…' : 'Sair'}
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6 lg:py-8">
        <nav
          aria-label="Navegação administrativa"
          className="panel-surface flex gap-2 rounded-2xl bg-surface p-3 lg:flex-col"
        >
          <NavLink
            end
            to="/admin"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 ${linkClass({ isActive })}`
            }
          >
            <svg
              aria-hidden="true"
              className="size-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" />
            </svg>
            Início
          </NavLink>
          <Link
            aria-current={accountsMatch ? 'page' : undefined}
            className={`inline-flex items-center gap-2 ${linkClass({ isActive: Boolean(accountsMatch) })}`}
            to="/admin/contas/alunos"
          >
            <svg
              aria-hidden="true"
              className="size-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <circle cx="9" cy="8" r="3" />
              <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 14a5.5 5.5 0 0 1 3.5 5" />
            </svg>
            Contas
          </Link>
        </nav>
        <main className="min-w-0">
          {errorMessage && (
            <p
              aria-live="assertive"
              className="mb-6 rounded-lg border border-danger bg-error-surface px-4 py-3 text-body-medium text-danger"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
