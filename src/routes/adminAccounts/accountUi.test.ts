// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/problemDetails';
import type { AdminClassOption } from '../../api/adminAcademicCatalog';
import {
  ACCOUNT_PHOTO_MAX_BYTES,
  accountCollectionPath,
  accountCreatedFeedback,
  accountPhotoValidationMessage,
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
    const classes: AdminClassOption[] = [
      { classId: '42', schoolYear: 2026, series: 9, isClosed: false },
    ];
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
      { classId: '42', schoolYear: 2025, series: 9, isClosed: false },
    ]);
    expect(filters).not.toHaveProperty('classId');
  });

  it('formats civil dates without converting them through a timezone', () => {
    expect(civilDateLabel('2026-10-12')).toBe('12/10/2026');
    expect(civilDateLabel('unknown')).toBe('unknown');
  });

  it('maps validated RFC 9457 field errors and preserves API messages', () => {
    const error = new ApiRequestError({
      status: 422,
      problem: {
        status: 422,
        title: 'Dados inválidos',
        detail: 'Confira as informações e corrija os campos indicados.',
        errors: [
          {
            code: 'INVALID_FORMAT',
            detail: 'Use o formato indicado.',
            source: { in: 'body', pointer: '/email' },
          },
          {
            code: 'INVALID_VALUE',
            detail: 'Escolha um valor válido.',
            source: { in: 'body', pointer: "/email'][aria-invalid='true" },
          },
          {
            code: 'INVALID_VALUE',
            detail: 'Escolha um valor válido.',
            source: { in: 'body', pointer: '/currentPassword' },
          },
        ],
      },
    });
    const result = getAccountFormErrors(error, ['email']);

    expect(result.fields.email).toEqual(['Use o formato indicado.']);
    expect(result.fields.currentPassword).toEqual([]);
    expect(result.messages).toEqual([
      'Confira as informações e corrija os campos indicados.',
      'Escolha um valor válido.',
      'Escolha um valor válido.',
    ]);
    expect(JSON.stringify(result)).not.toContain('ada@example.test');
    expect(JSON.stringify(result)).not.toContain('synthetic-password');
  });

  it('does not claim email delivery for accepted activation requests', () => {
    expect(activationFeedback('sent')).toBe('Solicitação de ativação recebida.');
    expect(activationFeedback('failed')).toContain('Tente novamente');
  });

  it('keeps account creation success clear when activation email sending fails', () => {
    expect(accountCreatedFeedback('sent')).toContain('Conta cadastrada com sucesso.');
    expect(accountCreatedFeedback('failed')).toContain(
      'Conta cadastrada com sucesso, mas não foi possível enviar o link de ativação.',
    );
  });

  it('accepts only JPEG and PNG photos up to 5 MB', () => {
    const photo = (type: string, size: number) =>
      new File([new Uint8Array(size)], 'foto', { type });

    expect(accountPhotoValidationMessage(photo('image/jpeg', 1))).toBeNull();
    expect(accountPhotoValidationMessage(photo('image/png', ACCOUNT_PHOTO_MAX_BYTES))).toBeNull();
    expect(accountPhotoValidationMessage(photo('image/gif', 1))).toBe(
      'Escolha uma foto em JPEG ou PNG.',
    );
    expect(accountPhotoValidationMessage(photo('image/png', 0))).toBe(
      'O arquivo escolhido está vazio.',
    );
    expect(accountPhotoValidationMessage(photo('image/png', ACCOUNT_PHOTO_MAX_BYTES + 1))).toBe(
      'A foto deve ter no máximo 5 MB.',
    );
  });

  it('adds the photo warning to the created account feedback only when needed', () => {
    expect(accountCreatedFeedback('sent', true)).toBe(
      'Conta cadastrada com sucesso. Solicitação de ativação recebida. ' +
        'A foto não foi salva. Edite a conta para enviá-la novamente.',
    );
    expect(accountCreatedFeedback('sent', false)).toBe(
      'Conta cadastrada com sucesso. Solicitação de ativação recebida.',
    );
  });
});
