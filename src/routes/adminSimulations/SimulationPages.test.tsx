// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { loadAdminClasses } from '../../api/adminAcademicCatalog';
import {
  createSimulation,
  deleteSimulation,
  getSimulation,
  listAllSimulationsForBimester,
  listOfferedSubjects,
  listSimulations,
  realizeSimulation,
  updateSimulation,
} from '../../api/adminSimulations';
import { ApiRequestError } from '../../api/problemDetails';
import type { AdminClassOption } from '../../api/adminAcademicCatalog';
import type { Simulation, SimulationPage } from '../../api/adminSimulations';
import { SimulationClassPage } from './SimulationClassPage';
import { SimulationDetailPage } from './SimulationDetailPage';
import { SimulationFormPage } from './SimulationFormPage';
import { SimulationListPage } from './SimulationListPage';

vi.mock('../../api/adminAcademicCatalog', () => ({ loadAdminClasses: vi.fn() }));
vi.mock('../../api/adminSimulations', () => ({
  createSimulation: vi.fn(),
  deleteSimulation: vi.fn(),
  getSimulation: vi.fn(),
  listAllSimulationsForBimester: vi.fn(),
  listOfferedSubjects: vi.fn(),
  listSimulations: vi.fn(),
  realizeSimulation: vi.fn(),
  updateSimulation: vi.fn(),
}));

const currentSchoolYear = new Date().getFullYear();
const openClass: AdminClassOption = {
  classId: '44',
  series: 9,
  schoolYear: currentSchoolYear,
  isClosed: false,
};
const secondCurrentClass: AdminClassOption = {
  classId: '46',
  series: 10,
  schoolYear: currentSchoolYear,
  isClosed: false,
};
const previousYearClass: AdminClassOption = {
  classId: '45',
  series: 8,
  schoolYear: currentSchoolYear - 1,
  isClosed: true,
};
const closedClass: AdminClassOption = { ...openClass, isClosed: true };
const offered = [
  { subjectId: '7', name: 'Matemática', description: null },
  { subjectId: '8', name: 'História', description: null },
];
const simulation: Simulation = {
  simulationId: '12',
  classId: '44',
  number: 3,
  type: 'objetivo',
  bimester: 2,
  scheduledDate: '2026-10-13',
  realizedAt: null,
  subjects: [{ subjectId: '7', totalQuestions: 10, weightPercent: 20 }],
};
const realizedSimulation: Simulation = { ...simulation, realizedAt: '2026-10-14T14:00:00.000Z' };
const page = (
  items: readonly Simulation[] = [simulation],
  pageNumber = 1,
  totalPages = 1,
): SimulationPage => ({
  items,
  pagination: { page: pageNumber, pageSize: 20, totalItems: items.length, totalPages },
});
const etag = '"etag-copied-from-api"';

function renderRoutes(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin/simulados" element={<SimulationClassPage />} />
        <Route path="/admin/turmas/:classId/simulados" element={<SimulationListPage />} />
        <Route path="/admin/turmas/:classId/simulados/novo" element={<SimulationFormPage />} />
        <Route
          path="/admin/turmas/:classId/simulados/:simulationId/editar"
          element={<SimulationFormPage />}
        />
        <Route
          path="/admin/turmas/:classId/simulados/:simulationId"
          element={<SimulationDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loadAdminClasses).mockResolvedValue([openClass]);
  vi.mocked(listOfferedSubjects).mockResolvedValue(offered);
  vi.mocked(listSimulations).mockResolvedValue(page());
  vi.mocked(listAllSimulationsForBimester).mockResolvedValue([]);
  vi.mocked(getSimulation).mockResolvedValue({ simulation, etag });
  vi.mocked(createSimulation).mockResolvedValue({ simulation, etag });
  vi.mocked(updateSimulation).mockResolvedValue({ simulation, etag: '"new-etag"' });
  vi.mocked(realizeSimulation).mockResolvedValue({
    simulation: realizedSimulation,
    etag: '"realized-etag"',
  });
  vi.mocked(deleteSimulation).mockResolvedValue();
});

