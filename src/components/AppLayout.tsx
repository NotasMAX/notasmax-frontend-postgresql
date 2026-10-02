import { NavLink, Outlet } from 'react-router';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white'
    : 'rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200';

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-slate-950">NotasMAX</span>
          <nav aria-label="Navegação principal" className="flex items-center gap-2">
            <NavLink end to="/" className={linkClass}>
              Início
            </NavLink>
            <NavLink to="/exemplo" className={linkClass}>
              Rota de exemplo
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Outlet />
      </main>
    </div>
  );
}
