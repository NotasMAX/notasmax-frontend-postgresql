import { useState } from 'react';
import type { AccountProfile } from '../../api/adminAccounts';
import { AccountProfileIcon } from './AccountProfileIcon';

interface AccountAvatarProps {
  readonly profile: AccountProfile;
  readonly source: string | null;
  readonly alt: string;
}

export function AccountAvatar({ profile, source, alt }: AccountAvatarProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showPhoto = source !== null && source !== failedSource;
  return (
    <span className="inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline bg-surface-container text-primary">
      {showPhoto ? (
        <img
          alt={alt}
          className="size-full object-cover"
          onError={() => setFailedSource(source)}
          src={source}
        />
      ) : (
        <AccountProfileIcon profile={profile} />
      )}
    </span>
  );
}
