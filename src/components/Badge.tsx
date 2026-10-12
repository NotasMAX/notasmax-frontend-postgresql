import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'positive' | 'warning' | 'danger';

interface BadgeProps {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
}

const toneClasses: Readonly<Record<BadgeTone, string>> = {
  neutral: 'bg-surface-container text-on-surface',
  positive: 'bg-success text-on-primary',
  warning: 'bg-warning-strong text-on-primary',
  danger: 'bg-error-surface text-danger',
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center justify-center rounded-full px-3 py-1 text-label-medium font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
