import {
  addAdminClassSubject,
  addAdminOfferTeacher,
  cancelAdminEnrollment,
  closeAdminClass,
  createAdminEnrollment,
  getAdminClassSubjects,
  getAdminEnrollment,
  getAdminOfferTeachers,
  removeAdminClassSubject,
  removeAdminOfferTeacher,
  type EnrollmentCreateInput,
} from '../api/adminAcademicLifecycle';
import { createAdminClass, getAdminClass, type AdminClassInput } from '../api/adminAcademicCatalog';
import { listAllAdminSubjects } from '../api/adminAcademicCatalog';
import { listTeacherAccounts, type TeacherAccountSummary } from '../api/adminAccounts';
import type { AdminSubjectOption } from '../api/adminAcademicCatalog';
import type { PaginatedAccountList, TeacherAccountFilters } from '../api/adminAccounts';

export function loadAcademicOfferPage(classId: string) {
  return getAdminClassSubjects(classId);
}

export function loadAcademicSubjectChoices(): Promise<AdminSubjectOption[]> {
  return listAllAdminSubjects();
}

export function loadAcademicTeacherCandidates(
  filters: TeacherAccountFilters,
): Promise<PaginatedAccountList<TeacherAccountSummary>> {
  return listTeacherAccounts(filters);
}

export function addAcademicOffer(classId: string, subjectId: string, etag: string) {
  return addAdminClassSubject(classId, subjectId, etag);
}

export function removeAcademicOffer(classId: string, subjectId: string, etag: string) {
  return removeAdminClassSubject(classId, subjectId, etag);
}

export function loadAcademicTeacherPage(classId: string, subjectId: string) {
  return getAdminOfferTeachers(classId, subjectId);
}

export function addAcademicTeacher(
  classId: string,
  subjectId: string,
  teacherId: string,
  etag: string,
) {
  return addAdminOfferTeacher(classId, subjectId, teacherId, etag);
}

export function removeAcademicTeacher(
  classId: string,
  subjectId: string,
  teacherId: string,
  etag: string,
) {
  return removeAdminOfferTeacher(classId, subjectId, teacherId, etag);
}

export function closeAcademicClass(classId: string, etag: string) {
  return closeAdminClass(classId, etag);
}

export async function prepareClassClosureSelection(selectedClassIds: readonly string[]) {
  return Promise.all(
    selectedClassIds.map(async (classId) => {
      const { etag } = await getAdminClass(classId);
      return { classId, etag };
    }),
  );
}

export function createAcademicClassWithClosures(
  input: AdminClassInput,
  closeClassIds: readonly { readonly classId: string; readonly etag: string }[],
) {
  return createAdminClass({ ...input, ...(closeClassIds.length ? { closeClassIds } : {}) });
}

export function startAcademicEnrollment(classId: string, input: EnrollmentCreateInput) {
  return createAdminEnrollment(classId, input);
}

export async function confirmAcademicEnrollment(
  classId: string,
  input: EnrollmentCreateInput,
  etag: string,
): Promise<{ enrollmentId: string }> {
  if (!input.confirmPreviousEnrollmentId) {
    throw new Error('A confirmação da matrícula anterior não foi informada.');
  }
  return createAdminEnrollment(classId, input, etag);
}

export function loadAcademicEnrollment(enrollmentId: string) {
  return getAdminEnrollment(enrollmentId);
}

export function cancelAcademicEnrollment(enrollmentId: string, date: string, etag: string) {
  return cancelAdminEnrollment(enrollmentId, date, etag);
}