afterEach(() => cleanup());

describe('NM-33 simulation screens', () => {
  it('keeps closed classes available for historical list/detail navigation without create actions', async () => {
    const user = userEvent.setup();
    vi.mocked(loadAdminClasses)
      .mockResolvedValueOnce([closedClass])
      .mockResolvedValue([closedClass]);
    renderRoutes('/admin/simulados');

    await user.click(await screen.findByRole('link', { name: 'Consultar histórico' }));
    expect(await screen.findByRole('heading', { name: 'Simulados' })).not.toBeNull();
    expect(screen.getByText(`9ª série · ${currentSchoolYear}`)).not.toBeNull();
    expect(screen.queryByLabelText('Ano letivo')).toBeNull();
    expect(screen.queryByLabelText('Série')).toBeNull();
    expect(await screen.findByRole('link', { name: 'Abrir detalhe' })).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Novo simulado' })).toBeNull();
    expect(screen.getByText(/consulta histórica continua disponível/)).not.toBeNull();
    expect(listSimulations).toHaveBeenCalledWith('44', { page: 1, pageSize: 20 });
    await user.click(screen.getByRole('link', { name: 'Abrir detalhe' }));
    expect(await screen.findByRole('heading', { name: 'Simulado nº 3' })).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Editar simulado' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirmar realização' })).toBeNull();
  });

  it('defaults to the current school year and shows only its series', async () => {
    const user = userEvent.setup();
    vi.mocked(loadAdminClasses).mockResolvedValue([
      openClass,
      secondCurrentClass,
      previousYearClass,
    ]);
    renderRoutes('/admin/simulados');

    const yearSelect = (await screen.findByLabelText('Ano letivo')) as HTMLSelectElement;
    expect(yearSelect.value).toBe(String(currentSchoolYear));
    expect(screen.getByText(`9ª série · ${currentSchoolYear}`)).not.toBeNull();
    expect(screen.getByText(`10ª série · ${currentSchoolYear}`)).not.toBeNull();
    expect(screen.queryByText(`8ª série · ${currentSchoolYear - 1}`)).toBeNull();

    await user.selectOptions(yearSelect, String(currentSchoolYear - 1));
    expect(await screen.findByText(`8ª série · ${currentSchoolYear - 1}`)).not.toBeNull();
    expect(screen.queryByText(`9ª série · ${currentSchoolYear}`)).toBeNull();
  });

  it('removes year and series selectors from the class simulation list', async () => {
    renderRoutes('/admin/turmas/44/simulados');

    await screen.findByRole('link', { name: 'Abrir detalhe' });
    expect(screen.queryByLabelText('Ano letivo')).toBeNull();
    expect(screen.queryByLabelText('Série')).toBeNull();
    expect(screen.getByText(`9ª série · ${currentSchoolYear}`)).not.toBeNull();
  });

  it('styles the choose-another-class link as a secondary button', async () => {
    renderRoutes('/admin/turmas/44/simulados');

    const link = await screen.findByRole('link', { name: '← Escolher outra turma' });
    expect(link.className).toContain('account-button-secondary');
    expect(link.getAttribute('href')).toBe('/admin/simulados');
  });

  it('uses the shared blue action style and icons for simulation actions', async () => {
    renderRoutes('/admin/turmas/44/simulados');

    const createLink = await screen.findByRole('link', { name: 'Novo simulado' });
    const detailLink = await screen.findByRole('link', { name: 'Abrir detalhe' });
    for (const link of [createLink, detailLink]) {
      expect(link.className).toContain('account-button-primary');
      expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('applies supported filters, keeps them while paging, resets them, and shows empty state', async () => {
    const user = userEvent.setup();
    vi.mocked(listSimulations)
      .mockResolvedValueOnce(page([simulation], 1, 2))
      .mockResolvedValueOnce(page([simulation], 1, 2))
      .mockResolvedValueOnce(page([simulation], 2, 2))
      .mockResolvedValueOnce(page([], 1, 0));
    renderRoutes('/admin/turmas/44/simulados');
    await screen.findByRole('heading', { name: 'Simulados' });
    await screen.findByRole('link', { name: 'Abrir detalhe' });
    vi.mocked(listSimulations).mockClear();

    await user.selectOptions(screen.getByLabelText('Bimestre'), '2');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'objetivo');
    await user.selectOptions(screen.getByLabelText('Matéria'), '7');
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-10-31' } });
    await user.selectOptions(screen.getByLabelText('Itens por página'), '50');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    const applied = {
      page: 1,
      pageSize: 50,
      bimester: 2,
      type: 'objetivo',
      subjectId: '7',
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
    };
    await waitFor(() => expect(listSimulations).toHaveBeenLastCalledWith('44', applied));
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() =>
      expect(listSimulations).toHaveBeenLastCalledWith('44', { ...applied, page: 2 }),
    );

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(await screen.findByText(/Nenhum simulado encontrado/)).not.toBeNull();
    expect(listSimulations).toHaveBeenLastCalledWith('44', { page: 1, pageSize: 20 });
  });

  it('selects all offered subjects, supports remove/restore, warns on past dates, and displays API-assigned number', async () => {
    const user = userEvent.setup();
    vi.mocked(createSimulation).mockResolvedValue({
      simulation: { ...simulation, number: 41 },
      etag,
    });
    vi.mocked(getSimulation).mockResolvedValue({ simulation: { ...simulation, number: 41 }, etag });
    renderRoutes('/admin/turmas/44/simulados/novo');

    await screen.findByRole('heading', { name: 'Novo simulado' });
    expect(screen.getAllByLabelText('Quantidade de questões', { selector: 'input' })).toHaveLength(
      2,
    );
    expect(screen.getByRole('heading', { name: 'Matemática' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'História' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remover História' }));
    expect(screen.queryByRole('heading', { name: 'História' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Restaurar todas' }));
    expect(screen.getByRole('heading', { name: 'História' })).not.toBeNull();

    await user.selectOptions(screen.getByLabelText('Tipo'), 'dissertativo');
    await user.selectOptions(screen.getByLabelText('Bimestre'), '2');
    fireEvent.change(screen.getByLabelText('Data agendada'), { target: { value: '2001-02-03' } });
    expect(screen.getByText(/está no passado.*ainda pode salvar/i)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Salvar simulado' }));

    await waitFor(() =>
      expect(createSimulation).toHaveBeenCalledWith('44', {
        type: 'dissertativo',
        bimester: 2,
        scheduledDate: '2001-02-03',
        subjects: [
          { subjectId: '7', totalQuestions: 1, weightPercent: 100 },
          { subjectId: '8', totalQuestions: 1, weightPercent: 100 },
        ],
      }),
    );
    expect(await screen.findByText('Simulado nº 41 criado.')).not.toBeNull();
  });

  it('shows the API weight-limit message when a subject ID overlaps its percentage', async () => {
    const user = userEvent.setup();
    vi.mocked(listOfferedSubjects).mockResolvedValueOnce([
      { subjectId: '1', name: 'Matemática', description: null },
    ]);
    vi.mocked(createSimulation).mockRejectedValueOnce(
      new ApiRequestError({
        status: 409,
        problem: {
          type: 'about:blank',
          title: 'Conflito',
          status: 409,
          detail: 'A soma dos pesos da matéria no bimestre não pode ultrapassar 100%.',
        },
      }),
    );
    renderRoutes('/admin/turmas/44/simulados/novo');

    await screen.findByRole('heading', { name: 'Novo simulado' });
    await user.selectOptions(screen.getByLabelText('Tipo'), 'objetivo');
    await user.selectOptions(screen.getByLabelText('Bimestre'), '2');
    fireEvent.change(screen.getByLabelText('Data agendada'), { target: { value: '2026-10-13' } });
    await user.click(screen.getByRole('button', { name: 'Salvar simulado' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'A soma dos pesos da matéria no bimestre não pode ultrapassar 100%.',
    );
  });

  it('requires at least one subject and refuses a realized simulation edit route', async () => {
    const user = userEvent.setup();
    renderRoutes('/admin/turmas/44/simulados/novo');
    await screen.findByRole('heading', { name: 'Novo simulado' });
    await user.selectOptions(screen.getByLabelText('Tipo'), 'objetivo');
    await user.click(screen.getByRole('button', { name: 'Remover Matemática' }));
    await user.click(screen.getByRole('button', { name: 'Remover História' }));
    await user.click(screen.getByRole('button', { name: 'Salvar simulado' }));
    expect(await screen.findByText('Selecione pelo menos uma matéria.')).not.toBeNull();
    expect(createSimulation).not.toHaveBeenCalled();

    cleanup();
    vi.mocked(getSimulation).mockResolvedValue({ simulation: realizedSimulation, etag });
    renderRoutes('/admin/turmas/44/simulados/12/editar');
    expect((await screen.findByRole('alert')).textContent).toContain(
      'realização confirmada; edição indisponível',
    );
    expect(screen.queryByRole('button', { name: 'Salvar simulado' })).toBeNull();
  });

  it('excludes the edited simulation from advisory totals and forwards its opaque ETag on save', async () => {
    const user = userEvent.setup();
    vi.mocked(getSimulation).mockResolvedValue({ simulation, etag });
    vi.mocked(listAllSimulationsForBimester).mockResolvedValue([
      simulation,
      {
        ...simulation,
        simulationId: '13',
        number: 4,
        subjects: [{ subjectId: '7', totalQuestions: 4, weightPercent: 12.34 }],
      },
    ]);
    renderRoutes('/admin/turmas/44/simulados/12/editar');

    await screen.findByRole('heading', { name: 'Editar simulado' });
    expect(
      await screen.findByText('Já alocado neste bimestre: 12,34% · Saldo estimado: 87,66%'),
    ).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Data agendada'), { target: { value: '2001-02-03' } });
    expect(screen.getByText(/está no passado.*ainda pode salvar/i)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Salvar simulado' }));
    await waitFor(() =>
      expect(updateSimulation).toHaveBeenCalledWith(
        '44',
        '12',
        {
          type: 'objetivo',
          bimester: 2,
          scheduledDate: '2001-02-03',
          subjects: [{ subjectId: '7', totalQuestions: 10, weightPercent: 20 }],
        },
        etag,
      ),
    );
  });

  it('sends no realization when canceled, traps dialog keyboard focus, and submits realization once', async () => {
    const user = userEvent.setup();
    let resolveMutation: ((value: { simulation: Simulation; etag: string }) => void) | undefined;
    vi.mocked(realizeSimulation).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );
    renderRoutes('/admin/turmas/44/simulados/12');

    await screen.findByRole('heading', { name: 'Simulado nº 3' });
    await user.click(screen.getByRole('button', { name: 'Confirmar realização' }));
    let dialog = screen.getByRole('alertdialog');
    const cancelButton = within(dialog).getByRole('button', { name: 'Cancelar' });
    expect(document.activeElement).toBe(cancelButton);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(
      within(dialog).getByRole('button', { name: 'Confirmar realização' }),
    );
    await user.tab();
    expect(document.activeElement).toBe(cancelButton);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Confirmar realização' }),
    );
    expect(realizeSimulation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirmar realização' }));
    dialog = screen.getByRole('alertdialog');
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirmar realização' }));
    await waitFor(() => expect(realizeSimulation).toHaveBeenCalledOnce());
    expect(realizeSimulation).toHaveBeenCalledWith('44', '12', etag);
    resolveMutation?.({ simulation: realizedSimulation, etag: '"realized-etag"' });
    expect(await screen.findByText(/Simulado realizado/)).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Editar simulado' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir simulado' })).toBeNull();
  });

  it('requires deletion confirmation, displays safe API conflict text, and refreshes without replay', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteSimulation).mockRejectedValueOnce(
      new ApiRequestError({
        status: 409,
        problem: {
          type: 'about:blank',
          title: 'Conflito',
          status: 409,
          detail: 'O simulado possui resultados vinculados.',
          code: 'SIMULATION_HAS_LINKED_ANSWERS',
        },
      }),
    );
    renderRoutes('/admin/turmas/44/simulados/12');
    await screen.findByRole('heading', { name: 'Simulado nº 3' });
    await user.click(screen.getByRole('button', { name: 'Excluir simulado' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(deleteSimulation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Excluir simulado' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir simulado' }),
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'O simulado possui resultados vinculados.',
    );
    expect(deleteSimulation).toHaveBeenCalledOnce();
    expect(getSimulation).toHaveBeenCalledTimes(2);
  });

  it('presents a clear stale-data message, refreshes detail, and does not replay realization', async () => {
    const user = userEvent.setup();
    vi.mocked(realizeSimulation).mockRejectedValueOnce(
      new ApiRequestError({
        status: 412,
        problem: {
          type: 'about:blank',
          title: 'Os dados foram alterados',
          status: 412,
          detail: 'O simulado foi alterado por outra pessoa. Atualize e tente novamente.',
          code: 'ETAG_MISMATCH',
        },
      }),
    );
    vi.mocked(getSimulation)
      .mockResolvedValueOnce({ simulation, etag })
      .mockResolvedValueOnce({ simulation, etag: '"refreshed-etag"' });
    renderRoutes('/admin/turmas/44/simulados/12');
    await screen.findByRole('heading', { name: 'Simulado nº 3' });
    await user.click(screen.getByRole('button', { name: 'Confirmar realização' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Confirmar realização',
      }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(
      'O simulado foi alterado por outra pessoa. Atualize e tente novamente.',
    );
    expect(alert.textContent).not.toMatch(/etag|api/i);
    expect(realizeSimulation).toHaveBeenCalledOnce();
    expect(realizeSimulation).toHaveBeenCalledWith('44', '12', etag);
    expect(getSimulation).toHaveBeenCalledTimes(2);
  });

  it('uses friendly wording when the current simulation version is unavailable', async () => {
    vi.mocked(getSimulation).mockResolvedValue({ simulation, etag: undefined });
    renderRoutes('/admin/turmas/44/simulados/12');

    await screen.findByRole('heading', { name: 'Simulado nº 3' });
    expect((await screen.findByRole('status')).textContent).toContain(
      'Não foi possível confirmar se os dados estão atualizados. Atualize a página antes de fazer alterações.',
    );
    expect(screen.queryByText(/etag|api/i)).toBeNull();
  });

  it('shows the API stale-data message when saving an edited simulation', async () => {
    const user = userEvent.setup();
    vi.mocked(updateSimulation).mockRejectedValueOnce(
      new ApiRequestError({
        status: 412,
        problem: {
          type: 'about:blank',
          title: 'Os dados foram alterados',
          status: 412,
          detail: 'O simulado foi alterado por outra pessoa. Atualize e tente novamente.',
          code: 'ETAG_MISMATCH',
        },
      }),
    );
    renderRoutes('/admin/turmas/44/simulados/12/editar');
    await screen.findByRole('heading', { name: 'Editar simulado' });
    await user.click(screen.getByRole('button', { name: 'Salvar simulado' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(
      'O simulado foi alterado por outra pessoa. Atualize e tente novamente.',
    );
    expect(alert.textContent).not.toMatch(/etag|api/i);
    expect(updateSimulation).toHaveBeenCalledOnce();
  });

  it('sends the confirmed logical deletion once and returns to the class list after 204', async () => {
    const user = userEvent.setup();
    renderRoutes('/admin/turmas/44/simulados/12');
    await screen.findByRole('heading', { name: 'Simulado nº 3' });
    await user.click(screen.getByRole('button', { name: 'Excluir simulado' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir simulado' }));
    expect(deleteSimulation).toHaveBeenCalledOnce();
    expect(deleteSimulation).toHaveBeenCalledWith('44', '12', etag);
    expect(await screen.findByRole('heading', { name: 'Simulados' })).not.toBeNull();
  });

  it('keeps edit on the left and groups realization and deletion actions on the right', async () => {
    renderRoutes('/admin/turmas/44/simulados/12');
    await screen.findByRole('heading', { name: 'Simulado nº 3' });

    const actions = screen.getByRole('group', { name: 'Ações do simulado' });
    expect(actions.firstElementChild?.textContent).toContain('Editar simulado');
    const rightActions = actions.lastElementChild;
    expect(rightActions?.textContent).toContain('Confirmar realização');
    expect(rightActions?.textContent).toContain('Excluir simulado');
  });

  it('renders safe RFC 9457 field detail text from the existing shared presenter', async () => {
    const user = userEvent.setup();
    vi.mocked(updateSimulation).mockRejectedValueOnce(
      new ApiRequestError({
        status: 400,
        problem: {
          type: 'about:blank',
          title: 'Dados inválidos',
          status: 400,
          detail: 'Revise os campos do simulado.',
          errors: [
            {
              code: 'INVALID_WEIGHT',
              detail: 'O peso deve usar no máximo duas casas decimais.',
              source: { in: 'body', pointer: '/subjects/0/weightPercent' },
            },
          ],
        },
      }),
    );
    renderRoutes('/admin/turmas/44/simulados/12/editar');
    await screen.findByRole('heading', { name: 'Editar simulado' });
    await user.click(screen.getByRole('button', { name: 'Salvar simulado' }));
    expect(
      await screen.findByText('O peso deve usar no máximo duas casas decimais.'),
    ).not.toBeNull();
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContain(
      'Revise os campos do simulado.',
    );
  });

  it('does not offer mutation actions for a realized simulation or a simulation in a closed class', async () => {
    vi.mocked(getSimulation).mockResolvedValue({ simulation: realizedSimulation, etag });
    renderRoutes('/admin/turmas/44/simulados/12');
    await screen.findByRole('heading', { name: 'Simulado nº 3' });
    expect(screen.queryByRole('link', { name: 'Editar simulado' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirmar realização' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir simulado' })).toBeNull();

    cleanup();
    vi.mocked(getSimulation).mockResolvedValue({ simulation, etag });
    vi.mocked(loadAdminClasses).mockResolvedValue([closedClass]);
    renderRoutes('/admin/turmas/44/simulados/12');
    expect(
      await screen.findByText(
        'Esta turma está encerrada. O simulado pode ser consultado, mas não pode ser alterado.',
      ),
    ).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Editar simulado' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirmar realização' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir simulado' })).toBeNull();
  });

  it('renders loading, empty and unusable-error states without exposing raw exceptions', async () => {
    let resolveList: ((value: SimulationPage) => void) | undefined;
    vi.mocked(listSimulations).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );
    renderRoutes('/admin/turmas/44/simulados');
    expect(await screen.findByText('Carregando simulados…')).not.toBeNull();
    resolveList?.(page());
    expect(await screen.findByRole('link', { name: 'Abrir detalhe' })).not.toBeNull();

    cleanup();
    vi.mocked(listSimulations).mockResolvedValue(page([], 1, 0));
    renderRoutes('/admin/turmas/44/simulados');
    expect(
      await screen.findByText('Nenhum simulado encontrado para estes filtros.'),
    ).not.toBeNull();

    cleanup();
    vi.mocked(listSimulations).mockRejectedValueOnce(new Error('database password=private-value'));
    renderRoutes('/admin/turmas/44/simulados');
    expect((await screen.findByRole('alert')).textContent).toMatch(/Não foi possível concluir/);
    expect(screen.queryByText(/private-value/)).toBeNull();
  });
});
