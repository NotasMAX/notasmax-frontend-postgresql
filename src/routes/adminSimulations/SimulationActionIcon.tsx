interface SimulationActionIconProps {
  readonly name: 'plus' | 'arrow-right';
}

export function SimulationActionIcon({ name }: SimulationActionIconProps) {
  return (
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
      {name === 'plus' ? <path d="M12 5v14M5 12h14" /> : <path d="M5 12h14m-6-6 6 6-6 6" />}
    </svg>
  );
}
