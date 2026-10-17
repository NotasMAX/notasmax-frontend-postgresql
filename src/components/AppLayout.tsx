import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useMatch, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Alert } from './Alert';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

function navigationItemClass(isActive: boolean, inDrawer = false): string {
  const stateClass = isActive
    ? 'bg-primary text-on-primary'
    : 'text-on-surface hover:bg-surface-container';
  const layoutClass = inDrawer
    ? 'w-full justify-start'
    : 'min-w-[8rem] flex-1 justify-center lg:flex-none lg:justify-start';
  return `inline-flex min-h-11 items-center gap-2 rounded-control px-3 py-2 text-label-large font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${layoutClass} ${stateClass}`;
}

function focusDesktopNavigationLink(navigation: HTMLElement | null) {
  if (!navigation) return;

  const links = Array.from(navigation.querySelectorAll<HTMLAnchorElement>('a[href]'));
  const visibleLinks = links.filter(
    (link) =>
      link.getClientRects().length > 0 &&
      getComputedStyle(link).visibility === 'visible' &&
      !link.closest('[hidden], [aria-hidden="true"]'),
  );
  const activeLink = visibleLinks.find((link) => link.getAttribute('aria-current') === 'page');
  const hasActiveLink = links.some((link) => link.getAttribute('aria-current') === 'page');
  const target = activeLink ?? (!hasActiveLink ? visibleLinks[0] : undefined);

  target?.focus();
}

export function AppLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const desktopNavigationRef = useRef<HTMLElement>(null);
  const navigationDrawerRef = useRef<HTMLDialogElement>(null);
  const drawerCloseButtonRef = useRef<HTMLButtonElement>(null);
  const drawerWasOpen = useRef(false);
  const focusDesktopNavigationAfterClose = useRef(false);
  const adminHomeMatch = useMatch({ path: '/admin', end: true });
  const accountsMatch = useMatch('/admin/contas/*');
  const simulationsHomeMatch = useMatch('/admin/simulados');
  const simulationsClassMatch = useMatch('/admin/turmas/*');
  const simulationsMatch = simulationsHomeMatch ?? simulationsClassMatch;
  const academicStructureMatch = useMatch('/admin/estrutura/*');

  useEffect(() => {
    const drawer = navigationDrawerRef.current;
    if (!drawer) return;

    if (navigationOpen) {
      if (!drawer.open) drawer.showModal();
      drawerWasOpen.current = true;
      drawerCloseButtonRef.current?.focus();
      return;
    }

    if (drawer.open) drawer.close();
  }, [navigationOpen]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const desktopLayout = window.matchMedia('(min-width: 64rem)');
    const closeDrawerOnDesktop = () => {
      if (desktopLayout.matches && drawerWasOpen.current) {
        focusDesktopNavigationAfterClose.current = true;
        setNavigationOpen(false);
      }
    };
    desktopLayout.addEventListener('change', closeDrawerOnDesktop);
    return () => desktopLayout.removeEventListener('change', closeDrawerOnDesktop);
  }, []);

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

  const firstName = auth.state.user.displayName.trim().split(/\s+/)[0];
  const navigationItems: ReadonlyArray<{
    readonly label: string;
    readonly to: string;
    readonly icon: IconName;
    readonly active: boolean;
  }> = [
    { label: 'Início', to: '/admin', icon: 'home', active: Boolean(adminHomeMatch) },
    {
      label: 'Contas',
      to: '/admin/contas/alunos',
      icon: 'people',
      active: Boolean(accountsMatch),
    },
    {
      label: 'Estrutura acadêmica',
      to: '/admin/estrutura/materias',
      icon: 'academic',
      active: Boolean(academicStructureMatch),
    },
    {
      label: 'Simulados',
      to: '/admin/simulados',
      icon: 'simulations',
      active: Boolean(simulationsMatch),
    },
  ];

  return (
    <div className="app-platform min-h-screen bg-surface-container">
      <header className="border-b border-panel-outline bg-surface shadow-panel">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              aria-controls="compact-admin-navigation"
              aria-expanded={navigationOpen}
              aria-label="Abrir navegação administrativa"
              className="lg:hidden"
              leadingIcon="menu"
              onClick={() => setNavigationOpen(true)}
              ref={navigationButtonRef}
              size="icon"
              variant="secondary"
            />
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
          </div>
          <div className="flex items-center gap-3">
            <p className="max-w-48 truncate text-body-medium text-on-surface sm:max-w-none">
              {firstName ? `Bem-vindo(a), ${firstName}!` : 'Bem-vindo(a)!'}
            </p>
            <Button
              disabled={pending}
              leadingIcon="logout"
              onClick={signOut}
              type="button"
              variant="secondary"
            >
              {pending ? 'Saindo…' : 'Sair'}
            </Button>
          </div>
        </div>
      </header>
      <dialog
        aria-labelledby="compact-admin-navigation-title"
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-on-surface backdrop:bg-black/40 lg:hidden"
        id="compact-admin-navigation"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;

          const focusableElements = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter(
            (element) =>
              !element.hasAttribute('hidden') &&
              element.getAttribute('aria-hidden') !== 'true' &&
              !element.hasAttribute('disabled'),
          );
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          if (!firstElement || !lastElement) return;

          const focusIsOutsideDrawer = !event.currentTarget.contains(document.activeElement);
          if (event.shiftKey && (document.activeElement === firstElement || focusIsOutsideDrawer)) {
            event.preventDefault();
            lastElement.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === lastElement || focusIsOutsideDrawer)
          ) {
            event.preventDefault();
            firstElement.focus();
          }
        }}
        onCancel={() => setNavigationOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setNavigationOpen(false);
        }}
        onClose={(event) => {
          const drawer = event.currentTarget;
          if (drawer.open) return;

          setNavigationOpen(false);
          if (!drawerWasOpen.current) return;

          drawerWasOpen.current = false;
          if (focusDesktopNavigationAfterClose.current) {
            focusDesktopNavigationAfterClose.current = false;
            focusDesktopNavigationLink(desktopNavigationRef.current);
          } else {
            navigationButtonRef.current?.focus();
          }
        }}
        ref={navigationDrawerRef}
      >
        <div className="min-h-full w-72 max-w-[calc(100vw-3rem)] bg-surface p-4 shadow-menu">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2
              className="text-title-medium font-semibold text-on-surface"
              id="compact-admin-navigation-title"
            >
              Navegação administrativa
            </h2>
            <Button
              aria-label="Fechar navegação administrativa"
              leadingIcon="close"
              onClick={() => setNavigationOpen(false)}
              ref={drawerCloseButtonRef}
              size="icon"
              variant="secondary"
            />
          </div>
          <nav aria-label="Navegação administrativa" className="flex flex-col gap-2">
            {navigationItems.map(({ active, icon, label, to }) => (
              <Link
                aria-current={active ? 'page' : undefined}
                className={navigationItemClass(active, true)}
                key={to}
                onClick={() => setNavigationOpen(false)}
                to={to}
              >
                <Icon name={icon} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </dialog>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6 lg:py-8">
        <nav
          aria-label="Navegação administrativa"
          className="panel-surface hidden min-h-[36rem] items-stretch gap-2 bg-surface p-3 lg:flex lg:flex-col"
          ref={desktopNavigationRef}
        >
          {navigationItems.map(({ active, icon, label, to }) => (
            <Link
              aria-current={active ? 'page' : undefined}
              className={navigationItemClass(active)}
              key={to}
              to={to}
            >
              <Icon name={icon} />
              {label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0">
          {errorMessage && (
            <Alert className="mb-6" tone="danger">
              {errorMessage}
            </Alert>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
