import { apiClient } from './client';
import { requiredResponseEtag } from './responseEtag';

export type SimulationResultStatus = 'pending' | 'assessed' | 'absent';

export interface SimulationResult {
  readonly simulationId: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly status: SimulationResultStatus;
  readonly correctAnswers: number | null;
  readonly totalQuestions: number;
  readonly weightPercent: number;
  readonly score: number | null;
  readonly weightedContribution: number | null;
}

export interface SimulationResultPage {
  readonly items: readonly SimulationResult[];
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  };
}

export interface SimulationResultFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly subjectId?: string;
  readonly status?: SimulationResultStatus;
  readonly search?: string;
}

export type SimulationResultUpdate =
  { readonly status: 'assessed'; readonly correctAnswers: number } | { readonly status: 'absent' };

export interface SimulationResultWithEtag {
  readonly result: SimulationResult;
  /** Opaque strong ETag copied exactly from the response header. */
  readonly etag: string;
}

const simulationResultsPath = (classId: string, simulationId: string) =>
  `/api/v1/admin/classes/${encodeURIComponent(classId)}/simulations/${encodeURIComponent(simulationId)}/results`;

const resultPath = (classId: string, simulationId: string, studentId: string, subjectId: string) =>
  `${simulationResultsPath(classId, simulationId)}/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`;

export async function listSimulationResults(
  classId: string,
  simulationId: string,
  filters: SimulationResultFilters,
): Promise<SimulationResultPage> {
  const response = await apiClient.get<SimulationResultPage>(
    simulationResultsPath(classId, simulationId),
    { params: filters },
  );
  return response.data;
}

export async function getSimulationResult(
  classId: string,
  simulationId: string,
  studentId: string,
  subjectId: string,
): Promise<SimulationResultWithEtag> {
  const response = await apiClient.get<SimulationResult>(
    resultPath(classId, simulationId, studentId, subjectId),
  );
  return { result: response.data, etag: requiredResponseEtag(response.headers) };
}

export async function updateSimulationResult(
  classId: string,
  simulationId: string,
  studentId: string,
  subjectId: string,
  input: SimulationResultUpdate,
  etag: string,
): Promise<SimulationResultWithEtag> {
  const response = await apiClient.patch<SimulationResult>(
    resultPath(classId, simulationId, studentId, subjectId),
    input,
    { headers: { 'If-Match': etag } },
  );
  return { result: response.data, etag: requiredResponseEtag(response.headers) };
}
