import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface ConfirmDialogProps {
  readonly title: string;
  readonly confirmLabel: string;
  readonly description?: string;
  readonly pendingLabel?: string;
  readonly pending?: boolean;
  readonly errorMessage?: string | null;
  readonly confirmDisabled?: boolean;
  readonly confirmTone?: 'primary' | 'danger';
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly children?: ReactNode;
}

export function ConfirmDialog({
  title,
  confirmLabel,
  description,
  pendingLabel = 'Processando…',
  pending = false,
  errorMessage,
  confirmDisabled = false,
  confirmTone = 'primary',
  onCancel,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusTargetRef = useRef<HTMLElement | null>(
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement),
  );
  const titleId = useId();
  const descriptionId = useId();
  const contentId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const returnFocusTarget = returnFocusTargetRef.current;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      if (returnFocusTarget?.isConnected) returnFocusTarget.focus();
    };
  }, []);

  return (
    <dialog
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : children ? contentId : undefined}
      aria-modal="true"
      className="fixed inset-0 m-auto max-h-[90vh] w-[min(42rem,calc(100%-2rem))] overflow-auto rounded-2xl border border-panel-outline bg-surface p-0 text-on-surface shadow-2xl backdrop:bg-black/50"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !pending) onCancel();
      }}
      ref={dialogRef}
      role="alertdialog"
    >
      <div aria-busy={pending} className="space-y-5 p-6">
        <h2 className="text-title-large font-semibold" id={titleId}>
          {title}
        </h2>
        {description && (
          <p className="text-body-medium leading-6 text-muted" id={descriptionId}>
            {description}
          </p>
        )}
        {children && (
          <div className="space-y-3 text-body-medium" id={contentId}>
            {children}
          </div>
        )}
        {errorMessage && (
          <p
            aria-live="assertive"
            className="rounded-lg border border-danger bg-error-surface p-3 text-danger"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            autoFocus
            className="min-h-11 rounded-lg border border-panel-outline px-4 text-label-large font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className={`min-h-11 rounded-lg px-4 text-label-large font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70 ${
              confirmTone === 'danger'
                ? 'bg-danger focus-visible:outline-danger'
                : 'bg-primary focus-visible:outline-primary'
            }`}
            disabled={pending || confirmDisabled}
            onClick={onConfirm}
            type="button"
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
        {pending && (
          <p aria-live="polite" className="text-body-small text-muted" role="status">
            {pendingLabel}
          </p>
        )}
      </div>
    </dialog>
  );
}
