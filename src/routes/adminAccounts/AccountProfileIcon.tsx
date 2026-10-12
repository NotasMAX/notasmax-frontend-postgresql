import type { AccountProfile } from '../../api/adminAccounts';

interface AccountProfileIconProps {
  readonly profile: AccountProfile;
}

export function AccountProfileIcon({ profile }: AccountProfileIconProps) {
  return (
    <svg
      aria-hidden="true"
      className="size-7 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {profile === 'student' ? (
        <>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </>
      ) : profile === 'teacher' ? (
        <>
          <path d="M4 5.5h16v13H4z" />
          <path d="M8 9h8M8 12h5M8 15h3" />
          <path d="M3 20h18" />
        </>
      ) : (
        <>
          <path d="m12 3 7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
          <path d="m9 11 2 2 4-4" />
        </>
      )}
    </svg>
  );
}
