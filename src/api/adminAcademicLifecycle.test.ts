// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import {
  addAdminClassSubject,
  addAdminOfferTeacher,
  cancelAdminEnrollment,
  closeAdminClass,
  createAdminEnrollment,
  getAdminClassSubjects,
  getAdminEnrollment,
  getAdminOfferTeachers,
  removeAdminClassSubject,
  removeAdminOfferTeacher,
} from './adminAcademicLifecycle';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => vi.resetAllMocks());

describe('academic lifecycle API boundary', () => {
  it('reads offer and teacher collections with their independent opaque ETags', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: { items: [{ subjectId: '5', name: 'Matemática', description: null }] },
        headers: { etag: '"offer-list-v1"' },
      } as never)
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              teacherId: '8',
              name: 'Ana',
              email: 'ana@example.test',
              activationStatus: 'activated',
            },
          ],
        },
        headers: { etag: '"teacher-list-v2"' },
      } as never);

    await expect(getAdminClassSubjects('4')).resolves.toMatchObject({ etag: '"offer-list-v1"' });
    await expect(getAdminOfferTeachers('4', '5')).resolves.toMatchObject({
      etag: '"teacher-list-v2"',
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/admin/classes/4/subjects');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/admin/classes/4/subjects/5/teachers');
  });

  it('sends offers and teacher associations with the exact collection If-Match value', async () => {
    await addAdminClassSubject('4', '5', '"offer-current"');
    await removeAdminClassSubject('4', '5', '"offer-current"');
    await addAdminOfferTeacher('4', '5', '8', '"teachers-current"');
    await removeAdminOfferTeacher('4', '5', '8', '"teachers-current"');

    expect(apiClient.put).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/classes/4/subjects/5',
      undefined,
      { headers: { 'If-Match': '"offer-current"' } },
    );
    expect(apiClient.delete).toHaveBeenNthCalledWith(1, '/api/v1/admin/classes/4/subjects/5', {
      headers: { 'If-Match': '"offer-current"' },
    });
    expect(apiClient.put).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/classes/4/subjects/5/teachers/8',
      undefined,
      { headers: { 'If-Match': '"teachers-current"' } },
    );
    expect(apiClient.delete).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/classes/4/subjects/5/teachers/8',
      { headers: { 'If-Match': '"teachers-current"' } },
    );
  });

  it('closes a class once with its current detail ETag', async () => {
    await closeAdminClass('4/unsafe', '"class-current"');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/admin/classes/4%2Funsafe/close',
      undefined,
      { headers: { 'If-Match': '"class-current"' } },
    );
  });

  it('starts enrollment without If-Match and sends the confirmed renewal with it', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { enrollmentId: '51' } } as never)
      .mockResolvedValueOnce({ data: { enrollmentId: '52' } } as never);

    await createAdminEnrollment('4', { studentId: '8', startDate: '2027-02-01' });
    await createAdminEnrollment(
      '4',
      { studentId: '8', startDate: '2027-02-01', confirmPreviousEnrollmentId: '51' },
      '"enrollment-current"',
    );

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/classes/4/enrollments',
      { studentId: '8', startDate: '2027-02-01' },
      undefined,
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/classes/4/enrollments',
      { studentId: '8', startDate: '2027-02-01', confirmPreviousEnrollmentId: '51' },
      { headers: { 'If-Match': '"enrollment-current"' } },
    );
  });

  it('reads an enrollment ETag and sends the date-only cancellation payload', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        enrollmentId: '51',
        studentId: '8',
        classId: '4',
        startDate: '2026-02-01',
        cancellationDate: null,
        cancellationRequestedAt: null,
      },
      headers: { etag: '"enrollment-current"' },
    } as never);

    await expect(getAdminEnrollment('51')).resolves.toMatchObject({ etag: '"enrollment-current"' });
    await cancelAdminEnrollment('51', '2026-10-20', '"enrollment-current"');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/enrollments/51');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/admin/enrollments/51/cancellations',
      { cancellationDate: '2026-10-20' },
      { headers: { 'If-Match': '"enrollment-current"' } },
    );
  });

  it('sends an empty cancellation payload for an enrollment cancelled before it starts', async () => {
    await cancelAdminEnrollment('51', undefined, '"enrollment-current"');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/admin/enrollments/51/cancellations',
      {},
      { headers: { 'If-Match': '"enrollment-current"' } },
    );
  });
});
