// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { loadAdminClasses } from '../../api/adminAcademicCatalog';
import { getSimulation, listOfferedSubjects } from '../../api/adminSimulations';
import { ApiRequestError } from '../../api/problemDetails';
import {
  getSimulationResult,
  listSimulationResults,
  updateSimulationResult,
  type SimulationResult,
  type SimulationResultPage,
} from '../../api/adminSimulationResults';
import type { AdminClassOption } from '../../api/adminAcademicCatalog';
import type { Simulation } from '../../api/adminSimulations';
import { SimulationResultDetailPage } from './SimulationResultDetailPage';
import { SimulationResultsPage } from './SimulationResultsPage';

vi.mock('../../api/adminAcademicCatalog', () => ({ loadAdminClasses: vi.fn() }));
vi.mock('../../api/adminSimulations', () => ({
  getSimulation: vi.fn(),
  listOfferedSubjects: vi.fn(),
}));
vi.mock('../../api/adminSimulationResults', () => ({
  getSimulationResult: vi.fn(),
  listSimulationResults: vi.fn(),
  updateSimulationResult: vi.fn(),
}));

const schoolClass: AdminClassOption = {
  classId: '44',
  series: 9,
  schoolYear: 2026,
  isClosed: false,
};
const simulation: Simulation = {
  simulationId: '12',
  classId: '44',
  number: 3,
  type: 'objetivo',
  bimester: 2,
  scheduledDate: '2026-10-13',
  realizedAt: '2026-10-14T12:00:00.000Z',
  subjects: [{ subjectId: '7', totalQuestions: 10, weightPercent: 25 }],
};
const pendingResult: SimulationResult = {
  simulationId: '12',
  studentId: '51',
  studentName: 'Ana Silva',
  subjectId: '7',
  subjectName: 'Matemática',
  status: 'pending',
  correctAnswers: null,
  totalQuestions: 10,
  weightPercent: 25,
  score: null,
  weightedContribution: null,
};
const assessedResult: SimulationResult = {
  ...pendingResult,
  status: 'assessed',
  correctAnswers: 0,
  score: 0,
  weightedContribution: 0,
};
const resultPage = (
  items: readonly SimulationResult[] = [pendingResult],
  page = 1,
  totalPages = 1,
): SimulationResultPage => ({
  items,
  pagination: { page, pageSize: 20, totalItems: items.length, totalPages },
});

function renderRoutes(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/admin/turmas/:classId/simulados/:simulationId/resultados"
          element={<SimulationResultsPage />}
        />
        <Route
          path="/admin/turmas/:classId/simulados/:simulationId/resultados/:studentId/:subjectId"
          element={<SimulationResultDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loadAdminClasses).mockResolvedValue([schoolClass]);
  vi.mocked(listOfferedSubjects).mockResolvedValue([
    { subjectId: '7', name: 'Matemática', description: null },
  ]);
  vi.mocked(getSimulation).mockResolvedValue({ simulation, etag: '"simulation-etag"' });
  vi.mocked(listSimulationResults).mockResolvedValue(resultPage());
  vi.mocked(getSimulationResult).mockResolvedValue({
    result: pendingResult,
    etag: '"result-etag-1"',
  });
  vi.mocked(updateSimulationResult).mockResolvedValue({
    result: assessedResult,
    etag: '"result-etag-2"',
  });
});

afterEach(() => cleanup());

