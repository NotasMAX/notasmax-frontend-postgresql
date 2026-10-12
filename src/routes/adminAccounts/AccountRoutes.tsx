import { useLocation, useParams } from 'react-router';
import type { AccountProfile } from '../../api/adminAccounts';
import { NotFoundPage } from '../NotFoundPage';
import { AccountDetailPage } from './AccountDetailPage';
import { AccountFormPage } from './AccountFormPage';
import { AccountListPage } from './AccountListPage';
import { accountProfileFromPath } from './accountUi';

export function AdminAccountListRoute() {
  const { profile: profilePath } = useParams();
  const location = useLocation();
  const profile: AccountProfile | undefined = accountProfileFromPath(profilePath);
  return profile ? (
    <AccountListPage key={profile} locationState={location.state} profile={profile} />
  ) : (
    <NotFoundPage />
  );
}

export function AdminAccountDetailRoute() {
  const { profile: profilePath, accountId } = useParams();
  const location = useLocation();
  const profile = accountProfileFromPath(profilePath);
  return profile && accountId ? (
    <AccountDetailPage
      key={profile + ':' + accountId}
      accountId={accountId}
      locationState={location.state}
      profile={profile}
    />
  ) : (
    <NotFoundPage />
  );
}

export function AdminAccountFormRoute() {
  const { profile: profilePath, accountId } = useParams();
  const profile = accountProfileFromPath(profilePath);
  return profile ? (
    <AccountFormPage
      accountId={accountId}
      key={profile + ':' + (accountId ?? 'new')}
      profile={profile}
    />
  ) : (
    <NotFoundPage />
  );
}
