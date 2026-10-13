import { apiClient } from './client';

export type SimulationType = 'objetivo' | 'dissertativo';

export interface SimulationSubject {
  readonly subjectId: string;
  readonly totalQuestions: number;
  readonly weightPercent: number;
}

export interface Simulation {
  readonly simulationId: string;
  readonly classId: string;
  readonly number: number;
  readonly type: SimulationType;
  readonly bimester: number;
  readonly scheduledDate: string;
  readonly realizedAt: string | null;
  readonly subjects: readonly SimulationSubject[];
}

export interface SimulationInput {
  readonly type: SimulationType;
  readonly bimester: number;
  readonly scheduledDate: string;
  readonly subjects: readonly SimulationSubject[];
}

export interface SimulationFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly bimester?: number;
  readonly type?: SimulationType;
  readonly subjectId?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
}

export interface SimulationPage {
  readonly items: readonly Simulation[];
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  };
}

export interface OfferedSubject {
  readonly subjectId: string;
  readonly name: string;
  readonly description: string | null;
}

export interface SimulationWithEtag {
  readonly simulation: Simulation;
  /** The opaque strong ETag as received from the API response header. */
  readonly etag: string | undefined;
}

const classPath = (classId: string) => `/api/v1/admin/classes/${encodeURIComponent(classId)}`;
const simulationPath = (classId: string) => `${classPath(classId)}/simulations`;
const simulationItemPath = (classId: string, simulationId: string) =>
  `${simulationPath(classId)}/${encodeURIComponent(simulationId)}`;

export async function listOfferedSubjects(classId: string): Promise<OfferedSubject[]> {
  const response = await apiClient.get<{ readonly items: readonly OfferedSubject[] }>(
    `${classPath(classId)}/subjects`,
  );
  return [...response.data.items];
}

export async function listSimulations(
  classId: string,
  filters: SimulationFilters,
): Promise<SimulationPage> {
  const response = await apiClient.get<SimulationPage>(simulationPath(classId), {
    params: filters,
  });
  return response.data;
}

export async function listAllSimulationsForBimester(
  classId: string,
  bimester: number,
): Promise<Simulation[]> {
  const pageSize = 100;
  const first = await listSimulations(classId, { page: 1, pageSize, bimester });
  const items = [...first.items];
  for (let page = 2; page <= first.pagination.totalPages; page += 1) {
    const next = await listSimulations(classId, { page, pageSize, bimester });
    items.push(...next.items);
  }
  return items;
}

export async function getSimulation(
  classId: string,
  simulationId: string,
): Promise<SimulationWithEtag> {
  const response = await apiClient.get<Simulation>(simulationItemPath(classId, simulationId));
  return { simulation: response.data, etag: response.headers.etag };
}

export async function createSimulation(
  classId: string,
  input: SimulationInput,
): Promise<SimulationWithEtag> {
  const response = await apiClient.post<Simulation>(simulationPath(classId), input);
  return { simulation: response.data, etag: response.headers.etag };
}

export async function updateSimulation(
  classId: string,
  simulationId: string,
  input: SimulationInput,
  etag: string,
): Promise<SimulationWithEtag> {
  const response = await apiClient.patch<Simulation>(
    simulationItemPath(classId, simulationId),
    input,
    {
      headers: { 'If-Match': etag },
    },
  );
  return { simulation: response.data, etag: response.headers.etag };
}

export async function realizeSimulation(
  classId: string,
  simulationId: string,
  etag: string,
): Promise<SimulationWithEtag> {
  const response = await apiClient.post<Simulation>(
    `${simulationItemPath(classId, simulationId)}/realizations`,
    {},
    { headers: { 'If-Match': etag } },
  );
  return { simulation: response.data, etag: response.headers.etag };
}

export async function deleteSimulation(
  classId: string,
  simulationId: string,
  etag: string,
): Promise<void> {
  await apiClient.delete(simulationItemPath(classId, simulationId), {
    headers: { 'If-Match': etag },
  });
}
