import { NavLink } from 'react-router';

const sections = [
  {
    label: 'Turmas',
    to: '/admin/estrutura/turmas',
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    label: 'Matérias',
    to: '/admin/estrutura/materias',
    icon: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
        <path d="M4 5h13M8 8h8M8 12h8" />
      </>
    ),
  },
  {
    label: 'Matrículas',
    to: '/admin/estrutura/matriculas/nova',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6" />
      </>
    ),
  },
] as const;

export function AcademicSectionNavigation() {
  return (
    <nav
      aria-label="Seções da estrutura acadêmica"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {sections.map(({ label, to, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `panel-surface flex min-h-20 items-center justify-center gap-3 rounded-2xl px-4 py-4 text-center text-label-large font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isActive
                ? 'border-primary bg-primary text-on-primary'
                : 'bg-surface text-primary hover:bg-surface-container'
            }`
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
            {icon}
          </svg>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
