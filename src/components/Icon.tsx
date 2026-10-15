import type { ReactNode } from 'react';

export type IconName =
  | 'academic'
  | 'add'
  | 'arrowBack'
  | 'check'
  | 'close'
  | 'delete'
  | 'edit'
  | 'error'
  | 'expandMore'
  | 'home'
  | 'info'
  | 'logout'
  | 'menu'
  | 'people'
  | 'search'
  | 'simulations'
  | 'warning';

interface IconProps {
  readonly name: IconName;
  readonly size?: 16 | 20 | 24;
  readonly className?: string;
}

const paths: Readonly<Record<IconName, ReactNode>> = {
  academic: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
      <path d="M4 5h13M8 8h8M8 12h8" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
  arrowBack: <path d="m14 6-6 6 6 6M8 12h12" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  delete: (
    <>
      <path d="M4 7h16M10 11v6m4-6v6" />
      <path d="m6 7 1 14h10l1-14M9 7V4h6v3" />
    </>
  ),
  edit: (
    <>
      <path d="m4 16.5-.8 4.3 4.3-.8L19.7 7.8a2.5 2.5 0 0 0-3.5-3.5L4 16.5Z" />
      <path d="m14.5 6.5 3 3" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" />
    </>
  ),
  expandMore: <path d="m7 10 5 5 5-5" />,
  home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4m0-4h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 14a5.5 5.5 0 0 1 3.5 5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.2 4.2" />
    </>
  ),
  simulations: <path d="M4 5h16v14H4zM8 9h8M8 13h5M8 16h3" />,
  warning: (
    <>
      <path d="M10.3 3.9 1.8 18.2A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 4h.01" />
    </>
  ),
};

export function Icon({ name, size = 20, className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`shrink-0 ${className}`.trim()}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}
