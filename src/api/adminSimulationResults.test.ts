// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import {
  getSimulationResult,
  listSimulationResults,
  updateSimulationResult,
} from './adminSimulationResults';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

beforeEach(() => vi.resetAllMocks());

describe('administrative simulation results API boundary', () => {
  const result = {
    simulationId: '8',
    studentId: '44',
    studentName: 'Ana Silva',
    subjectId: '9',
    subjectName: 'Matemática',
    status: 'assessed' as const,
    correctAnswers: 0,
    totalQuestions: 10,
    weightPercent: 25,
    score: 0,
    weightedContribution: 0,
  };

  it('forwards approved result filters and returns the paginated representation', async () => {
    const page = {
      items: [result],
      pagination: { page: 2, pageSize: 20, totalItems: 21, totalPages: 2 },
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: page } as never);

    await expect(
      listSimulationResults('7', '8', {
        page: 2,
        pageSize: 20,
        subjectId: '9',
        status: 'assessed',
        search: 'Ana',
      }),
    ).resolves.toEqual(page);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/classes/7/simulations/8/results', {
      params: { page: 2, pageSize: 20, subjectId: '9', status: 'assessed', search: 'Ana' },
    });
  });

  it('reads a result and preserves its opaque ETag exactly', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: result,
      headers: { etag: '"strong-validator/opaque"' },
    } as never);

    await expect(getSimulationResult('7', '8', '44', '9')).resolves.toEqual({
      result,
      etag: '"strong-validator/opaque"',
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/admin/classes/7/simulations/8/results/44/9',
    );
  });

  it('sends the selected transition once with the exact If-Match value', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { ...result, status: 'absent', correctAnswers: null, score: 0 },
      headers: { etag: '"next-version"' },
    } as never);

    await expect(
      updateSimulationResult(
        '7',
        '8',
        '44',
        '9',
        { status: 'absent' },
        '"strong-validator/opaque"',
      ),
    ).resolves.toMatchObject({ etag: '"next-version"' });
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/v1/admin/classes/7/simulations/8/results/44/9',
      { status: 'absent' },
      { headers: { 'If-Match': '"strong-validator/opaque"' } },
    );
  });

  it('does not proceed when a result response has no ETag', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: result, headers: {} } as never);

    await expect(getSimulationResult('7', '8', '44', '9')).rejects.toThrow(
      'Não foi possível confirmar se os dados estão atualizados.',
    );
  });
});
