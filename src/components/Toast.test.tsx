// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toast } from './Toast';

afterEach(() => cleanup());

describe('Toast', () => {
  it('returns focus to the control that opened it when manually dismissed', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    function ToastHarness() {
      const [visible, setVisible] = useState(false);

      return (
        <>
          <button onClick={() => setVisible(true)} type="button">
            Salvar
          </button>
          {visible && (
            <Toast
              durationMs={0}
              message="Alterações salvas."
              onDismiss={() => {
                onDismiss();
                setVisible(false);
              }}
              tone="success"
            />
          )}
        </>
      );
    }

    render(<ToastHarness />);
    const saveButton = screen.getByRole('button', { name: 'Salvar' });
    await user.click(saveButton);
    await user.click(screen.getByRole('button', { name: 'Fechar notificação' }));

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(saveButton);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('uses the supplied fallback when the initiating control becomes disabled', async () => {
    const user = userEvent.setup();

    function ToastHarness() {
      const [visible, setVisible] = useState(false);
      const [sourceDisabled, setSourceDisabled] = useState(false);

      return (
        <form>
          <select aria-label="Matéria para adicionar" id="subject">
            <option value="">Selecione uma matéria</option>
            <option value="8">História</option>
          </select>
          <button
            disabled={sourceDisabled}
            onClick={() => {
              setVisible(true);
              setSourceDisabled(true);
            }}
            type="button"
          >
            Adicionar matéria
          </button>
          {visible && (
            <Toast
              durationMs={0}
              fallbackFocusTarget={() => document.getElementById('subject')}
              message="Matéria adicionada à turma."
              onDismiss={() => setVisible(false)}
              tone="success"
            />
          )}
        </form>
      );
    }

    render(<ToastHarness />);
    await user.click(screen.getByRole('button', { name: 'Adicionar matéria' }));
    expect(screen.getByRole('button', { name: 'Adicionar matéria' }).hasAttribute('disabled')).toBe(
      true,
    );

    await user.click(screen.getByRole('button', { name: 'Fechar notificação' }));

    expect(document.activeElement).toBe(
      screen.getByRole('combobox', { name: 'Matéria para adicionar' }),
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('uses the supplied fallback when the initiating control has been removed', async () => {
    const user = userEvent.setup();

    function ToastHarness() {
      const [visible, setVisible] = useState(false);

      return (
        <form>
          <select aria-label="Matéria para adicionar" id="subject">
            <option value="">Selecione uma matéria</option>
            <option value="8">História</option>
          </select>
          {!visible && (
            <button onClick={() => setVisible(true)} type="button">
              Adicionar matéria
            </button>
          )}
          {visible && (
            <Toast
              durationMs={0}
              fallbackFocusTarget={() => document.getElementById('subject')}
              message="Matéria adicionada à turma."
              onDismiss={() => setVisible(false)}
              tone="success"
            />
          )}
        </form>
      );
    }

    render(<ToastHarness />);
    await user.click(screen.getByRole('button', { name: 'Adicionar matéria' }));
    expect(screen.queryByRole('button', { name: 'Adicionar matéria' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Fechar notificação' }));

    expect(document.activeElement).toBe(
      screen.getByRole('combobox', { name: 'Matéria para adicionar' }),
    );
    expect(screen.queryByRole('status')).toBeNull();
  });
});
