// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
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
  it('contains keyboard and programmatic focus and makes the background inert', async () => {
    const user = userEvent.setup();
    const onBackgroundActivate = vi.fn();
    const { container } = render(<DialogFixture onBackgroundActivate={onBackgroundActivate} />);
    const opener = screen.getByRole('button', { name: 'Abrir confirmação' });
    const backgroundAction = screen.getByRole('button', { name: 'Ação de fundo' });
    await user.click(opener);

    const dialog = screen.getByRole('alertdialog');
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

  it('restores focus to the invoking control after cancellation', async () => {
    const user = userEvent.setup();
    const { container } = render(<DialogFixture onBackgroundActivate={vi.fn()} />);
    const opener = screen.getByRole('button', { name: 'Abrir confirmação' });
    await user.click(opener);
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Cancelar',
      }),
    );

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(container.inert).toBeFalsy();
  });
});
