import { apiClient } from './client';
import { requiredResponseEtag } from './responseEtag';

const catalogPageSize = 100;

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

export interface AdminClass extends AdminClassOption {
  readonly startDate: string;
}

export interface AdminSubjectCreateInput {
  readonly name: string;
  readonly description?: string;
}

export interface AdminSubjectPatchInput {
  readonly name: string;
  readonly description?: string | null;
}

export interface AdminClassInput {
  readonly series: number;
  readonly schoolYear: number;
  readonly startDate: string;
  readonly closeClassIds?: readonly { readonly classId: string; readonly etag: string }[];
}

export interface AcademicPage<TItem> {
  readonly items: readonly TItem[];
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
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
  const response = await listAdminClasses({ schoolYear, page: 1, pageSize: catalogPageSize });
  const classes = [...response.items];

  for (let page = 2; page <= response.pagination.totalPages; page += 1) {
    const next = await listAdminClasses({ schoolYear, page, pageSize: catalogPageSize });
    classes.push(...next.items);
  }

  return classes;
}

export interface SubjectListFilters {
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface ClassListFilters {
  readonly schoolYear?: number;
  readonly page: number;
  readonly pageSize: number;
}

export async function listAdminSubjects(
  filters: SubjectListFilters,
): Promise<AcademicPage<AdminSubjectOption>> {
  const response = await apiClient.get<AcademicPage<AdminSubjectOption>>('/api/v1/admin/subjects', {
    params: filters,
  });
  return response.data;
}

export async function listAllAdminSubjects(search?: string): Promise<AdminSubjectOption[]> {
  const first = await listAdminSubjects({
    ...(search ? { search } : {}),
    page: 1,
    pageSize: catalogPageSize,
  });
  const subjects = [...first.items];

  for (let page = 2; page <= first.pagination.totalPages; page += 1) {
    const next = await listAdminSubjects({
      ...(search ? { search } : {}),
      page,
      pageSize: catalogPageSize,
    });
    subjects.push(...next.items);
  }

  return subjects;
}

export async function listAdminClasses(
  filters: ClassListFilters,
): Promise<AcademicPage<AdminClassOption>> {
  const response = await apiClient.get<AcademicPage<AdminClassOption>>('/api/v1/admin/classes', {
    params: filters,
  });
  return response.data;
}

export async function listAdminSchoolYears(): Promise<number[]> {
  const response = await apiClient.get<SchoolYearList>('/api/v1/admin/school-years');
  return response.data.items.map(({ schoolYear }) => schoolYear);
}

export async function getAdminClass(
  classId: string,
): Promise<{ schoolClass: AdminClass; etag: string }> {
  const response = await apiClient.get<AdminClass>(
    '/api/v1/admin/classes/' + encodeURIComponent(classId),
  );
  const etag = requiredResponseEtag(response.headers);
  return { schoolClass: response.data, etag };
}

export async function createAdminClass(input: AdminClassInput): Promise<AdminClass> {
  const response = await apiClient.post<AdminClass>('/api/v1/admin/classes', input);
  return response.data;
}

export async function updateAdminClass(
  classId: string,
  input: Pick<AdminClassInput, 'series' | 'schoolYear'>,
  etag: string,
): Promise<AdminClass> {
  const response = await apiClient.patch<AdminClass>(
    '/api/v1/admin/classes/' + encodeURIComponent(classId),
    input,
    { headers: { 'If-Match': etag } },
  );
  return response.data;
}

export async function createAdminSubject(
  input: AdminSubjectCreateInput,
): Promise<AdminSubjectOption> {
  const response = await apiClient.post<AdminSubjectOption>('/api/v1/admin/subjects', input);
  return response.data;
}

export async function updateAdminSubject(
  subjectId: string,
  input: AdminSubjectPatchInput,
): Promise<AdminSubjectOption> {
  const response = await apiClient.patch<AdminSubjectOption>(
    '/api/v1/admin/subjects/' + encodeURIComponent(subjectId),
    input,
  );
  return response.data;
}

export async function loadAccountFilterOptions(
  profile: 'student' | 'teacher',
): Promise<AccountFilterOptions> {
  const schoolYears = await listAdminSchoolYears();
  const classesByYear = await Promise.all(
    schoolYears.map((schoolYear) => listClassesForSchoolYear(schoolYear)),
  );
  const classes = classesByYear.flat();
  const subjects = profile === 'teacher' ? await listAllAdminSubjects() : [];

  return { classes, subjects };
}
