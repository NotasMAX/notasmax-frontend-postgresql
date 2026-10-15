import { useEffect } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';
export type ToastPosition =
  'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface ToastProps {
  readonly message: string;
  readonly tone?: ToastTone;
  readonly position?: ToastPosition;
  /** Duration in milliseconds. Use 0 to keep the toast visible until dismissed. */
  readonly durationMs?: number;
  readonly onDismiss: () => void;
}

const positionClasses: Readonly<Record<ToastPosition, string>> = {
  'top-left': 'left-4 top-4 sm:left-6',
  'top-center': 'left-4 top-4 sm:left-1/2 sm:-translate-x-1/2',
  'top-right': 'right-4 top-[20%] sm:right-6',
  'bottom-left': 'left-4 bottom-4 sm:left-6',
  'bottom-center': 'left-4 bottom-4 sm:left-1/2 sm:-translate-x-1/2',
  'bottom-right': 'right-4 bottom-4 sm:right-6',
};

const toneClasses: Readonly<Record<ToastTone, string>> = {
  success: 'border-l-success bg-success-surface text-success',
  info: 'border-l-outline bg-surface text-on-surface',
  warning: 'border-l-warning bg-warning-surface text-warning',
  error: 'border-l-danger bg-error-surface text-danger',
};

const toneIcons: Readonly<Record<ToastTone, IconName>> = {
  success: 'check',
  info: 'info',
  warning: 'warning',
  error: 'error',
};

export function Toast({
  message,
  tone = 'info',
  position = 'top-right',
  durationMs = 5000,
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    if (durationMs <= 0) {
      return;
    }
    const timeout = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, message, onDismiss]);

  const isError = tone === 'error';

  return (
    <div
      aria-atomic="true"
      aria-live={isError ? 'assertive' : 'polite'}
      className={`fixed z-50 grid w-[calc(100%-2rem)] max-w-sm grid-cols-[1.25rem_minmax(0,1fr)_2.75rem] items-center gap-3 rounded-card border border-outline border-l-4 bg-surface p-4 text-body-medium shadow-panel ${positionClasses[position]} ${toneClasses[tone]}`}
      role={isError ? 'alert' : 'status'}
    >
      <Icon name={toneIcons[tone]} />
      <p className="text-center">{message}</p>
      <Button
        aria-label="Fechar notificação"
        className="justify-self-end"
        leadingIcon="close"
        onClick={onDismiss}
        size="icon"
        type="button"
        variant="text"
      ></Button>
    </div>
  );
}
