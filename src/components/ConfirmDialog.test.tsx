// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

afterEach(() => cleanup());

function DialogFixture({ onBackgroundActivate }: { onBackgroundActivate: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Abrir confirmação
      </button>
      <button onClick={onBackgroundActivate} type="button">
        Ação de fundo
      </button>
      {open && (
        <ConfirmDialog
          confirmLabel="Confirmar"
          description="Confirme a ação."
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          title="Confirmação"
        />
      )}
    </>
  );
}

describe('ConfirmDialog', () => {
  it('contains focus and blocks background interaction while making the background inert', async () => {
    const user = userEvent.setup();
    const onBackgroundActivate = vi.fn();
    const { container } = render(<DialogFixture onBackgroundActivate={onBackgroundActivate} />);
    const opener = screen.getByRole('button', { name: 'Abrir confirmação' });
    const backgroundAction = screen.getByRole('button', { name: 'Ação de fundo' });
    await user.click(opener);

    const dialog = screen.getByRole('alertdialog', { name: 'Confirmação' });
    const cancel = within(dialog).getByRole('button', { name: 'Cancelar' });
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar' });
    expect(document.activeElement).toBe(cancel);
    expect(container.inert).toBe(true);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirm);
    await user.tab();
    expect(document.activeElement).toBe(cancel);

    backgroundAction.focus();
    expect(document.activeElement).toBe(cancel);
    await user.click(backgroundAction);
    expect(onBackgroundActivate).not.toHaveBeenCalled();
  });

  it('returns focus to the opener after cancellation or Escape', async () => {
    const user = userEvent.setup();
    const { container } = render(<DialogFixture onBackgroundActivate={vi.fn()} />);
    const opener = screen.getByRole('button', { name: 'Abrir confirmação' });

    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(container.inert).toBeFalsy();

    await user.click(opener);
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('supports rich child content, API errors, and disabling confirmation', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        confirmDisabled
        confirmLabel="Confirmar fechamento"
        errorMessage="Não foi possível concluir o fechamento."
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        title="Encerrar turma?"
      >
        <p>A turma será encerrada.</p>
        <label>
          Data
          <input aria-label="Data" />
        </label>
      </ConfirmDialog>,
    );

    expect(screen.getByText('A turma será encerrada.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Data' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      'Não foi possível concluir o fechamento.',
    );
    const confirm = screen.getByRole('button', { name: 'Confirmar fechamento' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps actions disabled and prevents Escape dismissal while pending', async () => {
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
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole('button', { name: 'Fechando turma…' }) as HTMLButtonElement).disabled,
    ).toBe(true);
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
});
