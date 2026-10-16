import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { AccountProfile } from '../../api/adminAccounts';
import { AccountAvatar } from './AccountAvatar';
import { ACCOUNT_PHOTO_ACCEPT, accountPhotoValidationMessage } from './accountUi';

interface AccountPhotoFieldProps {
  readonly profile: AccountProfile;
  /** Foto já salva da conta em edição, se houver. */
  readonly currentSource: string | null;
  readonly photo: File | null;
  readonly errors: readonly string[];
  readonly disabled?: boolean;
  onChange(photo: File | null, error: string | null): void;
}

export function AccountPhotoField({
  profile,
  currentSource,
  photo,
  errors,
  disabled = false,
  onChange,
}: AccountPhotoFieldProps) {
  const [previewSource, setPreviewSource] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const errorIds = errors.map((_, index) => 'account-photo-error-' + index);

  useEffect(
    () => () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    },
    [],
  );

  function replacePreview(next: string | null) {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = next;
    setPreviewSource(next);
  }

  function select(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selected = input.files?.[0];
    // Limpar o input permite escolher o mesmo arquivo de novo depois de um erro ou de desfazer.
    input.value = '';
    if (!selected) {
      return;
    }
    const error = accountPhotoValidationMessage(selected);
    if (error) {
      replacePreview(null);
      onChange(null, error);
      return;
    }
    replacePreview(URL.createObjectURL(selected));
    onChange(selected, null);
  }

  function undo() {
    replacePreview(null);
    onChange(null, null);
  }

  const hasPhoto = previewSource !== null || currentSource !== null;
  const help = photo
    ? 'Foto selecionada: ' + photo.name + '. Ela será salva com os demais dados.'
    : currentSource
      ? 'JPEG ou PNG, com até 5 MB. Uma nova foto substitui a atual.'
      : 'JPEG ou PNG, com até 5 MB.';

  return (
    <fieldset className="space-y-2">
      <legend className="text-label-large font-medium text-on-surface">Foto (opcional)</legend>
      <div className="flex flex-wrap items-center gap-4">
        <AccountAvatar
          alt={previewSource ? 'Prévia da nova foto' : 'Foto atual'}
          profile={profile}
          source={previewSource ?? currentSource}
        />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              accept={ACCOUNT_PHOTO_ACCEPT}
              aria-describedby={['account-photo-help', ...errorIds].join(' ')}
              aria-invalid={errors.length > 0 || undefined}
              className="peer sr-only"
              disabled={disabled}
              id="account-photo"
              onChange={select}
              type="file"
            />
            <label
              className="account-button-secondary inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-panel-outline px-4 text-label-large font-medium text-primary hover:bg-surface-container peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:cursor-wait peer-disabled:opacity-70"
              htmlFor="account-photo"
            >
              {hasPhoto ? 'Trocar foto' : 'Escolher foto'}
            </label>
            {photo && (
              <button
                className="account-button-secondary min-h-11 rounded-lg border border-panel-outline px-4 text-label-large font-medium text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70"
                disabled={disabled}
                onClick={undo}
                type="button"
              >
                Desfazer escolha
              </button>
            )}
          </div>
          <p className="break-all text-body-small text-muted" id="account-photo-help">
            {help}
          </p>
        </div>
      </div>
      {errors.length > 0 && (
        <ul className="space-y-1 text-body-small text-danger">
          {errors.map((message, index) => (
            <li id={errorIds[index]} key={errorIds[index]}>
              {message}
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
