import {
  GENERIC_API_ERROR_MESSAGE,
  getApiProblemPresentation,
  type ApiProblemPresentation,
} from '../../api/problemDetails';

export const SIMULATION_VERSION_UNAVAILABLE_MESSAGE =
  'Não foi possível confirmar se os dados estão atualizados. Atualize a página antes de fazer alterações.';

export function simulationErrorPresentation(
  error: unknown,
): ApiProblemPresentation & { readonly message: string } {
  const presentation = getApiProblemPresentation(error);
  const message = presentation.message ?? GENERIC_API_ERROR_MESSAGE;

  return { ...presentation, message };
}

export function simulationErrorMessage(error: unknown) {
  return simulationErrorPresentation(error).message;
}
