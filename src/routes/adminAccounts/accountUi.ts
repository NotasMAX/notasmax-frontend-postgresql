import {
  GENERIC_API_ERROR_MESSAGE,
  getApiProblemPresentation,
  type ApiProblemFieldError,
} from '../../api/problemDetails';
import type {
  AccountProfile,
  ActivationEmailStatus,
  AccountFilters,
  StudentEnrollmentStatus,
  AccountActivationStatus,
} from '../../api/adminAccounts';
import type { AdminClassOption } from '../../api/adminAcademicCatalog';
import type { BadgeTone } from '../../components/Badge';

export const ACCOUNT_PROFILE_PATHS: Readonly<Record<AccountProfile, string>> = {
  student: 'alunos',
  teacher: 'professores',
  administrator: 'administradores',
};

export const ACCOUNT_PROFILE_LABELS: Readonly<Record<AccountProfile, string>> = {
  student: 'Alunos',
  teacher: 'Professores',
  administrator: 'Administradores',
};

export function accountProfileFromPath(value: string | undefined): AccountProfile | undefined {
  switch (value) {
    case 'alunos':
      return 'student';
    case 'professores':
      return 'teacher';
    case 'administradores':
      return 'administrator';
    default:
      return undefined;
  }
}

export function accountCollectionPath(profile: AccountProfile): string {
  return '/admin/contas/' + ACCOUNT_PROFILE_PATHS[profile];
}

export function accountTitle(profile: AccountProfile): string {
  return 'Contas de ' + ACCOUNT_PROFILE_LABELS[profile].toLocaleLowerCase('pt-BR');
}

export function activationStatusLabel(status: AccountActivationStatus): string {
  return status === 'activated' ? 'Ativada' : 'Pendente de ativação';
}

export function activationStatusTone(status: AccountActivationStatus): BadgeTone {
  return status === 'activated' ? 'positive' : 'warning';
}

export function enrollmentStatusLabel(status: StudentEnrollmentStatus): string {
  return status === 'active' ? 'Com matrícula ativa' : 'Sem matrícula ativa';
}

export function classLabel(classInfo: {
  readonly series: number;
  readonly schoolYear: number;
}): string {
  return classInfo.series + 'ª série · ano letivo ' + classInfo.schoolYear;
}

export function civilDateLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? match[3] + '/' + match[2] + '/' + match[1] : value;
}

export function activationFeedback(status: ActivationEmailStatus): string {
  return status === 'sent'
    ? 'Solicitação de ativação recebida.'
    : 'Não foi possível enviar o link. Tente novamente.';
}

export function accountCreatedFeedback(status: ActivationEmailStatus): string {
  return status === 'sent'
    ? 'Conta cadastrada com sucesso. Solicitação de ativação recebida.'
    : 'Conta cadastrada com sucesso, mas não foi possível enviar o link de ativação.';
}

export interface AccountFilterDraft {
  readonly search: string;
  readonly activationStatus: '' | AccountActivationStatus;
  readonly enrollmentStatus: '' | StudentEnrollmentStatus;
  readonly schoolYear: string;
  readonly series: string;
  readonly subjectId: string;
  readonly pageSize: number;
}

export function buildAccountFilters(
  profile: AccountProfile,
  draft: AccountFilterDraft,
  page: number,
  classes: readonly AdminClassOption[] = [],
): AccountFilters {
  const common = {
    ...(draft.search.trim() ? { search: draft.search.trim() } : {}),
    page,
    pageSize: draft.pageSize,
  };
  const selectedClass =
    draft.schoolYear && draft.series
      ? classes.find(
          (item) =>
            item.schoolYear === Number(draft.schoolYear) && item.series === Number(draft.series),
        )
      : undefined;
  if (profile === 'student') {
    return {
      ...common,
      ...(draft.activationStatus ? { activationStatus: draft.activationStatus } : {}),
      ...(draft.enrollmentStatus ? { enrollmentStatus: draft.enrollmentStatus } : {}),
      ...(selectedClass ? { classId: selectedClass.classId } : {}),
    };
  }
  if (profile === 'teacher') {
    return {
      ...common,
      ...(selectedClass ? { classId: selectedClass.classId } : {}),
      ...(draft.subjectId.trim() ? { subjectId: draft.subjectId.trim() } : {}),
    };
  }
  return common;
}

export type AccountFormField =
  'name' | 'email' | 'contactPhone' | 'guardianPhone' | 'currentPassword';

export interface AccountFormErrors {
  readonly messages: readonly string[];
  readonly fields: Readonly<Record<AccountFormField, readonly string[]>>;
}

const fieldForPointer: Readonly<Record<string, AccountFormField>> = {
  '/name': 'name',
  '/email': 'email',
  '/contactPhone': 'contactPhone',
  '/guardianPhone': 'guardianPhone',
  '/currentPassword': 'currentPassword',
};

function accountFieldForProblem(error: ApiProblemFieldError): AccountFormField | undefined {
  return error.source.in === 'body' ? fieldForPointer[error.source.pointer] : undefined;
}

export function getAccountFormErrors(
  error: unknown,
  visibleFields: readonly AccountFormField[],
  sensitiveValues: readonly string[],
): AccountFormErrors {
  const presentation = getApiProblemPresentation(error, sensitiveValues);
  const fields: Record<AccountFormField, string[]> = {
    name: [],
    email: [],
    contactPhone: [],
    guardianPhone: [],
    currentPassword: [],
  };
  const messages = presentation.message === undefined ? [] : [presentation.message];

  for (const fieldError of presentation.fieldErrors) {
    const field = accountFieldForProblem(fieldError);
    if (field !== undefined && visibleFields.includes(field)) {
      fields[field].push(fieldError.detail);
    } else {
      messages.push(fieldError.detail);
    }
  }
  return { messages, fields };
}

export function accountErrorMessage(
  error: unknown,
  sensitiveValues: readonly string[] = [],
): string {
  return getApiProblemPresentation(error, sensitiveValues).message ?? GENERIC_API_ERROR_MESSAGE;
}
