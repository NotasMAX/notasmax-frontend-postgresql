// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Simulation } from '../api/adminSimulations';
import {
  allocatedWeight,
  asSimulationSubjects,
  completeSubjectSelection,
  draftFromSimulation,
  formatPercent,
  isPastCivilDate,
  localCivilDate,
} from './simulationUi';

const makeSimulation = (
  simulationId: string,
  bimester: number,
  subjectId: string,
  weightPercent: number,
): Simulation => ({
  simulationId,
  classId: '44',
  number: Number(simulationId),
  type: 'objetivo',
  bimester,
  scheduledDate: '2026-10-13',
  realizedAt: null,
  subjects: [{ subjectId, totalQuestions: 10, weightPercent }],
});

describe('simulation form display helpers', () => {
  it('selects each offered subject initially and restores no teacher data', () => {
    expect(completeSubjectSelection([{ subjectId: '7' }, { subjectId: '8' }])).toEqual([
      { subjectId: '7', totalQuestions: '1', weightPercent: '100' },
      { subjectId: '8', totalQuestions: '1', weightPercent: '100' },
    ]);
  });

  it('validates question counts and two-decimal percentage granularity', () => {
    expect(
      asSimulationSubjects([{ subjectId: '7', totalQuestions: '10', weightPercent: '12.34' }]),
    ).toEqual([{ subjectId: '7', totalQuestions: 10, weightPercent: 12.34 }]);
    expect(
      asSimulationSubjects([{ subjectId: '7', totalQuestions: '0', weightPercent: '12.34' }]),
    ).toBeUndefined();
    expect(
      asSimulationSubjects([{ subjectId: '7', totalQuestions: '10', weightPercent: '12.345' }]),
    ).toBeUndefined();
    expect(asSimulationSubjects([])).toBeUndefined();
  });

  it('shows precise remaining weight and excludes the current simulation when editing', () => {
    const existing = [
      makeSimulation('1', 2, '7', 25.25),
      makeSimulation('2', 2, '7', 15.5),
      makeSimulation('3', 1, '7', 90),
    ];
    expect(allocatedWeight(existing, '7', 2)).toBe(40.75);
    expect(allocatedWeight(existing, '7', 2, '1')).toBe(15.5);
    expect(formatPercent(100 - allocatedWeight(existing, '7', 2, '1'))).toBe('84,50%');
  });

  it('retains API civil-date strings and compares date-only values without timezone conversion', () => {
    const simulation = makeSimulation('1', 2, '7', 25.25);
    expect(draftFromSimulation(simulation).scheduledDate).toBe('2026-10-13');
    expect(isPastCivilDate('2026-10-12', '2026-10-13')).toBe(true);
    expect(isPastCivilDate('2026-10-13', '2026-10-13')).toBe(false);
    expect(localCivilDate(new Date(2026, 9, 13, 23, 30))).toBe('2026-10-13');
  });
});
