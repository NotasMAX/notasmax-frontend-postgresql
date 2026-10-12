// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import { loadAccountFilterOptions } from './adminAcademicCatalog';

vi.mock('./client', () => ({
  apiClient: { get: vi.fn() },
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
