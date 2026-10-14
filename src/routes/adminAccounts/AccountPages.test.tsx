// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PaginatedAccountList,
  StudentAccountDetail,
  StudentAccountSummary,
  TeacherAccountDetail,
} from '../../api/adminAccounts';
import { ApiRequestError } from '../../api/problemDetails';
import * as academicCatalog from '../../api/adminAcademicCatalog';
import * as accountService from '../../accounts/accountService';
import {
  AdminAccountDetailRoute,
  AdminAccountFormRoute,
  AdminAccountListRoute,
} from './AccountRoutes';

vi.mock('../../accounts/accountService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../accounts/accountService')>();
  return {
    ...actual,
    createAccount: vi.fn(),
    loadAccountDetail: vi.fn(),
    loadAccountPage: vi.fn(),
    resendActivation: vi.fn(),
    updateAccount: vi.fn(),
  };
});

vi.mock('../../api/adminAcademicCatalog', () => ({
  loadAccountFilterOptions: vi.fn(),
}));

const student: StudentAccountSummary = {
  studentId: '101',
  name: 'Ada Lovelace',
  email: 'ada@example.test',
  activationStatus: 'activated',
  enrollmentStatus: 'active',
  currentClass: { series: 9, schoolYear: 2026 },
};

const studentDetail: StudentAccountDetail = {
  studentId: '101',
  name: 'Ada Lovelace',
  email: 'ada@example.test',
  activationStatus: 'activated',
  guardianPhone: '555-0100',
  enrollmentStatus: 'active',
  currentClass: { series: 9, schoolYear: 2026 },
  enrollments: [
    {
      enrollmentId: '9001',
      class: { series: 9, schoolYear: 2026 },
      startDate: '2026-02-01',
      cancellationDate: null,
    },
    {
      enrollmentId: '8001',
      class: { series: 8, schoolYear: 2025 },
      startDate: '2025-02-01',
      cancellationDate: '2025-12-15',
    },
  ],
};

const teacher: TeacherAccountDetail = {
  teacherId: '55',
  name: 'Grace Hopper',
  email: 'grace@example.test',
  activationStatus: 'activated',
};

const pendingTeacher: TeacherAccountDetail = {
  ...teacher,
  activationStatus: 'pending',
};

const createdStudent: StudentAccountSummary = {
  studentId: '202',
  name: 'Katherine Johnson',
  email: 'katherine@example.test',
  activationStatus: 'pending',
  enrollmentStatus: 'no_active_enrollment',
  currentClass: null,
};

const createdStudentDetail: StudentAccountDetail = {
  studentId: '202',
  name: 'Katherine Johnson',
  email: 'katherine@example.test',
  activationStatus: 'pending',
  guardianPhone: '555-0101',
  enrollmentStatus: 'no_active_enrollment',
  currentClass: null,
  enrollments: [],
};

