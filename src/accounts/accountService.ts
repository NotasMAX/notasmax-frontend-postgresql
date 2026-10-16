import {
  createAdministratorAccount,
  createStudentAccount,
  createTeacherAccount,
  getAdministratorAccount,
  getStudentAccount,
  getTeacherAccount,
  listAdministratorAccounts,
  listStudentAccounts,
  listTeacherAccounts,
  resendAccountActivation,
  updateAdministratorAccount,
  updateStudentAccount,
  updateTeacherAccount,
  type AccountProfile,
  type AccountFilters,
  type ActivationEmailStatus,
  type AdministratorAccountDetail,
  type AdministratorAccountFilters,
  type AdministratorAccountSummary,
  type PaginatedAccountList,
  type PersonAccountInput,
  type PersonAccountPatch,
  type StudentAccountDetail,
  type StudentAccountFilters,
  type StudentAccountInput,
  type StudentAccountPatch,
  type StudentAccountSummary,
  type TeacherAccountDetail,
  type TeacherAccountFilters,
  type TeacherAccountSummary,
} from '../api/adminAccounts';
import { accountPhotoUrl, uploadAccountPhoto } from '../api/adminAccountPhotos';
export type AccountListItem =
  StudentAccountSummary | TeacherAccountSummary | AdministratorAccountSummary;

export type AccountDetail =
  StudentAccountDetail | TeacherAccountDetail | AdministratorAccountDetail;

export type AccountCreateInput = StudentAccountInput | PersonAccountInput;
export type AccountPatchInput = StudentAccountPatch | PersonAccountPatch;

export async function loadAccountPage(
  profile: AccountProfile,
  filters: AccountFilters,
): Promise<PaginatedAccountList<AccountListItem>> {
  switch (profile) {
    case 'student':
      return listStudentAccounts(filters as StudentAccountFilters);
    case 'teacher':
      return listTeacherAccounts(filters as TeacherAccountFilters);
    case 'administrator':
      return listAdministratorAccounts(filters as AdministratorAccountFilters);
  }
}

export async function loadAccountDetail(
  profile: AccountProfile,
  accountId: string,
): Promise<AccountDetail> {
  switch (profile) {
    case 'student':
      return getStudentAccount(accountId);
    case 'teacher':
      return getTeacherAccount(accountId);
    case 'administrator':
      return getAdministratorAccount(accountId);
  }
}

export async function findAccountIdentifierByEmail(
  profile: AccountProfile,
  email: string,
): Promise<string | null> {
  const page = await loadAccountPage(profile, { search: email, page: 1, pageSize: 20 });
  const normalizedEmail = email.trim().toLowerCase();
  const account = page.items.find((item) => item.email.trim().toLowerCase() === normalizedEmail);
  return account ? accountIdentifier(account) : null;
}

export async function createAccount(
  profile: AccountProfile,
  input: AccountCreateInput,
): Promise<ActivationEmailStatus> {
  switch (profile) {
    case 'student':
      return (await createStudentAccount(input as StudentAccountInput)).activationEmailStatus;
    case 'teacher':
      return (await createTeacherAccount(input as PersonAccountInput)).activationEmailStatus;
    case 'administrator':
      return (await createAdministratorAccount(input as PersonAccountInput)).activationEmailStatus;
  }
}

export async function updateAccount(
  profile: AccountProfile,
  accountId: string,
  input: AccountPatchInput,
): Promise<AccountDetail> {
  switch (profile) {
    case 'student':
      return updateStudentAccount(accountId, input as StudentAccountPatch);
    case 'teacher':
      return updateTeacherAccount(accountId, input as PersonAccountPatch);
    case 'administrator':
      return updateAdministratorAccount(accountId, input as PersonAccountPatch);
  }
}

export async function resendActivation(accountId: string): Promise<ActivationEmailStatus> {
  return resendAccountActivation(accountId);
}

export async function saveAccountPhoto(accountId: string, photo: File): Promise<void> {
  return uploadAccountPhoto(accountId, photo);
}

export function accountPhotoSource(account: AccountDetail): string | null {
  return account.photoUpdatedAt
    ? accountPhotoUrl(accountIdentifier(account), account.photoUpdatedAt)
    : null;
}

export function accountIdentifier(account: AccountListItem | AccountDetail): string {
  if ('studentId' in account) {
    return account.studentId;
  }
  if ('teacherId' in account) {
    return account.teacherId;
  }
  return account.administratorId;
}
