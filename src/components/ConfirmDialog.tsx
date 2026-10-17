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

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(', ');

function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  const elements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
  return elements.filter((element) => {
    if (element.tabIndex < 0 || element.matches(':disabled')) return false;
    if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;

    let ancestor: HTMLElement | null = element;
    while (ancestor && dialog.contains(ancestor)) {
      const style = window.getComputedStyle(ancestor);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse'
      ) {
        return false;
      }
      ancestor = ancestor.parentElement;
    }

    return true;
  });
}

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

    function focusFirstAvailableElement() {
      const dialog = dialogRef.current;
      if (!dialog) return;
      (getFocusableElements(dialog)[0] ?? dialog).focus();
    }

    const dialog = dialogRef.current;
    const focusedElement = document.activeElement;
    if (
      !dialog ||
      !(focusedElement instanceof HTMLElement) ||
      !getFocusableElements(dialog).includes(focusedElement)
    ) {
      focusFirstAvailableElement();
    }

    function containFocus(event: FocusEvent) {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) {
        focusFirstAvailableElement();
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
        const currentDialog = dialogRef.current;
        if (!currentDialog) return;
        const focusableElements = getFocusableElements(currentDialog);
        if (focusableElements.length === 0) {
          event.preventDefault();
          currentDialog.focus();
          return;
        }

        const activeIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
        if (activeIndex === -1) {
          event.preventDefault();
          const target = event.shiftKey
            ? focusableElements[focusableElements.length - 1]
            : focusableElements[0];
          target?.focus();
        } else if (event.shiftKey && activeIndex === 0) {
          event.preventDefault();
          focusableElements[focusableElements.length - 1]?.focus();
        } else if (!event.shiftKey && activeIndex === focusableElements.length - 1) {
          event.preventDefault();
          focusableElements[0]?.focus();
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
        tabIndex={-1}
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
          <Button disabled={pending} onClick={onCancel} variant="secondary" type="button">
            Cancelar
          </Button>
          <Button
            disabled={pending || confirmDisabled}
            leadingIcon={confirmTone === 'danger' ? 'warning' : undefined}
            onClick={onConfirm}
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
