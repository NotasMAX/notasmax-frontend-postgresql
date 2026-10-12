import { useEffect } from 'react';

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

const iconPaths: Readonly<Record<ToastTone, string>> = {
  success: 'M5 12l4 4L19 6',
  info: 'M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  warning:
    'M12 9v4m0 4h.01M10.3 3.9 1.8 18.2A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z',
  error: 'M15 9l-6 6m0-6 6 6m5-3a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
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
      className={`fixed z-50 grid w-[calc(100%-2rem)] max-w-sm grid-cols-[1.25rem_1fr_1.25rem] items-center gap-3 rounded-xl border border-outline border-l-4 p-4 text-body-medium shadow-panel ${positionClasses[position]} ${toneClasses[tone]}`}
      role={isError ? 'alert' : 'status'}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d={iconPaths[tone]} />
      </svg>
      <p className="text-center">{message}</p>
      <button
        aria-label="Fechar notificação"
        className="justify-self-end rounded-md px-1 text-title-medium text-muted hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={onDismiss}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
