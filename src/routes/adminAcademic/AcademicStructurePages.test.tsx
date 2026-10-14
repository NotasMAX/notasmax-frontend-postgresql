// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ApiRequestError } from '../../api/problemDetails';
import * as academicService from '../../academic/academicStructureService';
import * as lifecycleService from '../../academic/academicLifecycleService';
import {
  AcademicClassFormPage,
  AcademicClassDetailPage,
  AcademicClassListPage,
  AcademicSubjectDetailPage,
  AcademicSubjectFormPage,
  AcademicSubjectListPage,
} from './AcademicStructurePages';

vi.mock('../../academic/academicStructureService', () => ({
  createAcademicClass: vi.fn(),
  createAcademicSubject: vi.fn(),
  loadAcademicClass: vi.fn(),
  loadAcademicClasses: vi.fn(),
  loadAllAcademicClasses: vi.fn(),
  loadAcademicSchoolYears: vi.fn(),
  loadAcademicSubject: vi.fn(),
  loadAcademicSubjects: vi.fn(),
  updateAcademicClass: vi.fn(),
  updateAcademicSubject: vi.fn(),
}));

vi.mock('../../academic/academicLifecycleService', () => ({
  closeAcademicClass: vi.fn(),
  loadAcademicOfferPage: vi.fn(),
  loadAcademicSubjectChoices: vi.fn(),
  loadAcademicTeacherCandidates: vi.fn(),
  loadAcademicTeacherPage: vi.fn(),
  addAcademicOffer: vi.fn(),
  addAcademicTeacher: vi.fn(),
  removeAcademicOffer: vi.fn(),
  removeAcademicTeacher: vi.fn(),
  prepareClassClosureSelection: vi.fn(),
  createAcademicClassWithClosures: vi.fn(),
}));

