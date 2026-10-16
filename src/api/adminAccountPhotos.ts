import { apiClient } from './client';

/*
 * Contrato proposto para a API-ADM-14 (fotos de perfil). Mantenha neste arquivo todos os detalhes
 * dos endpoints de foto, para que o site acompanhe o contrato final da API sem mexer nas telas.
 *
 * - PUT /api/v1/admin/users/{userId}/photo com o campo "photo" em multipart/form-data; 204 se der certo.
 * - GET /api/v1/admin/users/{userId}/photo devolve a imagem privada; 404 quando não há foto.
 * - O detalhe da conta informa photoUpdatedAt (string | null) para indicar se existe foto.
 */
export const ACCOUNT_PHOTO_FORM_FIELD = 'photo';

function accountPhotoPath(userId: string): string {
  return '/api/v1/admin/users/' + encodeURIComponent(userId) + '/photo';
}

export async function uploadAccountPhoto(userId: string, photo: File): Promise<void> {
  const body = new FormData();
  body.append(ACCOUNT_PHOTO_FORM_FIELD, photo);
  await apiClient.put(accountPhotoPath(userId), body);
}

/** URL da imagem para `<img src>`; a versão muda a URL quando a foto é substituída. */
export function accountPhotoUrl(userId: string, version: string): string {
  return apiClient.getUri({ url: accountPhotoPath(userId), params: { v: version } });
}
