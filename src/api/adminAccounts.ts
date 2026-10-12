import { apiClient } from './client';

export type AccountProfile = 'student' | 'teacher' | 'administrator';
export type AccountActivationStatus = 'pending' | 'activated';
export type ActivationEmailStatus = 'sent' | 'failed';
export type StudentEnrollmentStatus = 'active' | 'no_active_enrollment';

export interface AccountPagination {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface PaginatedAccountList<TAccount> {
  readonly items: readonly TAccount[];
  readonly pagination: AccountPagination;
}

export interface AccountSummary {
  readonly name: string;
  readonly email: string;
  readonly activationStatus: AccountActivationStatus;
}

export interface StudentAccountSummary extends AccountSummary {
  readonly studentId: string;
  readonly enrollmentStatus: StudentEnrollmentStatus;
  readonly currentClass: {
    readonly series: number;
    readonly schoolYear: number;
  } | null;
  readonly enrollmentId?: string;
}

export interface PersonAccountSummary extends AccountSummary {
  readonly teacherId?: string;
  readonly administratorId?: string;
}

export interface TeacherAccountSummary extends AccountSummary {
  readonly teacherId: string;
}

export interface AdministratorAccountSummary extends AccountSummary {
  readonly administratorId: string;
}

export interface StudentEnrollmentHistoryItem {
  readonly enrollmentId: string;
  readonly class: {
    readonly series: number;
    readonly schoolYear: number;
  };
  readonly startDate: string;
  readonly cancellationDate: string | null;
}

export interface StudentAccountDetail extends AccountSummary {
  readonly studentId: string;
  readonly contactPhone?: string;
  readonly guardianPhone: string;
  readonly enrollmentStatus: StudentEnrollmentStatus;
  readonly currentClass: {
    readonly series: number;
    readonly schoolYear: number;
  } | null;
  readonly enrollments: readonly StudentEnrollmentHistoryItem[];
}

export interface TeacherAccountDetail extends AccountSummary {
  readonly teacherId: string;
  readonly contactPhone?: string;
}

export interface AdministratorAccountDetail extends AccountSummary {
  readonly administratorId: string;
  readonly contactPhone?: string;
}

export interface AccountPaginationQuery {
  readonly page: number;
  readonly pageSize: number;
}

export interface StudentAccountFilters extends AccountPaginationQuery {
  readonly search?: string;
  readonly activationStatus?: AccountActivationStatus;
  readonly enrollmentStatus?: StudentEnrollmentStatus;
  readonly classId?: string;
}

export interface TeacherAccountFilters extends AccountPaginationQuery {
  readonly search?: string;
  readonly classId?: string;
  readonly subjectId?: string;
}

export interface AdministratorAccountFilters extends AccountPaginationQuery {
  readonly search?: string;
}

export type AccountFilters =
  StudentAccountFilters | TeacherAccountFilters | AdministratorAccountFilters;

export interface StudentAccountInput {
  readonly name: string;
  readonly email: string;
  readonly guardianPhone: string;
  readonly contactPhone?: string;
}

export interface PersonAccountInput {
  readonly name: string;
  readonly email: string;
  readonly contactPhone?: string;
}

export interface StudentAccountPatch {
  readonly name?: string;
  readonly email?: string;
  readonly guardianPhone?: string;
  readonly contactPhone?: string | null;
  readonly currentPassword?: string;
}

export interface PersonAccountPatch {
  readonly name?: string;
  readonly email?: string;
  readonly contactPhone?: string | null;
  readonly currentPassword?: string;
}

interface ActivationEmailResponse {
  readonly activationEmailStatus: ActivationEmailStatus;
}

export async function listStudentAccounts(
  filters: StudentAccountFilters,
): Promise<PaginatedAccountList<StudentAccountSummary>> {
  const response = await apiClient.get<PaginatedAccountList<StudentAccountSummary>>(
    '/api/v1/admin/students',
    { params: filters },
  );
  return response.data;
}

export async function listTeacherAccounts(
  filters: TeacherAccountFilters,
): Promise<PaginatedAccountList<TeacherAccountSummary>> {
  const response = await apiClient.get<PaginatedAccountList<TeacherAccountSummary>>(
    '/api/v1/admin/teachers',
    { params: filters },
  );
  return response.data;
}

export async function listAdministratorAccounts(
  filters: AdministratorAccountFilters,
): Promise<PaginatedAccountList<AdministratorAccountSummary>> {
  const response = await apiClient.get<PaginatedAccountList<AdministratorAccountSummary>>(
    '/api/v1/admin/administrators',
    { params: filters },
  );
  return response.data;
}

export async function getStudentAccount(studentId: string): Promise<StudentAccountDetail> {
  const response = await apiClient.get<StudentAccountDetail>(
    '/api/v1/admin/students/' + encodeURIComponent(studentId),
  );
  return response.data;
}

export async function getTeacherAccount(teacherId: string): Promise<TeacherAccountDetail> {
  const response = await apiClient.get<TeacherAccountDetail>(
    '/api/v1/admin/teachers/' + encodeURIComponent(teacherId),
  );
  return response.data;
}

export async function getAdministratorAccount(
  administratorId: string,
): Promise<AdministratorAccountDetail> {
  const response = await apiClient.get<AdministratorAccountDetail>(
    '/api/v1/admin/administrators/' + encodeURIComponent(administratorId),
  );
  return response.data;
}

export async function createStudentAccount(
  input: StudentAccountInput,
): Promise<ActivationEmailResponse> {
  const response = await apiClient.post<ActivationEmailResponse>('/api/v1/admin/students', input);
  return response.data;
}

export async function createTeacherAccount(
  input: PersonAccountInput,
): Promise<ActivationEmailResponse> {
  const response = await apiClient.post<ActivationEmailResponse>('/api/v1/admin/teachers', input);
  return response.data;
}

export async function createAdministratorAccount(
  input: PersonAccountInput,
): Promise<ActivationEmailResponse> {
  const response = await apiClient.post<ActivationEmailResponse>(
    '/api/v1/admin/administrators',
    input,
  );
  return response.data;
}

export async function updateStudentAccount(
  studentId: string,
  input: StudentAccountPatch,
): Promise<StudentAccountDetail> {
  const response = await apiClient.patch<StudentAccountDetail>(
    '/api/v1/admin/students/' + encodeURIComponent(studentId),
    input,
  );
  return response.data;
}

export async function updateTeacherAccount(
  teacherId: string,
  input: PersonAccountPatch,
): Promise<TeacherAccountDetail> {
  const response = await apiClient.patch<TeacherAccountDetail>(
    '/api/v1/admin/teachers/' + encodeURIComponent(teacherId),
    input,
  );
  return response.data;
}

export async function updateAdministratorAccount(
  administratorId: string,
  input: PersonAccountPatch,
): Promise<AdministratorAccountDetail> {
  const response = await apiClient.patch<AdministratorAccountDetail>(
    '/api/v1/admin/administrators/' + encodeURIComponent(administratorId),
    input,
  );
  return response.data;
}

export async function resendAccountActivation(userId: string): Promise<ActivationEmailStatus> {
  const response = await apiClient.post<ActivationEmailResponse>(
    '/api/v1/admin/users/' + encodeURIComponent(userId) + '/activation-resends',
  );
  return response.data.activationEmailStatus;
}
