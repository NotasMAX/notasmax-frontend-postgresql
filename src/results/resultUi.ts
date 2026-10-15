import type { SimulationResultStatus } from '../api/adminSimulationResults';
import type { BadgeTone } from '../components/Badge';

export function resultStatusLabel(status: SimulationResultStatus): string {
  if (status === 'assessed') return 'Avaliado';
  if (status === 'absent') return 'Ausente';
  return 'Pendente';
}

export function resultStatusTone(status: SimulationResultStatus): BadgeTone {
  if (status === 'assessed') return 'positive';
  if (status === 'absent') return 'warning';
  return 'neutral';
}

export function resultNumberLabel(value: number | null): string {
  return value === null
    ? '—'
    : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
