import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';

interface ConfirmDialogCommonProps {
  readonly title: string;
  readonly confirmLabel: string;
  readonly pendingLabel?: string;
  readonly pending?: boolean;
  readonly errorMessage?: string | null;
  readonly confirmDisabled?: boolean;
  readonly confirmTone?: 'primary' | 'danger';
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

type ConfirmDialogContentProps =
  | { readonly description: string; readonly children?: ReactNode }
  | { readonly description?: undefined; readonly children: ReactNode };

export type ConfirmDialogProps = ConfirmDialogCommonProps & ConfirmDialogContentProps;

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pendingLabel = 'Enviando…',
  pending = false,
  errorMessage,
  confirmDisabled = false,
  confirmTone = 'primary',
  onCancel,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const contentId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  const pendingRef = useRef(pending);

  useEffect(() => {
    onCancelRef.current = onCancel;
    pendingRef.current = pending;
  }, [onCancel, pending]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const inertedElements = Array.from(document.body.children)
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element !== overlayRef.current,
      )
      .map((element) => ({ element, wasInert: element.inert }));
    for (const { element } of inertedElements) element.inert = true;
    cancelRef.current?.focus();

    function containFocus(event: FocusEvent) {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) {
        cancelRef.current?.focus();
      }
    }

    function blockBackgroundClick(event: MouseEvent) {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pendingRef.current) {
        event.preventDefault();
        onCancelRef.current();
      } else if (event.key === 'Tab') {
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (!first || !last) return;
        if (!dialogRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('focusin', containFocus);
    document.addEventListener('click', blockBackgroundClick, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('focusin', containFocus);
      document.removeEventListener('click', blockBackgroundClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      for (const { element, wasInert } of inertedElements) element.inert = wasInert;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4"
      ref={overlayRef}
    >
      <section
        aria-describedby={description ? descriptionId : children ? contentId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        aria-busy={pending}
        className="panel-surface dialog-surface max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto bg-surface p-6"
        ref={dialogRef}
        role="alertdialog"
      >
        <div className="space-y-2">
          <h2 className="text-title-large font-semibold text-on-surface" id={titleId}>
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
        </div>
        {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            disabled={pending}
            onClick={onCancel}
            ref={cancelRef}
            variant="secondary"
            type="button"
          >
            Cancelar
          </Button>
          <Button
            disabled={pending || confirmDisabled}
            leadingIcon={confirmTone === 'danger' ? 'warning' : undefined}
            onClick={onConfirm}
            ref={confirmRef}
            variant={confirmTone}
            type="button"
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
        {pending && (
          <p aria-live="polite" className="text-body-small text-muted" role="status">
            {pendingLabel}
          </p>
        )}
      </section>
    </div>,
    document.body,
  );
}
