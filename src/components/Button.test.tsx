// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

afterEach(() => cleanup());

describe('Button', () => {
  it('uses the shared primary appearance and keeps its icon decorative', () => {
    render(
      <Button leadingIcon="search" type="submit">
        Buscar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Buscar' });
    expect(button.getAttribute('type')).toBe('submit');
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('rounded-control');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('supports secondary, danger and text variants without adding elevation', () => {
    const { rerender } = render(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole('button', { name: 'Cancelar' }).className).toContain('border-outline');
    expect(screen.getByRole('button', { name: 'Cancelar' }).className).not.toContain('shadow-');

    rerender(<Button variant="danger">Remover</Button>);
    expect(screen.getByRole('button', { name: 'Remover' }).className).toContain('bg-danger');

    rerender(<Button variant="text">Voltar</Button>);
    expect(screen.getByRole('button', { name: 'Voltar' }).className).toContain('bg-transparent');
  });

  it('preserves native disabled and click behavior', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
