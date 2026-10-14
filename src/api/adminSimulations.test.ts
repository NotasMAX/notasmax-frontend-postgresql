// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import {
  createSimulation,
  deleteSimulation,
  getSimulation,
  listAllSimulationsForBimester,
  listOfferedSubjects,
  listSimulations,
  realizeSimulation,
  updateSimulation,
} from './adminSimulations';

vi.mock('./client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const simulation = {
  simulationId: '12',
  classId: '44',
  number: 3,
  type: 'objetivo' as const,
  bimester: 2,
  scheduledDate: '2026-10-13',
  realizedAt: null,
  subjects: [{ subjectId: '7', totalQuestions: 10, weightPercent: 25.5 }],
};
const opaqueEtag = '"opaque-validator-27"';

beforeEach(() => vi.resetAllMocks());

describe('simulation API boundary', () => {
  it('uses the class-scoped offer and list endpoints with supported query keys', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: { items: [{ subjectId: '7', name: 'Matemática', description: null }] },
      } as never)
      .mockResolvedValueOnce({
        data: {
          items: [simulation],
          pagination: { page: 2, pageSize: 20, totalItems: 22, totalPages: 2 },
        },
      } as never);

    await expect(listOfferedSubjects('44')).resolves.toEqual([
      { subjectId: '7', name: 'Matemática', description: null },
    ]);
    await expect(
      listSimulations('44', {
        page: 2,
        pageSize: 20,
        bimester: 2,
        type: 'objetivo',
        subjectId: '7',
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      }),
    ).resolves.toMatchObject({ items: [simulation], pagination: { page: 2 } });

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/admin/classes/44/subjects');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/admin/classes/44/simulations', {
      params: {
        page: 2,
        pageSize: 20,
        bimester: 2,
        type: 'objetivo',
        subjectId: '7',
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      },
    });
  });

  it('paginates all simulations for the advisory weight display', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: { items: [simulation], pagination: { totalPages: 2 } },
      } as never)
      .mockResolvedValueOnce({ data: { items: [], pagination: { totalPages: 2 } } } as never);

    await expect(listAllSimulationsForBimester('44', 2)).resolves.toEqual([simulation]);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/admin/classes/44/simulations', {
      params: { page: 1, pageSize: 100, bimester: 2 },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/admin/classes/44/simulations', {
      params: { page: 2, pageSize: 100, bimester: 2 },
    });
  });

  it('returns the detail ETag exactly as received and preserves the create payload and response', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: simulation,
      headers: { etag: opaqueEtag },
    } as never);
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: simulation,
      headers: { etag: opaqueEtag },
    } as never);
    const input = {
      type: 'objetivo' as const,
      bimester: 2,
      scheduledDate: '2026-10-13',
      subjects: [{ subjectId: '7', totalQuestions: 10, weightPercent: 25.5 }],
    };

    await expect(getSimulation('44', '12')).resolves.toEqual({ simulation, etag: opaqueEtag });
    await expect(createSimulation('44', input)).resolves.toEqual({ simulation, etag: opaqueEtag });
    expect(apiClient.post).toHaveBeenCalledOnce();
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/classes/44/simulations', input);
  });

  it('forwards the exact current ETag once for update and realization', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      data: simulation,
      headers: { etag: '"updated"' },
    } as never);
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: simulation,
      headers: { etag: '"realized"' },
    } as never);
    const input = {
      type: 'objetivo' as const,
      bimester: 2,
      scheduledDate: '2026-10-13',
      subjects: [{ subjectId: '7', totalQuestions: 10, weightPercent: 25.5 }],
    };

    await expect(updateSimulation('44', '12', input, opaqueEtag)).resolves.toEqual({
      simulation,
      etag: '"updated"',
    });
    await expect(realizeSimulation('44', '12', opaqueEtag)).resolves.toEqual({
      simulation,
      etag: '"realized"',
    });
    expect(apiClient.patch).toHaveBeenCalledOnce();
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/admin/classes/44/simulations/12', input, {
      headers: { 'If-Match': opaqueEtag },
    });
    expect(apiClient.post).toHaveBeenCalledOnce();
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/admin/classes/44/simulations/12/realizations',
      {},
      {
        headers: { 'If-Match': opaqueEtag },
      },
    );
  });

  it('sends one conditional delete and accepts the API 204 empty response', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204, data: undefined } as never);

    await expect(deleteSimulation('44', '12', opaqueEtag)).resolves.toBeUndefined();
    expect(apiClient.delete).toHaveBeenCalledOnce();
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/admin/classes/44/simulations/12', {
      headers: { 'If-Match': opaqueEtag },
    });
  });
});
