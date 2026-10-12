import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import type { AccountProfile } from '../../api/adminAccounts';
import {
  ACCOUNT_PROFILE_LABELS,
  ACCOUNT_PROFILE_PATHS,
  accountCollectionPath,
  accountTitle,
} from './accountUi';

interface AccountPageShellProps {
  readonly profile: AccountProfile;
  readonly description: string;
  readonly children: ReactNode;
}

export function AccountPageShell({ profile, description, children }: AccountPageShellProps) {
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
      <nav aria-label="Perfis de contas" className="flex flex-wrap gap-2">
        {(Object.keys(ACCOUNT_PROFILE_PATHS) as AccountProfile[]).map((item) => (
          <NavLink
            key={item}
            to={accountCollectionPath(item)}
            className={({ isActive }) =>
              isActive
                ? 'rounded-lg bg-primary px-4 py-2 text-label-large font-medium text-on-primary'
                : 'rounded-lg border border-outline bg-surface px-4 py-2 text-label-large font-medium text-primary hover:bg-surface-container'
            }
          >
            {ACCOUNT_PROFILE_LABELS[item]}
          </NavLink>
        ))}
        <Link
          className="ml-auto inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          to={accountCollectionPath(profile) + '/novo'}
        >
          Cadastrar conta
        </Link>
      </nav>
      {children}
    </section>
  );
}
