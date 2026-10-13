import type { ReactNode } from 'react';

export function CenteredSubmitButton({
  children,
  disabled = false,
  icon,
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly icon: 'add' | 'search';
}) {
  return (
    <div className="flex justify-center">
      <button
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-body-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
        disabled={disabled}
        type="submit"
      >
        {icon === 'search' ? (
          <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
            <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="m16 16 4.2 4.2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        ) : (
          <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        )}
        {children}
      </button>
    </div>
  );
}
