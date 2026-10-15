import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type BadgeTone = 'neutral' | 'positive' | 'warning' | 'danger';

interface BadgeProps {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
}

const toneClasses: Readonly<Record<BadgeTone, string>> = {
  neutral: 'bg-surface-container text-on-surface',
  positive: 'bg-success text-on-primary',
  warning: 'bg-warning-surface text-warning',
  danger: 'bg-error-surface text-danger',
};

const toneIcons: Partial<Readonly<Record<BadgeTone, IconName>>> = {
  positive: 'check',
  warning: 'warning',
  danger: 'error',
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-label-medium font-medium ${toneClasses[tone]}`}
    >
      {toneIcons[tone] && <Icon name={toneIcons[tone]} size={16} />}
      {children}
    </span>
  );
}
