// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import {
  createAdminClass,
  createAdminSubject,
  getAdminClass,
  listAdminClasses,
  listAdminSchoolYears,
  listAdminSubjects,
  loadAccountFilterOptions,
  updateAdminClass,
  updateAdminSubject,
} from './adminAcademicCatalog';

vi.mock('./client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('administrative account filter lookup boundary', () => {
  it('loads school years and maps classes to user-facing academic fields', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { items: [{ schoolYear: 2026 }] } } as never)
      .mockResolvedValueOnce({
        data: {
          items: [{ classId: '44', series: 9, schoolYear: 2026 }],
          pagination: { totalPages: 1 },
        },
      } as never);

    await expect(loadAccountFilterOptions('student')).resolves.toEqual({
      classes: [{ classId: '44', series: 9, schoolYear: 2026 }],
      subjects: [],
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/admin/school-years');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/admin/classes', {
      params: { schoolYear: 2026, page: 1, pageSize: 100 },
    });
  });

  it('loads subject names across paginated results for teacher filters', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { items: [{ schoolYear: 2026 }] } } as never)
      .mockResolvedValueOnce({
        data: {
          items: [{ classId: '44', series: 9, schoolYear: 2026 }],
          pagination: { totalPages: 1 },
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          items: [{ subjectId: '7', name: 'Matemática', description: null }],
          pagination: { totalPages: 2 },
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          items: [{ subjectId: '8', name: 'História', description: null }],
          pagination: { totalPages: 2 },
        },
      } as never);

    await expect(loadAccountFilterOptions('teacher')).resolves.toEqual({
      classes: [{ classId: '44', series: 9, schoolYear: 2026 }],
      subjects: [
        { subjectId: '7', name: 'Matemática', description: null },
        { subjectId: '8', name: 'História', description: null },
      ],
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(3, '/api/v1/admin/subjects', {
      params: { page: 1, pageSize: 100 },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(4, '/api/v1/admin/subjects', {
      params: { page: 2, pageSize: 100 },
    });
  });
});

describe('academic structure API boundary', () => {
  it('forwards subject search and pagination without changing the API representation', async () => {
    const data = {
      items: [{ subjectId: '7', name: 'Matemática', description: null }],
      pagination: { page: 2, pageSize: 20, totalItems: 21, totalPages: 2 },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data } as never);

    await expect(
      listAdminSubjects({ search: 'Matemática', page: 2, pageSize: 20 }),
    ).resolves.toEqual(data);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/subjects', {
      params: { search: 'Matemática', page: 2, pageSize: 20 },
    });
  });

  it('forwards class school-year selection and returns the API page', async () => {
    const data = {
      items: [{ classId: '44', series: 2, schoolYear: 2026 }],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data } as never);

    await expect(listAdminClasses({ schoolYear: 2026, page: 1, pageSize: 20 })).resolves.toEqual(
      data,
    );
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/classes', {
      params: { schoolYear: 2026, page: 1, pageSize: 20 },
    });
  });

  it('loads the school-year choices from the existing endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { items: [{ schoolYear: 2026 }, { schoolYear: 2025 }] },
    } as never);

    await expect(listAdminSchoolYears()).resolves.toEqual([2026, 2025]);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/school-years');
  });

  it('preserves the detail ETag exactly and sends it in If-Match for class edits', async () => {
    const etag = '"class-detail-opaque-value"';
    const schoolClass = { classId: '44', series: 2, schoolYear: 2026, startDate: '2026-02-01' };
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: schoolClass,
      headers: { etag },
    } as never);
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: schoolClass } as never);

    await expect(getAdminClass('44')).resolves.toEqual({ schoolClass, etag });
    await updateAdminClass('44', { series: 3, schoolYear: 2026 }, etag);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/classes/44');
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/v1/admin/classes/44',
      { series: 3, schoolYear: 2026 },
      { headers: { 'If-Match': etag } },
    );
  });

  it('sends class date-only input unchanged and uses the subject create/update contracts', async () => {
    const schoolClass = { classId: '44', series: 2, schoolYear: 2026, startDate: '2026-02-01' };
    const subject = { subjectId: '7', name: 'Matemática', description: null };
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: schoolClass } as never)
      .mockResolvedValueOnce({ data: subject } as never);
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: subject } as never);

    await createAdminClass({ series: 2, schoolYear: 2026, startDate: '2026-02-01' });
    await createAdminSubject({ name: 'Matemática' });
    await updateAdminSubject('7', { name: 'Matemática', description: null });

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/v1/admin/classes', {
      series: 2,
      schoolYear: 2026,
      startDate: '2026-02-01',
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/api/v1/admin/subjects', {
      name: 'Matemática',
    });
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/admin/subjects/7', {
      name: 'Matemática',
      description: null,
    });
  });

  it('sends selected class IDs and opaque ETags in one class creation request', async () => {
    const schoolClass = {
      classId: 'new-class',
      series: 1,
      schoolYear: 2026,
      startDate: '2026-02-01',
    };
    const closeClassIds = [
      { classId: 'prior-a', etag: '"opaque-v/2025-a"' },
      { classId: 'prior-b', etag: '"opaque-v/2025-b"' },
    ];
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: schoolClass } as never);

    await createAdminClass({ series: 1, schoolYear: 2026, startDate: '2026-02-01', closeClassIds });

    expect(apiClient.post).toHaveBeenCalledOnce();
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/classes', {
      series: 1,
      schoolYear: 2026,
      startDate: '2026-02-01',
      closeClassIds,
    });
  });
});
