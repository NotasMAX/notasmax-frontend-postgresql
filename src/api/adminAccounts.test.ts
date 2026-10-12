// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import {
  createAdministratorAccount,
  createStudentAccount,
  getStudentAccount,
  listAdministratorAccounts,
  listStudentAccounts,
  listTeacherAccounts,
  resendAccountActivation,
  updateStudentAccount,
} from './adminAccounts';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('administrative account API boundary', () => {
  it('uses only the student list contract filters and preserves the paginated envelope', async () => {
    const result = {
      items: [
        {
          studentId: '101',
          name: 'Ada Lovelace',
          email: 'ada@example.test',
          activationStatus: 'activated',
          enrollmentStatus: 'active',
          currentClass: { series: 9, schoolYear: 2026 },
        },
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: result } as never);
    const filters = {
      search: 'Ada',
      activationStatus: 'activated' as const,
      enrollmentStatus: 'active' as const,
      classId: '42',
      page: 1,
      pageSize: 20,
    };

    await expect(listStudentAccounts(filters)).resolves.toEqual(result);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/students', { params: filters });
  });

  it('uses the supported teacher and administrator list endpoints', async () => {
    const result = {
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: result } as never);

    await listTeacherAccounts({
      search: 'Grace',
      classId: '9',
      subjectId: '7',
      page: 1,
      pageSize: 20,
    });
    await listAdministratorAccounts({ search: 'Ada', page: 1, pageSize: 20 });

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/admin/teachers', {
      params: { search: 'Grace', classId: '9', subjectId: '7', page: 1, pageSize: 20 },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/admin/administrators', {
      params: { search: 'Ada', page: 1, pageSize: 20 },
    });
  });

  it('uses the student create, detail, and patch contracts without assuming a created ID', async () => {
    const created = { activationEmailStatus: 'failed' as const };
    const detail = {
      studentId: '101',
      name: 'Ada Lovelace',
      email: 'ada@example.test',
      activationStatus: 'pending' as const,
      guardianPhone: '555-0100',
      enrollmentStatus: 'no_active_enrollment' as const,
      currentClass: null,
      enrollments: [],
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: created } as never);
    vi.mocked(apiClient.get).mockResolvedValue({ data: detail } as never);
    vi.mocked(apiClient.patch).mockResolvedValue({ data: detail } as never);
    const input = {
      name: 'Ada Lovelace',
      email: 'ada@example.test',
      guardianPhone: '555-0100',
    };

    await expect(createStudentAccount(input)).resolves.toEqual(created);
    await expect(getStudentAccount('101')).resolves.toEqual(detail);
    await expect(
      updateStudentAccount('101', {
        email: 'ada.new@example.test',
        currentPassword: 'synthetic-password-value',
      }),
    ).resolves.toEqual(detail);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/students', input);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/students/101');
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/admin/students/101', {
      email: 'ada.new@example.test',
      currentPassword: 'synthetic-password-value',
    });
  });

  it('uses the administrator create and explicit activation-resend endpoints', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { activationEmailStatus: 'sent' } } as never)
      .mockResolvedValueOnce({ data: { activationEmailStatus: 'failed' } } as never);

    await expect(
      createAdministratorAccount({ name: 'Grace Hopper', email: 'grace@example.test' }),
    ).resolves.toEqual({ activationEmailStatus: 'sent' });
    await expect(resendAccountActivation('101')).resolves.toBe('failed');

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/v1/admin/administrators', {
      name: 'Grace Hopper',
      email: 'grace@example.test',
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/api/v1/admin/users/101/activation-resends');
  });
});