function renderAt(path: string, page: ReactNode) {
  const routePath = path
    .replace(
      /^\/admin\/estrutura\/materias\/(?!(?:nova)$)[^/]+\/editar$/,
      '/admin/estrutura/materias/:subjectId/editar',
    )
    .replace(
      /^\/admin\/estrutura\/materias\/(?!(?:nova)$)[^/]+$/,
      '/admin/estrutura/materias/:subjectId',
    )
    .replace(
      /^\/admin\/estrutura\/turmas\/(?!(?:nova)$)[^/]+\/editar$/,
      '/admin/estrutura/turmas/:classId/editar',
    )
    .replace(
      /^\/admin\/estrutura\/turmas\/(?!(?:nova)$)[^/]+$/,
      '/admin/estrutura/turmas/:classId',
    );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={page} />
        <Route path="/admin/estrutura/materias/:subjectId" element={<p>Detalhe da matéria</p>} />
        <Route path="/admin/estrutura/turmas/:classId" element={<p>Detalhe da turma</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => cleanup());

describe('academic subject and class workflows', () => {
  it('shows the empty subject state and a route to create a subject', async () => {
    vi.mocked(academicService.loadAcademicSubjects).mockResolvedValueOnce({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });

    renderAt('/admin/estrutura/materias', <AcademicSubjectListPage />);

    expect(await screen.findByText('Nenhuma matéria encontrada.')).toBeTruthy();
    const sectionNavigation = screen.getByRole('navigation', {
      name: 'Seções da estrutura acadêmica',
    });
    expect(sectionNavigation.textContent).toContain('Matérias');
    expect(sectionNavigation.textContent).toContain('Turmas');
    expect(sectionNavigation.textContent).toContain('Matrículas');
    expect(screen.getByRole('link', { name: 'Cadastrar matéria' }).getAttribute('href')).toBe(
      '/admin/estrutura/materias/nova',
    );
    expect(screen.getByRole('button', { name: 'Buscar' }).className).toContain('bg-primary');
    expect(
      screen
        .getByRole('button', { name: 'Buscar' })
        .querySelector('svg')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('shows subject search results as plain text with detail and edit routes', async () => {
    vi.mocked(academicService.loadAcademicSubjects).mockResolvedValueOnce({
      items: [{ subjectId: '7', name: 'Matemática', description: '<script>safe text</script>' }],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });

    const { container } = renderAt('/admin/estrutura/materias', <AcademicSubjectListPage />);

    expect(await screen.findByRole('heading', { level: 2, name: 'Matemática' })).toBeTruthy();
    expect(screen.getByText('<script>safe text</script>')).toBeTruthy();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByRole('link', { name: 'Ver matéria' }).getAttribute('href')).toBe(
      '/admin/estrutura/materias/7',
    );
    expect(screen.getByRole('link', { name: 'Editar' }).getAttribute('href')).toBe(
      '/admin/estrutura/materias/7/editar',
    );
  });

  it('does not expose an unrecognized error string in the subject list', async () => {
    vi.mocked(academicService.loadAcademicSubjects).mockRejectedValueOnce(
      new Error('internal database diagnostic'),
    );

    renderAt('/admin/estrutura/materias', <AcademicSubjectListPage />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).not.toContain('internal database diagnostic');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });

  it('does not allow editing a subject when its current values failed to load', async () => {
    vi.mocked(academicService.loadAcademicSubject).mockRejectedValueOnce(
      new Error('internal database diagnostic'),
    );

    renderAt('/admin/estrutura/materias/7/editar', <AcademicSubjectFormPage />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salvar matéria' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(academicService.updateAcademicSubject).not.toHaveBeenCalled();
  });

  it('prevents a duplicate subject create when submit is activated twice', async () => {
    const user = userEvent.setup();
    vi.mocked(academicService.createAcademicSubject).mockResolvedValue({
      subjectId: '7',
      name: 'Matemática',
      description: null,
    });

    renderAt('/admin/estrutura/materias/nova', <AcademicSubjectFormPage />);
    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Matemática');
    await user.dblClick(screen.getByRole('button', { name: 'Salvar matéria' }));

    await waitFor(() => expect(academicService.createAcademicSubject).toHaveBeenCalledOnce());
    expect(academicService.createAcademicSubject).toHaveBeenCalledWith({ name: 'Matemática' });
  });

  it('requires confirmation before creating a class and keeps the date-only value', async () => {
    const user = userEvent.setup();
    vi.mocked(academicService.loadAcademicSchoolYears).mockResolvedValue([]);
    vi.mocked(academicService.loadAllAcademicClasses).mockResolvedValue([]);
    vi.mocked(lifecycleService.prepareClassClosureSelection).mockResolvedValue([]);
    vi.mocked(lifecycleService.createAcademicClassWithClosures).mockResolvedValue({
      classId: '44',
      series: 2,
      schoolYear: 2026,
      startDate: '2026-02-01',
      isClosed: false,
    });

    renderAt('/admin/estrutura/turmas/nova', <AcademicClassFormPage />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Série' }), '2');
    await user.type(screen.getByRole('spinbutton', { name: 'Ano letivo' }), '2026');
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: 'Salvar turma' }));

    expect(
      await screen.findByRole('alertdialog', { name: 'Confirmar cadastro da turma?' }),
    ).toBeTruthy();
    expect(lifecycleService.createAcademicClassWithClosures).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
    );
    expect(lifecycleService.createAcademicClassWithClosures).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Salvar turma' }));
    await screen.findByRole('alertdialog', { name: 'Confirmar cadastro da turma?' });
    await user.click(screen.getByRole('button', { name: 'Confirmar cadastro' }));
    await waitFor(() =>
      expect(lifecycleService.createAcademicClassWithClosures).toHaveBeenCalledOnce(),
    );
    expect(lifecycleService.createAcademicClassWithClosures).toHaveBeenCalledWith(
      {
        series: 2,
        schoolYear: 2026,
        startDate: '2026-02-01',
      },
      [],
    );
  });

  it('pairs each selected prior-year class with its exact ETag in one atomic create operation', async () => {
    const user = userEvent.setup();
    const selected = [
      { classId: 'prior-a', etag: '"opaque-v/2025-a"' },
      { classId: 'prior-b', etag: '"opaque-v/2025-b"' },
    ];
    vi.mocked(academicService.loadAcademicSchoolYears).mockResolvedValue([]);
    vi.mocked(academicService.loadAllAcademicClasses).mockResolvedValue([
      { classId: 'prior-a', series: 1, schoolYear: 2025, isClosed: false },
      { classId: 'prior-b', series: 1, schoolYear: 2025, isClosed: false },
    ]);
    vi.mocked(lifecycleService.prepareClassClosureSelection).mockResolvedValue(selected);
    vi.mocked(lifecycleService.createAcademicClassWithClosures).mockResolvedValue({
      classId: 'new-class',
      series: 1,
      schoolYear: 2026,
      startDate: '2026-02-01',
      isClosed: false,
    });

    renderAt('/admin/estrutura/turmas/nova', <AcademicClassFormPage />);
    await user.type(screen.getByRole('spinbutton', { name: 'Ano letivo' }), '2026');
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: 'Salvar turma' }));
    await screen.findByRole('alertdialog', { name: 'Confirmar cadastro da turma?' });
    await user.click(screen.getByRole('checkbox', { name: /prior-a/ }));
    await user.click(screen.getByRole('checkbox', { name: /prior-b/ }));

    expect(lifecycleService.createAcademicClassWithClosures).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar cadastro' }));

    await waitFor(() =>
      expect(lifecycleService.createAcademicClassWithClosures).toHaveBeenCalledOnce(),
    );
    expect(academicService.loadAllAcademicClasses).toHaveBeenCalledWith(2025);
    expect(lifecycleService.prepareClassClosureSelection).toHaveBeenCalledWith([
      'prior-a',
      'prior-b',
    ]);
    expect(lifecycleService.createAcademicClassWithClosures).toHaveBeenCalledWith(
      { series: 1, schoolYear: 2026, startDate: '2026-02-01' },
      selected,
    );
  });

  it('canceling class creation with selected prior-year classes makes no write', async () => {
    const user = userEvent.setup();
    vi.mocked(academicService.loadAcademicSchoolYears).mockResolvedValue([]);
    vi.mocked(academicService.loadAllAcademicClasses).mockResolvedValue([
      { classId: 'prior-a', series: 1, schoolYear: 2025, isClosed: false },
    ]);

    renderAt('/admin/estrutura/turmas/nova', <AcademicClassFormPage />);
    await user.type(screen.getByRole('spinbutton', { name: 'Ano letivo' }), '2026');
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: 'Salvar turma' }));
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Confirmar cadastro da turma?',
    });
    await user.click(screen.getByRole('checkbox', { name: /prior-a/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(lifecycleService.prepareClassClosureSelection).not.toHaveBeenCalled();
    expect(lifecycleService.createAcademicClassWithClosures).not.toHaveBeenCalled();
    expect(academicService.createAcademicClass).not.toHaveBeenCalled();
  });

  it('does not automatically retry atomic class creation after a conflict', async () => {
    const user = userEvent.setup();
    vi.mocked(academicService.loadAcademicSchoolYears).mockResolvedValue([]);
    vi.mocked(academicService.loadAllAcademicClasses).mockResolvedValue([
      { classId: 'prior-a', series: 1, schoolYear: 2025, isClosed: false },
    ]);
    vi.mocked(lifecycleService.prepareClassClosureSelection).mockResolvedValue([
      { classId: 'prior-a', etag: '"opaque-v/2025-a"' },
    ]);
    vi.mocked(lifecycleService.createAcademicClassWithClosures).mockRejectedValue(
      new ApiRequestError({
        status: 409,
        problem: { status: 409, code: 'CLASS_SELECTION_INVALID' },
      }),
    );

    renderAt('/admin/estrutura/turmas/nova', <AcademicClassFormPage />);
    await user.type(screen.getByRole('spinbutton', { name: 'Ano letivo' }), '2026');
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: 'Salvar turma' }));
    await screen.findByRole('alertdialog', { name: 'Confirmar cadastro da turma?' });
    await user.click(screen.getByRole('checkbox', { name: /prior-a/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmar cadastro' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).not.toContain('CLASS_SELECTION_INVALID');
    expect(lifecycleService.prepareClassClosureSelection).toHaveBeenCalledOnce();
    expect(lifecycleService.createAcademicClassWithClosures).toHaveBeenCalledOnce();
  });

  it('loads the class year choices and shows an empty class list', async () => {
    vi.mocked(academicService.loadAcademicSchoolYears).mockResolvedValue([]);
    vi.mocked(academicService.loadAcademicClasses).mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });

    renderAt('/admin/estrutura/turmas', <AcademicClassListPage />);

    expect(
      await screen.findByText('Nenhuma turma encontrada para o ano selecionado.'),
    ).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Ano letivo atual' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aplicar' })).toBeNull();
    expect(academicService.loadAcademicClasses).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it('shows a class detail date without converting its civil day', async () => {
    vi.mocked(lifecycleService.loadAcademicOfferPage).mockResolvedValue({
      items: [],
      etag: '"offers"',
    });
    vi.mocked(lifecycleService.loadAcademicSubjectChoices).mockResolvedValue([]);
    vi.mocked(academicService.loadAcademicClass).mockResolvedValueOnce({
      schoolClass: {
        classId: '44',
        series: 2,
        schoolYear: 2026,
        startDate: '2026-02-01',
        isClosed: false,
      },
      etag: '"opaque"',
    });

    renderAt('/admin/estrutura/turmas/44', <AcademicClassDetailPage />);

    expect(await screen.findByText('01/02/2026')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Editar turma' }).getAttribute('href')).toBe(
      '/admin/estrutura/turmas/44/editar',
    );
  });

  it('requires class-closure confirmation and sends one closure with the detail ETag', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycleService.loadAcademicOfferPage).mockResolvedValue({
      items: [],
      etag: '"offers-v1"',
    });
    vi.mocked(lifecycleService.loadAcademicSubjectChoices).mockResolvedValue([]);
    vi.mocked(academicService.loadAcademicClass).mockResolvedValue({
      schoolClass: {
        classId: '44',
        series: 2,
        schoolYear: 2026,
        startDate: '2026-02-01',
        isClosed: false,
      },
      etag: '"class-v1"',
    });
    renderAt('/admin/estrutura/turmas/44', <AcademicClassDetailPage />);
    await screen.findByText('01/02/2026');
    await user.click(screen.getByRole('button', { name: 'Encerrar turma' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(lifecycleService.closeAcademicClass).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Encerrar turma' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Encerrar turma' }),
    );
    await waitFor(() => expect(lifecycleService.closeAcademicClass).toHaveBeenCalledOnce());
    expect(lifecycleService.closeAcademicClass).toHaveBeenCalledWith('44', '"class-v1"');
  });

  it('loads subject detail through the existing paginated collection', async () => {
    vi.mocked(academicService.loadAcademicSubject).mockResolvedValueOnce({
      subjectId: '7',
      name: 'Matemática',
      description: null,
    });

    renderAt('/admin/estrutura/materias/7', <AcademicSubjectDetailPage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Matemática' })).toBeTruthy();
    expect(screen.getByText('Sem descrição.')).toBeTruthy();
  });
});
