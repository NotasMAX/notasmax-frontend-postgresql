import type { Simulation, SimulationSubject } from '../api/adminSimulations';

export interface SimulationSubjectDraft {
  readonly subjectId: string;
  readonly totalQuestions: string;
  readonly weightPercent: string;
}

export interface SimulationFormDraft {
  readonly type: '' | 'objetivo' | 'dissertativo';
  readonly bimester: string;
  readonly scheduledDate: string;
  readonly subjects: readonly SimulationSubjectDraft[];
}

export interface SimulationFiltersDraft {
  readonly bimester: string;
  readonly type: '' | 'objetivo' | 'dissertativo';
  readonly subjectId: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly pageSize: number;
}

export function emptySimulationFilters(): SimulationFiltersDraft {
  return { bimester: '', type: '', subjectId: '', fromDate: '', toDate: '', pageSize: 20 };
}

export function defaultSimulationDraft(today = localCivilDate()): SimulationFormDraft {
  return { type: '', bimester: '1', scheduledDate: today, subjects: [] };
}

export function draftFromSimulation(simulation: Simulation): SimulationFormDraft {
  return {
    type: simulation.type,
    bimester: String(simulation.bimester),
    scheduledDate: simulation.scheduledDate,
    subjects: simulation.subjects.map((subject) => ({
      subjectId: subject.subjectId,
      totalQuestions: String(subject.totalQuestions),
      weightPercent: String(subject.weightPercent),
    })),
  };
}

export function completeSubjectSelection(
  subjects: readonly { readonly subjectId: string }[],
): SimulationSubjectDraft[] {
  return subjects.map(({ subjectId }) => ({
    subjectId,
    totalQuestions: '1',
    weightPercent: '100',
  }));
}

export function asSimulationSubjects(
  subjects: readonly SimulationSubjectDraft[],
): SimulationSubject[] | undefined {
  if (subjects.length === 0) return undefined;
  const result: SimulationSubject[] = [];
  for (const subject of subjects) {
    const questions = Number(subject.totalQuestions);
    const weight = Number(subject.weightPercent.replace(',', '.'));
    if (!Number.isSafeInteger(questions) || questions <= 0) return undefined;
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) return undefined;
    if (!/^(?:\d{1,3})(?:[.,]\d{1,2})?$/.test(subject.weightPercent)) return undefined;
    if (Math.round(weight * 100) !== weight * 100) return undefined;
    result.push({ subjectId: subject.subjectId, totalQuestions: questions, weightPercent: weight });
  }
  return result;
}

export function allocatedWeight(
  simulations: readonly Simulation[],
  subjectId: string,
  bimester: number,
  exceptSimulationId?: string,
): number {
  const totalBasisPoints = simulations.reduce((sum, simulation) => {
    if (simulation.simulationId === exceptSimulationId || simulation.bimester !== bimester)
      return sum;
    const subject = simulation.subjects.find((item) => item.subjectId === subjectId);
    return sum + (subject ? Math.round(subject.weightPercent * 100) : 0);
  }, 0);
  return totalBasisPoints / 100;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2).replace('.', ',')}%`;
}

export function localCivilDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isPastCivilDate(value: string, today = localCivilDate()): boolean {
  return value !== '' && value < today;
}
