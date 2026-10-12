// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/problemDetails';
import type { AdminClassOption } from '../../api/adminAcademicCatalog';
import {
  accountCollectionPath,
  accountProfileFromPath,
  activationFeedback,
  buildAccountFilters,
  civilDateLabel,
  getAccountFormErrors,
  type AccountFilterDraft,
} from './accountUi';

const emptyDraft: AccountFilterDraft = {
  search: '  Ada  ',
  activationStatus: 'pending',
  enrollmentStatus: 'active',
  schoolYear: '2026',
  series: '9',
  subjectId: '7',
  pageSize: 50,
};

describe('account UI contract helpers', () => {
  it('maps only the three supported profile routes', () => {
    expect(accountProfileFromPath('alunos')).toBe('student');
    expect(accountProfileFromPath('professores')).toBe('teacher');
    expect(accountProfileFromPath('administradores')).toBe('administrator');
    expect(accountProfileFromPath('turmas')).toBeUndefined();
    expect(accountCollectionPath('student')).toBe('/admin/contas/alunos');
  });

  it('builds only filters supported by each profile contract', () => {
    const classes: AdminClassOption[] = [{ classId: '42', schoolYear: 2026, series: 9 }];
    expect(buildAccountFilters('student', emptyDraft, 2, classes)).toEqual({
      search: 'Ada',
      activationStatus: 'pending',
      enrollmentStatus: 'active',
      classId: '42',
      page: 2,
      pageSize: 50,
    });
    expect(buildAccountFilters('teacher', emptyDraft, 1, classes)).toEqual({
      search: 'Ada',
      classId: '42',
      subjectId: '7',
      page: 1,
      pageSize: 50,
    });
    expect(buildAccountFilters('administrator', emptyDraft, 1, classes)).toEqual({
      search: 'Ada',
      page: 1,
      pageSize: 50,
    });
  });

  it('does not send internal class IDs when an academic year and series do not match', () => {
    const filters = buildAccountFilters('student', emptyDraft, 1, [
      { classId: '42', schoolYear: 2025, series: 9 },
    ]);
    expect(filters).not.toHaveProperty('classId');
  });

  it('formats civil dates without converting them through a timezone', () => {
    expect(civilDateLabel('2026-10-12')).toBe('12/10/2026');
    expect(civilDateLabel('unknown')).toBe('unknown');
  });

  it('maps validated RFC 9457 field errors and keeps API text safe', () => {
    const error = new ApiRequestError({
      status: 422,
      problem: {
        status: 422,
        title: 'Conteúdo inválido',
        detail: 'Verifique os campos informados.',
        errors: [
          {
            code: 'INVALID_FORMAT',
            detail: 'O e-mail informado é inválido.',
            source: { in: 'body', pointer: '/email' },
          },
          {
            code: 'INVALID_VALUE',
            detail: 'O parâmetro informado é inválido.',
            source: { in: 'body', pointer: "/email'][aria-invalid='true" },
          },
          {
            code: 'INVALID_VALUE',
            detail: 'O valor informado não pode ser usado.',
            source: { in: 'body', pointer: '/currentPassword' },
          },
        ],
      },
    });
    const result = getAccountFormErrors(
      error,
      ['email'],
      ['ada@example.test', 'synthetic-password'],
    );

    expect(result.fields.email).toEqual(['O e-mail informado é inválido.']);
    expect(result.fields.currentPassword).toEqual([]);
    expect(result.messages).toEqual([
      'Verifique os campos informados.',
      'O parâmetro informado é inválido.',
      'O valor informado não pode ser usado.',
    ]);
    expect(JSON.stringify(result)).not.toContain('ada@example.test');
    expect(JSON.stringify(result)).not.toContain('synthetic-password');
  });

  it('does not claim email delivery for accepted activation requests', () => {
    expect(activationFeedback('sent')).toContain('não confirma a entrega');
    expect(activationFeedback('failed')).toContain('Tente novamente');
  });
});
