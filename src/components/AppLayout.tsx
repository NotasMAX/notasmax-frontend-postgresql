import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';

export function AppLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    <div className="min-h-screen bg-surface-container">
      <header className="border-b border-outline bg-surface">
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
              className="min-h-11 rounded-lg border border-outline px-4 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
              disabled={pending}
              onClick={signOut}
              type="button"
            >
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
          <NavLink end to="/admin" className={linkClass}>
            Início
          </NavLink>
          <NavLink to="/admin/contas/alunos" className={linkClass}>
            Contas
          </NavLink>
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
