// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAcademicClassWithClosures,
  prepareClassClosureSelection,
} from './academicLifecycleService';
import * as catalogApi from '../api/adminAcademicCatalog';

vi.mock('../api/adminAcademicCatalog', () => ({
  createAdminClass: vi.fn(),
  getAdminClass: vi.fn(),
  listAllAdminSubjects: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe('selected prior-year class closure boundary', () => {
  it('loads each selected class and preserves its exact opaque ETag alongside its ID', async () => {
    vi.mocked(catalogApi.getAdminClass).mockImplementation(async (classId) => ({
      schoolClass: { classId, series: 1, schoolYear: 2025, startDate: '2025-02-01', isClosed: false },
      etag: classId === 'prior-a' ? '"opaque-v/2025-a"' : '"opaque-v/2025-b"',
    }));

    await expect(prepareClassClosureSelection(['prior-a', 'prior-b'])).resolves.toEqual([
      { classId: 'prior-a', etag: '"opaque-v/2025-a"' },
      { classId: 'prior-b', etag: '"opaque-v/2025-b"' },
    ]);
    expect(catalogApi.getAdminClass).toHaveBeenNthCalledWith(1, 'prior-a');
    expect(catalogApi.getAdminClass).toHaveBeenNthCalledWith(2, 'prior-b');
  });

  it('delegates all selected closures as one creation operation', async () => {
    const input = { series: 1, schoolYear: 2026, startDate: '2026-02-01' };
    const closures = [
      { classId: 'prior-a', etag: '"opaque-v/2025-a"' },
      { classId: 'prior-b', etag: '"opaque-v/2025-b"' },
    ];
    vi.mocked(catalogApi.createAdminClass).mockResolvedValue({
      classId: 'new-class',
      ...input,
      isClosed: false,
    });

    await createAcademicClassWithClosures(input, closures);

    expect(catalogApi.createAdminClass).toHaveBeenCalledOnce();
    expect(catalogApi.createAdminClass).toHaveBeenCalledWith({ ...input, closeClassIds: closures });
  });
});
