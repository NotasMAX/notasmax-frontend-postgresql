import { apiClient } from './client';

export interface AdminClassOption {
  readonly classId: string;
  readonly series: number;
  readonly schoolYear: number;
}

export interface AdminSubjectOption {
  readonly subjectId: string;
  readonly name: string;
  readonly description: string | null;
}

interface PaginatedItems<TItem> {
  readonly items: readonly TItem[];
  readonly pagination: {
    readonly totalPages: number;
  };
}

interface SchoolYearList {
  readonly items: readonly { readonly schoolYear: number }[];
}

export interface AccountFilterOptions {
  readonly classes: readonly AdminClassOption[];
  readonly subjects: readonly AdminSubjectOption[];
}

async function listClassesForSchoolYear(schoolYear: number): Promise<AdminClassOption[]> {
  const response = await apiClient.get<PaginatedItems<AdminClassOption>>(
    '/api/v1/admin/classes',
    { params: { schoolYear, page: 1, pageSize: 100 } },
  );
  const classes = [...response.data.items];

  for (let page = 2; page <= response.data.pagination.totalPages; page += 1) {
    const next = await apiClient.get<PaginatedItems<AdminClassOption>>(
      '/api/v1/admin/classes',
      { params: { schoolYear, page, pageSize: 100 } },
    );
    classes.push(...next.data.items);
  }

  return classes;
}

async function listAllSubjects(): Promise<AdminSubjectOption[]> {
  const pageSize = 100;
  const first = await apiClient.get<PaginatedItems<AdminSubjectOption>>(
    '/api/v1/admin/subjects',
    { params: { page: 1, pageSize } },
  );
  const subjects = [...first.data.items];

  for (let page = 2; page <= first.data.pagination.totalPages; page += 1) {
    const next = await apiClient.get<PaginatedItems<AdminSubjectOption>>(
      '/api/v1/admin/subjects',
      { params: { page, pageSize } },
    );
    subjects.push(...next.data.items);
  }

  return subjects;
}

export async function loadAccountFilterOptions(
  profile: 'student' | 'teacher',
): Promise<AccountFilterOptions> {
  const yearsResponse = await apiClient.get<SchoolYearList>('/api/v1/admin/school-years');
  const classesByYear = await Promise.all(
    yearsResponse.data.items.map(({ schoolYear }) => listClassesForSchoolYear(schoolYear)),
  );
  const classes = classesByYear.flat();
  const subjects = profile === 'teacher' ? await listAllSubjects() : [];

  return { classes, subjects };
}
