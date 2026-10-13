// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

afterEach(() => cleanup());

describe('ConfirmDialog', () => {
  it('offers keyboard reachable cancel and confirm actions without submitting while pending', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        confirmLabel="Confirmar fechamento"
        onCancel={onCancel}
        onConfirm={onConfirm}
        pending
        pendingLabel="Fechando turma…"
        title="Encerrar turma?"
      >
        A turma será encerrada.
      </ConfirmDialog>,
    );

    expect(screen.getByRole('alertdialog', { name: 'Encerrar turma?' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Fechando turma…');
    await user.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('routes explicit cancel and confirm actions to their handlers', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        confirmLabel="Confirmar"
        onCancel={onCancel}
        onConfirm={onConfirm}
        title="Confirmar ação"
      >
        Consequência da ação.
      </ConfirmDialog>,
    );

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('returns focus to the invoking control after Escape dismisses the dialog', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    function ConfirmationHarness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Abrir confirmação
          </button>
          {open && (
            <ConfirmDialog
              confirmLabel="Confirmar"
              onCancel={() => setOpen(false)}
              onConfirm={onConfirm}
              title="Confirmar ação"
            >
              Consequência da ação.
            </ConfirmDialog>
          )}
        </>
      );
    }

    render(<ConfirmationHarness />);
    const opener = screen.getByRole('button', { name: 'Abrir confirmação' });

    await user.click(opener);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
