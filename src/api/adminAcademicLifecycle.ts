import { apiClient } from './client';
import { requiredResponseEtag } from './responseEtag';

export interface ClassSubjectOffer {
  readonly subjectId: string;
  readonly name: string;
  readonly description: string | null;
}

export interface TeacherAssociation {
  readonly teacherId: string;
  readonly name: string;
  readonly email: string;
  readonly activationStatus: 'pending' | 'activated';
}

export interface EnrollmentRepresentation {
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly classId: string;
  readonly startDate: string;
  readonly cancellationDate: string | null;
}

export interface EnrollmentCreateInput {
  readonly studentId: string;
  readonly startDate: string;
  readonly confirmPreviousEnrollmentId?: string;
}

function resourcePath(value: string): string {
  return encodeURIComponent(value);
}

export async function getAdminClassSubjects(
  classId: string,
): Promise<{ items: readonly ClassSubjectOffer[]; etag: string }> {
  const response = await apiClient.get<{ items: readonly ClassSubjectOffer[] }>(
    `/api/v1/admin/classes/${resourcePath(classId)}/subjects`,
  );
  return { items: response.data.items, etag: requiredResponseEtag(response.headers) };
}

export async function addAdminClassSubject(
  classId: string,
  subjectId: string,
  etag: string,
): Promise<void> {
  await apiClient.put(
    `/api/v1/admin/classes/${resourcePath(classId)}/subjects/${resourcePath(subjectId)}`,
    undefined,
    { headers: { 'If-Match': etag } },
  );
}

export async function removeAdminClassSubject(
  classId: string,
  subjectId: string,
  etag: string,
): Promise<void> {
  await apiClient.delete(
    `/api/v1/admin/classes/${resourcePath(classId)}/subjects/${resourcePath(subjectId)}`,
    { headers: { 'If-Match': etag } },
  );
}

export async function getAdminOfferTeachers(
  classId: string,
  subjectId: string,
): Promise<{ items: readonly TeacherAssociation[]; etag: string }> {
  const response = await apiClient.get<{ items: readonly TeacherAssociation[] }>(
    `/api/v1/admin/classes/${resourcePath(classId)}/subjects/${resourcePath(subjectId)}/teachers`,
  );
  return { items: response.data.items, etag: requiredResponseEtag(response.headers) };
}

export async function addAdminOfferTeacher(
  classId: string,
  subjectId: string,
  teacherId: string,
  etag: string,
): Promise<void> {
  await apiClient.put(
    `/api/v1/admin/classes/${resourcePath(classId)}/subjects/${resourcePath(subjectId)}/teachers/${resourcePath(teacherId)}`,
    undefined,
    { headers: { 'If-Match': etag } },
  );
}

export async function removeAdminOfferTeacher(
  classId: string,
  subjectId: string,
  teacherId: string,
  etag: string,
): Promise<void> {
  await apiClient.delete(
    `/api/v1/admin/classes/${resourcePath(classId)}/subjects/${resourcePath(subjectId)}/teachers/${resourcePath(teacherId)}`,
    { headers: { 'If-Match': etag } },
  );
}

export async function closeAdminClass(classId: string, etag: string): Promise<void> {
  await apiClient.post(`/api/v1/admin/classes/${resourcePath(classId)}/close`, undefined, {
    headers: { 'If-Match': etag },
  });
}

export async function createAdminEnrollment(
  classId: string,
  input: EnrollmentCreateInput,
  etag?: string,
): Promise<{ enrollmentId: string }> {
  const response = await apiClient.post<{ enrollmentId: string }>(
    `/api/v1/admin/classes/${resourcePath(classId)}/enrollments`,
    input,
    etag ? { headers: { 'If-Match': etag } } : undefined,
  );
  return response.data;
}

export async function getAdminEnrollment(
  enrollmentId: string,
): Promise<{ enrollment: EnrollmentRepresentation; etag: string }> {
  const response = await apiClient.get<EnrollmentRepresentation>(
    `/api/v1/admin/enrollments/${resourcePath(enrollmentId)}`,
  );
  return { enrollment: response.data, etag: requiredResponseEtag(response.headers) };
}

export async function cancelAdminEnrollment(
  enrollmentId: string,
  cancellationDate: string,
  etag: string,
): Promise<void> {
  await apiClient.post(
    `/api/v1/admin/enrollments/${resourcePath(enrollmentId)}/cancellations`,
    { cancellationDate },
    { headers: { 'If-Match': etag } },
  );
}
