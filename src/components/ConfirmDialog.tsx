import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly pending?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" ref={overlayRef}>
      <section
        aria-describedby="simulation-confirm-description"
        aria-labelledby="simulation-confirm-title"
        aria-modal="true"
        className="panel-surface w-full max-w-lg space-y-5 rounded-2xl bg-surface p-6 shadow-panel"
        ref={dialogRef}
        role="alertdialog"
      >
        <div className="space-y-2">
          <h2
            className="text-title-large font-semibold text-on-surface"
            id="simulation-confirm-title"
          >
            {title}
          </h2>
          <p className="text-body-medium leading-6 text-muted" id="simulation-confirm-description">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            className="account-button-secondary min-h-11 rounded-lg border border-panel-outline px-4 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
            disabled={pending}
            onClick={onCancel}
            ref={cancelRef}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="account-button-primary min-h-11 rounded-lg bg-primary px-4 text-label-large font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
            disabled={pending}
            onClick={onConfirm}
            ref={confirmRef}
            type="button"
          >
            {pending ? 'Enviando…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