function page(
  items: readonly StudentAccountSummary[] = [],
  pageNumber = 1,
  pageSize = 20,
  totalItems = items.length,
  totalPages = totalItems === 0 ? 0 : 1,
): PaginatedAccountList<StudentAccountSummary> {
  return {
    items,
    pagination: {
      page: pageNumber,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function AccountRouteTree() {
  return createElement(
    Routes,
    null,
    createElement(Route, {
      path: '/admin/contas/:profile',
      element: createElement(AdminAccountListRoute),
    }),
    createElement(Route, {
      path: '/admin/contas/:profile/novo',
      element: createElement(AdminAccountFormRoute),
    }),
    createElement(Route, {
      path: '/admin/contas/:profile/:accountId/editar',
      element: createElement(AdminAccountFormRoute),
    }),
    createElement(Route, {
      path: '/admin/contas/:profile/:accountId',
      element: createElement(AdminAccountDetailRoute),
    }),
  );
}

function renderAt(path: string) {
  return render(
    createElement(MemoryRouter, { initialEntries: [path] }, createElement(AccountRouteTree)),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(academicCatalog.loadAccountFilterOptions).mockResolvedValue({
    classes: [
      { classId: '44', series: 9, schoolYear: 2026, isClosed: false },
      { classId: '45', series: 8, schoolYear: 2026, isClosed: false },
    ],
    subjects: [
      { subjectId: '7', name: 'Matemática', description: null },
      { subjectId: '8', name: 'História', description: null },
    ],
  });
});

afterEach(() => {
  cleanup();
});

describe('account management pages', () => {
  it('keeps the newest account list when an older filter request resolves last', async () => {
    const initialRequest = deferred<Awaited<ReturnType<typeof accountService.loadAccountPage>>>();
    const filteredRequest = deferred<Awaited<ReturnType<typeof accountService.loadAccountPage>>>();
    vi.mocked(accountService.loadAccountPage)
      .mockReturnValueOnce(initialRequest.promise)
      .mockReturnValueOnce(filteredRequest.promise);
    renderAt('/admin/contas/administradores');
    const user = userEvent.setup();

    await waitFor(() => expect(accountService.loadAccountPage).toHaveBeenCalledTimes(1));
    await user.type(screen.getByLabelText('Buscar por nome ou e-mail'), 'Ada');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    await waitFor(() => expect(accountService.loadAccountPage).toHaveBeenCalledTimes(2));

    await act(async () => filteredRequest.resolve(page([student])));
    expect(await screen.findByText('Ada Lovelace')).toBeTruthy();
    await act(async () => initialRequest.resolve(page()));

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.queryByText('Ajuste os filtros ou cadastre uma conta.')).toBeNull();
  });

  it('shows a list error and retries the failed account request', async () => {
    vi.mocked(accountService.loadAccountPage)
      .mockRejectedValueOnce(new Error('synthetic network failure'))
      .mockResolvedValueOnce(page([student]));
    renderAt('/admin/contas/administradores');

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Não foi possível concluir esta ação. Tente novamente.',
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Ada Lovelace')).toBeTruthy();
  });

  it('shows a detail error and retries loading the account', async () => {
    vi.mocked(accountService.loadAccountDetail)
      .mockRejectedValueOnce(new Error('synthetic network failure'))
      .mockResolvedValueOnce(teacher);
    renderAt('/admin/contas/professores/55');

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Não foi possível concluir esta ação. Tente novamente.',
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Grace Hopper' })).toBeTruthy();
  });

  it('shows a safe error when activation resend fails', async () => {
    vi.mocked(accountService.loadAccountDetail).mockResolvedValue(pendingTeacher);
    vi.mocked(accountService.resendActivation).mockRejectedValue(
      new Error('synthetic network failure'),
    );
    renderAt('/admin/contas/professores/55');

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reenviar ativação' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Não foi possível concluir esta ação. Tente novamente.',
    );
    expect(screen.getByRole('alert').textContent).not.toContain(pendingTeacher.email);
  });

  it('shows student enrollment status and submits only supported student filters', async () => {
    vi.mocked(accountService.loadAccountPage)
      .mockResolvedValueOnce(page([student], 1, 20, 2, 2))
      .mockResolvedValueOnce(page([student], 1, 20, 2, 2))
      .mockResolvedValueOnce(page([student], 2, 20, 2, 2));
    renderAt('/admin/contas/alunos');
    const user = userEvent.setup();

    expect(await screen.findByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Com matrícula ativa', { selector: 'span' })).toBeTruthy();
    expect(screen.getByText('9ª série · ano letivo 2026')).toBeTruthy();
    expect(screen.getByLabelText('Ativação')).toBeTruthy();
    expect(screen.getByLabelText('Matrícula')).toBeTruthy();
    expect(screen.getByLabelText('Ano letivo')).toBeTruthy();
    expect(screen.getByLabelText('Série')).toBeTruthy();
    expect(screen.queryByLabelText('ID da turma')).toBeNull();
    expect(screen.queryByLabelText('ID da matéria')).toBeNull();

    await user.type(screen.getByLabelText('Buscar por nome ou e-mail'), 'Ada');
    await user.selectOptions(screen.getByLabelText('Ativação'), 'pending');
    await user.selectOptions(screen.getByLabelText('Matrícula'), 'no_active_enrollment');
    await screen.findByRole('option', { name: '2026' });
    await user.selectOptions(screen.getByLabelText('Ano letivo'), '2026');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Para filtrar por turma, selecione o ano letivo e a série.',
    );
    await user.selectOptions(screen.getByLabelText('Série'), '9');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() =>
      expect(accountService.loadAccountPage).toHaveBeenNthCalledWith(2, 'student', {
        search: 'Ada',
        activationStatus: 'pending',
        enrollmentStatus: 'no_active_enrollment',
        classId: '44',
        page: 1,
        pageSize: 20,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() =>
      expect(accountService.loadAccountPage).toHaveBeenNthCalledWith(
        3,
        'student',
        expect.objectContaining({ page: 2, pageSize: 20 }),
      ),
    );
  });

  it('shows academic and subject names for teachers and keeps administrator filters unchanged', async () => {
    vi.mocked(accountService.loadAccountPage).mockResolvedValue(page());
    const { unmount } = renderAt('/admin/contas/professores');
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Contas de professores' })).toBeTruthy();
    expect(screen.getByLabelText('Ano letivo')).toBeTruthy();
    expect(screen.getByLabelText('Série')).toBeTruthy();
    expect(screen.getByLabelText('Matéria')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Matemática' })).toBeTruthy();
    expect(screen.queryByLabelText('ID da turma')).toBeNull();
    expect(screen.queryByLabelText('ID da matéria')).toBeNull();
    expect(screen.queryByLabelText('Ativação')).toBeNull();
    expect(screen.queryByLabelText('Matrícula')).toBeNull();

    await screen.findByRole('option', { name: '2026' });
    await user.selectOptions(screen.getByLabelText('Ano letivo'), '2026');
    await user.selectOptions(screen.getByLabelText('Série'), '9');
    await user.selectOptions(screen.getByLabelText('Matéria'), '7');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    await waitFor(() =>
      expect(accountService.loadAccountPage).toHaveBeenNthCalledWith(2, 'teacher', {
        classId: '44',
        subjectId: '7',
        page: 1,
        pageSize: 20,
      }),
    );

    unmount();
    vi.mocked(accountService.loadAccountPage).mockResolvedValue(page());
    renderAt('/admin/contas/administradores');

    expect(await screen.findByRole('heading', { name: 'Contas de administradores' })).toBeTruthy();
    expect(screen.getByLabelText('Buscar por nome ou e-mail')).toBeTruthy();
    expect(screen.queryByLabelText('Ativação')).toBeNull();
    expect(screen.queryByLabelText('Matrícula')).toBeNull();
    expect(screen.queryByLabelText('Ano letivo')).toBeNull();
    expect(screen.queryByLabelText('Série')).toBeNull();
    expect(screen.queryByLabelText('ID da matéria')).toBeNull();
  });

  it('shows student enrollment history as read-only detail', async () => {
    vi.mocked(accountService.loadAccountDetail).mockResolvedValue(studentDetail);
    renderAt('/admin/contas/alunos/101');

    expect(await screen.findByRole('heading', { name: 'Histórico de matrículas' })).toBeTruthy();
    expect(screen.getByText('01/02/2026')).toBeTruthy();
    expect(screen.getByText('15/12/2025')).toBeTruthy();
    expect(screen.getByText('8ª série · ano letivo 2025')).toBeTruthy();
    expect(
      within(screen.getByRole('region', { name: 'Histórico de matrículas' })).queryByRole('button'),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: /editar matrícula|excluir matrícula/i }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /excluir|desativar/i })).toBeNull();
    expect(screen.getByRole('link', { name: 'Editar conta' })).toBeTruthy();
  });

  it('opens the created account details and shows a success toast', async () => {
    vi.mocked(accountService.createAccount).mockResolvedValue('sent');
    vi.mocked(accountService.loadAccountPage).mockResolvedValue(page([createdStudent]));
    vi.mocked(accountService.loadAccountDetail).mockResolvedValue(createdStudentDetail);
    renderAt('/admin/contas/alunos/novo');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nome completo'), 'Katherine Johnson');
    await user.type(screen.getByLabelText('E-mail institucional'), 'katherine@example.test');
    await user.type(screen.getByLabelText('Telefone do responsável'), '555-0101');
    await user.click(screen.getByRole('button', { name: 'Cadastrar conta' }));

    expect(await screen.findByRole('heading', { name: 'Katherine Johnson' })).toBeTruthy();
    expect(
      await screen.findByText('Conta cadastrada com sucesso. Solicitação de ativação recebida.'),
    ).toBeTruthy();
    await waitFor(() =>
      expect(accountService.loadAccountPage).toHaveBeenCalledWith('student', {
        search: 'katherine@example.test',
        page: 1,
        pageSize: 20,
      }),
    );
    expect(accountService.createAccount).toHaveBeenCalledWith('student', {
      name: 'Katherine Johnson',
      email: 'katherine@example.test',
      guardianPhone: '555-0101',
    });
  });

  it('falls back to the filtered list if the created account cannot be found', async () => {
    vi.mocked(accountService.createAccount).mockResolvedValue('failed');
    vi.mocked(accountService.loadAccountPage).mockResolvedValue(page());
    renderAt('/admin/contas/alunos/novo');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nome completo'), 'Katherine Johnson');
    await user.type(screen.getByLabelText('E-mail institucional'), 'katherine@example.test');
    await user.type(screen.getByLabelText('Telefone do responsável'), '555-0101');
    await user.click(screen.getByRole('button', { name: 'Cadastrar conta' }));

    expect(await screen.findByRole('heading', { name: 'Contas de alunos' })).toBeTruthy();
    expect(
      await screen.findByText(
        'Conta cadastrada com sucesso, mas não foi possível enviar o link de ativação.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Buscar por nome ou e-mail')).toHaveProperty(
      'value',
      'katherine@example.test',
    );
  });

  it('requires current administrator password for email change and offers explicit activation resend', async () => {
    vi.mocked(accountService.loadAccountDetail)
      .mockResolvedValueOnce(teacher)
      .mockResolvedValueOnce(pendingTeacher);
    vi.mocked(accountService.updateAccount).mockResolvedValue(pendingTeacher);
    vi.mocked(accountService.resendActivation).mockResolvedValue('sent');
    renderAt('/admin/contas/professores/55/editar');
    const user = userEvent.setup();

    await user.clear(await screen.findByLabelText('E-mail institucional'));
    await user.type(screen.getByLabelText('E-mail institucional'), 'new-grace@example.test');
    const password = await screen.findByLabelText('Senha atual do administrador');
    await user.type(password, 'synthetic-current-password');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Dados da conta atualizados.')).toBeTruthy();
    expect(await screen.findByText(/A conta precisará ser ativada no novo endereço/)).toBeTruthy();
    expect(screen.getByText(/A alteração não confirma a entrega do e-mail/)).toBeTruthy();
    expect(accountService.updateAccount).toHaveBeenCalledWith('teacher', '55', {
      email: 'new-grace@example.test',
      currentPassword: 'synthetic-current-password',
    });

    await user.click(await screen.findByRole('button', { name: 'Reenviar ativação' }));
    expect(await screen.findByText('Solicitação de ativação recebida.')).toBeTruthy();
    expect(accountService.resendActivation).toHaveBeenCalledWith('55');
  });

  it('renders validated API field text as text and filters submitted email from the error', async () => {
    const markup = '<img src=x onerror=alert(1)>';
    vi.mocked(accountService.createAccount).mockRejectedValue(
      new ApiRequestError({
        status: 422,
        problem: {
          status: 422,
          title: 'Conteúdo inválido',
          detail: 'Falha ao validar katherine@example.test.',
          errors: [
            {
              code: 'INVALID_VALUE',
              detail: markup,
              source: { in: 'body', pointer: '/email' },
            },
          ],
        },
      }),
    );
    renderAt('/admin/contas/professores/novo');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nome completo'), 'Katherine Johnson');
    await user.type(screen.getByLabelText('E-mail institucional'), 'katherine@example.test');
    await user.click(screen.getByRole('button', { name: 'Cadastrar conta' }));

    const emailInput = screen.getByLabelText('E-mail institucional');
    expect(await screen.findByText(markup)).toBeTruthy();
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    expect(emailInput.getAttribute('aria-describedby')).toContain('account-email-error-0');
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('alert').textContent).not.toContain('katherine@example.test');
  });
});
