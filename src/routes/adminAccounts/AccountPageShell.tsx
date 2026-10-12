import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import type { AccountProfile } from '../../api/adminAccounts';
import {
  ACCOUNT_PROFILE_LABELS,
  ACCOUNT_PROFILE_PATHS,
  accountCollectionPath,
  accountTitle,
} from './accountUi';
import { AccountProfileIcon } from './AccountProfileIcon';

interface AccountPageShellProps {
  readonly profile: AccountProfile;
  readonly description: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly showRegisterAction?: boolean;
}

export function AccountPageShell({
  profile,
  description,
  children,
  actions,
  showRegisterAction = true,
}: AccountPageShellProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-label-large font-semibold uppercase tracking-wide text-primary">
          Gestão de contas
        </p>
        <h1 className="text-headline-medium font-semibold text-on-surface">
          {accountTitle(profile)}
        </h1>
        <p className="max-w-3xl text-body-large leading-6 text-muted">{description}</p>
      </header>
      <div className="space-y-3">
        <nav
          aria-label="Perfis de contas"
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {(Object.keys(ACCOUNT_PROFILE_PATHS) as AccountProfile[]).map((item) => (
            <NavLink
              key={item}
              to={accountCollectionPath(item)}
              className={({ isActive }) =>
                `panel-surface flex min-h-20 items-center justify-center gap-3 rounded-2xl px-4 py-4 text-center text-label-large font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isActive
                    ? 'border-primary bg-primary text-on-primary'
                    : 'bg-surface text-primary hover:bg-surface-container'
                }`
              }
            >
              <AccountProfileIcon profile={item} />
              <span>{ACCOUNT_PROFILE_LABELS[item]}</span>
            </NavLink>
          ))}
        </nav>
        {(showRegisterAction || actions) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
            {showRegisterAction && (
              <Link
                className="account-button-primary inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                to={accountCollectionPath(profile) + '/novo'}
              >
                Cadastrar conta
              </Link>
            )}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
