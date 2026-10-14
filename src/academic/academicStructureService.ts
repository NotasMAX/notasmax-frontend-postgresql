import {
  createAdminClass,
  createAdminSubject,
  getAdminClass,
  listAdminClasses,
  listAdminSchoolYears,
  listAdminSubjects,
  updateAdminClass,
  updateAdminSubject,
  type AdminClassInput,
  type AdminSubjectCreateInput,
  type AdminSubjectPatchInput,
  type ClassListFilters,
  type SubjectListFilters,
} from '../api/adminAcademicCatalog';

export async function loadAcademicSubjects(filters: SubjectListFilters) {
  return listAdminSubjects(filters);
}

export async function loadAcademicSubject(subjectId: string) {
  const pageSize = 100;
  let page = 1;

  while (true) {
    const result = await listAdminSubjects({ page, pageSize });
    const subject = result.items.find((item) => item.subjectId === subjectId);
    if (subject) {
      return subject;
    }
    if (page >= result.pagination.totalPages) {
      throw new Error('Não foi possível carregar a matéria solicitada.');
    }
    page += 1;
  }
}

export async function loadAcademicClasses(filters: ClassListFilters) {
  return listAdminClasses(filters);
}

export async function loadAllAcademicClasses(schoolYear?: number) {
  const pageSize = 100;
  const first = await listAdminClasses({
    ...(schoolYear === undefined ? {} : { schoolYear }),
    page: 1,
    pageSize,
  });
  const items = [...first.items];
  for (let page = 2; page <= first.pagination.totalPages; page += 1) {
    const next = await listAdminClasses({
      ...(schoolYear === undefined ? {} : { schoolYear }),
      page,
      pageSize,
    });
    items.push(...next.items);
  }
  return items;
}

export async function loadAcademicClass(classId: string) {
  return getAdminClass(classId);
}

export async function loadAcademicSchoolYears() {
  return listAdminSchoolYears();
}

export async function createAcademicSubject(input: AdminSubjectCreateInput) {
  return createAdminSubject(input);
}

export async function updateAcademicSubject(subjectId: string, input: AdminSubjectPatchInput) {
  return updateAdminSubject(subjectId, input);
}

export async function createAcademicClass(input: AdminClassInput) {
  return createAdminClass(input);
}

export async function updateAcademicClass(
  classId: string,
  input: Pick<AdminClassInput, 'series' | 'schoolYear'>,
  etag: string,
) {
  return updateAdminClass(classId, input, etag);
}
