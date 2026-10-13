import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as accountApi from '../api/adminAccounts';
import {
  accountIdentifier,
  createAccount,
  findAccountIdentifierByEmail,
  loadAccountDetail,
  loadAccountPage,
  resendActivation,
  updateAccount,
} from './accountService';

vi.mock('../api/adminAccounts', () => ({
  createAdministratorAccount: vi.fn(),
  createStudentAccount: vi.fn(),
  createTeacherAccount: vi.fn(),
  getAdministratorAccount: vi.fn(),
  getStudentAccount: vi.fn(),
  getTeacherAccount: vi.fn(),
  listAdministratorAccounts: vi.fn(),
  listStudentAccounts: vi.fn(),
  listTeacherAccounts: vi.fn(),
  resendAccountActivation: vi.fn(),
  updateAdministratorAccount: vi.fn(),
  updateStudentAccount: vi.fn(),
  updateTeacherAccount: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe('account service profile routing', () => {
  it('delegates account list requests to the matching profile API', async () => {
    const studentFilters = { search: 'Ada', page: 1, pageSize: 20 };
    const teacherFilters = { search: 'Grace', subjectId: '7', page: 1, pageSize: 20 };
    const administratorFilters = { search: 'Katherine', page: 1, pageSize: 20 };
    const result = {
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    };
    vi.mocked(accountApi.listStudentAccounts).mockResolvedValue(result);
    vi.mocked(accountApi.listTeacherAccounts).mockResolvedValue(result);
    vi.mocked(accountApi.listAdministratorAccounts).mockResolvedValue(result);

    await loadAccountPage('student', studentFilters);
    await loadAccountPage('teacher', teacherFilters);
    await loadAccountPage('administrator', administratorFilters);

    expect(accountApi.listStudentAccounts).toHaveBeenCalledWith(studentFilters);
    expect(accountApi.listTeacherAccounts).toHaveBeenCalledWith(teacherFilters);
    expect(accountApi.listAdministratorAccounts).toHaveBeenCalledWith(administratorFilters);
  });

  it('delegates detail requests to the matching profile API', async () => {
    vi.mocked(accountApi.getStudentAccount).mockResolvedValue({} as never);
    vi.mocked(accountApi.getTeacherAccount).mockResolvedValue({} as never);
    vi.mocked(accountApi.getAdministratorAccount).mockResolvedValue({} as never);

    await loadAccountDetail('student', '101');
    await loadAccountDetail('teacher', '202');
    await loadAccountDetail('administrator', '303');

    expect(accountApi.getStudentAccount).toHaveBeenCalledWith('101');
    expect(accountApi.getTeacherAccount).toHaveBeenCalledWith('202');
    expect(accountApi.getAdministratorAccount).toHaveBeenCalledWith('303');
  });

  it('delegates account creation and returns each activation email status', async () => {
    const studentInput = { name: 'Ada', email: 'ada@example.test', guardianPhone: '555-0100' };
    const personInput = { name: 'Grace', email: 'grace@example.test' };
    vi.mocked(accountApi.createStudentAccount).mockResolvedValue({ activationEmailStatus: 'sent' });
    vi.mocked(accountApi.createTeacherAccount).mockResolvedValue({
      activationEmailStatus: 'failed',
    });
    vi.mocked(accountApi.createAdministratorAccount).mockResolvedValue({
      activationEmailStatus: 'sent',
    });

    await expect(createAccount('student', studentInput)).resolves.toBe('sent');
    await expect(createAccount('teacher', personInput)).resolves.toBe('failed');
    await expect(createAccount('administrator', personInput)).resolves.toBe('sent');

    expect(accountApi.createStudentAccount).toHaveBeenCalledWith(studentInput);
    expect(accountApi.createTeacherAccount).toHaveBeenCalledWith(personInput);
    expect(accountApi.createAdministratorAccount).toHaveBeenCalledWith(personInput);
  });

  it('delegates account updates to the matching profile API', async () => {
    const changes = { name: 'Updated name' };
    vi.mocked(accountApi.updateStudentAccount).mockResolvedValue({} as never);
    vi.mocked(accountApi.updateTeacherAccount).mockResolvedValue({} as never);
    vi.mocked(accountApi.updateAdministratorAccount).mockResolvedValue({} as never);

    await updateAccount('student', '101', changes);
    await updateAccount('teacher', '202', changes);
    await updateAccount('administrator', '303', changes);

    expect(accountApi.updateStudentAccount).toHaveBeenCalledWith('101', changes);
    expect(accountApi.updateTeacherAccount).toHaveBeenCalledWith('202', changes);
    expect(accountApi.updateAdministratorAccount).toHaveBeenCalledWith('303', changes);
  });

  it('finds identifiers by normalized email and returns null when there is no match', async () => {
    vi.mocked(accountApi.listTeacherAccounts).mockResolvedValue({
      items: [
        {
          teacherId: '202',
          name: 'Grace Hopper',
          email: 'GRACE@example.test',
          activationStatus: 'pending',
        },
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    vi.mocked(accountApi.listStudentAccounts).mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });

    await expect(findAccountIdentifierByEmail('teacher', ' grace@example.test ')).resolves.toBe(
      '202',
    );
    await expect(findAccountIdentifierByEmail('student', 'missing@example.test')).resolves.toBe(
      null,
    );
    expect(accountApi.listTeacherAccounts).toHaveBeenCalledWith({
      search: ' grace@example.test ',
      page: 1,
      pageSize: 20,
    });
  });

  it('returns the identifier for each account profile and delegates activation resend', async () => {
    expect(
      accountIdentifier({
        studentId: '101',
        name: 'Ada',
        email: 'ada@example.test',
        activationStatus: 'activated',
        enrollmentStatus: 'active',
        currentClass: null,
      }),
    ).toBe('101');
    expect(
      accountIdentifier({
        teacherId: '202',
        name: 'Grace',
        email: 'grace@example.test',
        activationStatus: 'pending',
      }),
    ).toBe('202');
    expect(
      accountIdentifier({
        administratorId: '303',
        name: 'Katherine',
        email: 'katherine@example.test',
        activationStatus: 'activated',
      }),
    ).toBe('303');

    vi.mocked(accountApi.resendAccountActivation).mockResolvedValue('failed');
    await expect(resendActivation('202')).resolves.toBe('failed');
    expect(accountApi.resendAccountActivation).toHaveBeenCalledWith('202');
  });
});