describe('NM-34 result screens', () => {
  it('searches, filters, pages, and links to an individual result', async () => {
    const user = userEvent.setup();
    vi.mocked(listSimulationResults)
      .mockResolvedValueOnce(resultPage([pendingResult], 1, 2))
      .mockResolvedValueOnce(resultPage([assessedResult], 2, 2));
    renderRoutes('/admin/turmas/44/simulados/12/resultados');

    expect(
      await screen.findByRole('heading', { name: 'Resultados do simulado nº 3' }),
    ).not.toBeNull();
    const pagination = screen.getByRole('navigation', { name: 'Paginação de resultados' });
    expect(pagination.querySelector('[aria-live="polite"]')?.textContent).toContain(
      '1 resultado(s) · página 1 de 2',
    );
    expect(screen.getByRole('link', { name: 'Ver resultado' }).getAttribute('href')).toBe(
      '/admin/turmas/44/simulados/12/resultados/51/7',
    );
    await user.type(screen.getByLabelText('Buscar aluno por nome ou número'), 'Ana');
    await user.selectOptions(screen.getByLabelText('Matéria'), '7');
    await user.selectOptions(screen.getByLabelText('Situação'), 'pending');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() =>
      expect(listSimulationResults).toHaveBeenLastCalledWith('44', '12', {
        page: 1,
        pageSize: 20,
        search: 'Ana',
        subjectId: '7',
        status: 'pending',
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() =>
      expect(listSimulationResults).toHaveBeenLastCalledWith('44', '12', {
        page: 2,
        pageSize: 20,
        search: 'Ana',
        subjectId: '7',
        status: 'pending',
      }),
    );
  });

  it('records zero as a valid assessed score and returns to read-only view after saving', async () => {
    const user = userEvent.setup();
    renderRoutes('/admin/turmas/44/simulados/12/resultados/51/7');

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    await user.selectOptions(screen.getByLabelText('Nova situação'), 'assessed');
    await user.type(screen.getByLabelText(/Acertos/), '0');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(updateSimulationResult).toHaveBeenCalledWith(
        '44',
        '12',
        '51',
        '7',
        { status: 'assessed', correctAnswers: 0 },
        '"result-etag-1"',
      ),
    );
    expect(await screen.findByText('Resultado salvo.')).not.toBeNull();
    expect(screen.queryByLabelText('Nova situação')).toBeNull();
    expect(screen.getByRole('button', { name: 'Editar' })).not.toBeNull();
  });

  it('records absence only through an explicit choice and sends no score', async () => {
    const user = userEvent.setup();
    renderRoutes('/admin/turmas/44/simulados/12/resultados/51/7');

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    await user.selectOptions(screen.getByLabelText('Nova situação'), 'absent');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(updateSimulationResult).toHaveBeenCalledWith(
        '44',
        '12',
        '51',
        '7',
        { status: 'absent' },
        '"result-etag-1"',
      ),
    );
  });

  it('does not submit an unchanged absent result', async () => {
    const user = userEvent.setup();
    vi.mocked(getSimulationResult).mockResolvedValue({
      result: { ...pendingResult, status: 'absent' },
      etag: '"result-etag-1"',
    });
    renderRoutes('/admin/turmas/44/simulados/12/resultados/51/7');

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    expect(
      await screen.findByText(
        'O resultado já está registrado como ausente. Selecione Avaliado para lançar uma nota.',
      ),
    ).not.toBeNull();
    const saveButton = screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    fireEvent.submit(saveButton.closest('form') as HTMLFormElement);

    expect(
      await screen.findByText('Selecione Avaliado para lançar uma nota neste resultado.'),
    ).not.toBeNull();
    expect(updateSimulationResult).not.toHaveBeenCalled();
  });

  it('allows changing an absent result to assessed', async () => {
    const user = userEvent.setup();
    vi.mocked(getSimulationResult).mockResolvedValue({
      result: { ...pendingResult, status: 'absent' },
      etag: '"result-etag-1"',
    });
    renderRoutes('/admin/turmas/44/simulados/12/resultados/51/7');

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    await user.selectOptions(screen.getByLabelText('Nova situação'), 'assessed');
    await user.type(screen.getByLabelText(/Acertos/), '6');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(updateSimulationResult).toHaveBeenCalledWith(
        '44',
        '12',
        '51',
        '7',
        { status: 'assessed', correctAnswers: 6 },
        '"result-etag-1"',
      ),
    );
  });

  it('sends only one update when the form is submitted twice while saving', async () => {
    const user = userEvent.setup();
    let finishUpdate: ((value: { result: SimulationResult; etag: string }) => void) | undefined;
    vi.mocked(updateSimulationResult).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishUpdate = resolve;
        }),
    );
    renderRoutes('/admin/turmas/44/simulados/12/resultados/51/7');

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    await user.selectOptions(screen.getByLabelText('Nova situação'), 'assessed');
    await user.type(screen.getByLabelText(/Acertos/), '6');
    const form = screen.getByRole('button', { name: 'Salvar' }).closest('form') as HTMLFormElement;

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(updateSimulationResult).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Salvando…' })).not.toBeNull();
    finishUpdate?.({ result: assessedResult, etag: '"result-etag-2"' });
    expect(await screen.findByText('Resultado salvo.')).not.toBeNull();
  });

  it('does not retry a failed write and requests a fresh representation only after user action', async () => {
    const user = userEvent.setup();
    vi.mocked(updateSimulationResult).mockRejectedValueOnce(new Error('network failure'));
    renderRoutes('/admin/turmas/44/simulados/12/resultados/51/7');

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    await user.selectOptions(screen.getByLabelText('Nova situação'), 'assessed');
    await user.type(screen.getByLabelText(/Acertos/), '4');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).not.toBeNull();
    expect(updateSimulationResult).toHaveBeenCalledOnce();
    expect(getSimulationResult).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Atualizar resultado' }));
    await waitFor(() => expect(getSimulationResult).toHaveBeenCalledTimes(2));
    expect(updateSimulationResult).toHaveBeenCalledOnce();
  });

  it('shows a stale-ETag conflict without replaying the update and refreshes only on request', async () => {
    const user = userEvent.setup();
    vi.mocked(updateSimulationResult).mockRejectedValueOnce(
      new ApiRequestError({
        status: 412,
        problem: {
          type: 'about:blank',
          title: 'Pré-condição não satisfeita',
          status: 412,
          detail:
            'O recurso mudou desde a última leitura. Atualize os dados antes de tentar novamente.',
        },
      }),
    );
    renderRoutes('/admin/turmas/44/simulados/12/resultados/51/7');

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    await user.selectOptions(screen.getByLabelText('Nova situação'), 'assessed');
    await user.type(screen.getByLabelText(/Acertos/), '4');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText(
        'O recurso mudou desde a última leitura. Atualize os dados antes de tentar novamente.',
        { selector: '[role="alert"]' },
      ),
    ).not.toBeNull();
    expect(updateSimulationResult).toHaveBeenCalledOnce();
    expect(updateSimulationResult).toHaveBeenCalledWith(
      '44',
      '12',
      '51',
      '7',
      { status: 'assessed', correctAnswers: 4 },
      '"result-etag-1"',
    );
    expect(getSimulationResult).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Atualizar resultado' }));
    await waitFor(() => expect(getSimulationResult).toHaveBeenCalledTimes(2));
    expect(updateSimulationResult).toHaveBeenCalledOnce();
  });

  it('keeps an assessed result assessed while allowing its score to be edited', async () => {
    const user = userEvent.setup();
    vi.mocked(getSimulationResult).mockResolvedValue({
      result: assessedResult,
      etag: '"result-etag-1"',
    });
    renderRoutes('/admin/turmas/44/simulados/12/resultados/51/7');

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    expect(screen.queryByLabelText('Nova situação')).toBeNull();
    expect(screen.getByText(/não alterada para ausência/)).not.toBeNull();
  });
});
