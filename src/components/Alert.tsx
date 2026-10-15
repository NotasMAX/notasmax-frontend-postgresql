import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type AlertTone = 'success' | 'info' | 'warning' | 'danger';

interface AlertProps {
  readonly children: ReactNode;
  readonly tone?: AlertTone;
  readonly className?: string;
}

const toneClasses: Readonly<Record<AlertTone, string>> = {
  success: 'border-success bg-success-surface text-success',
  info: 'border-outline bg-surface text-on-surface',
  warning: 'border-warning bg-warning-surface text-warning',
  danger: 'border-danger bg-error-surface text-danger',
};

const toneIcons: Readonly<Record<AlertTone, IconName>> = {
  success: 'check',
  info: 'info',
  warning: 'warning',
  danger: 'error',
};

export function Alert({ children, tone = 'info', className = '' }: AlertProps) {
  const urgent = tone === 'danger';

  return (
    <p
      aria-live={urgent ? 'assertive' : 'polite'}
      className={`flex items-start gap-3 rounded-control border px-4 py-3 text-body-medium ${toneClasses[tone]} ${className}`.trim()}
      role={urgent ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5" name={toneIcons[tone]} />
      <span>{children}</span>
    </p>
  );
}
