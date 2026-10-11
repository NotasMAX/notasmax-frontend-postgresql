import axios from 'axios';
import { getApiBaseUrl } from './config';
import { publishAuthenticationRequired, toApiRequestError } from './problemDetails';
import { isAllowedApiRequestTarget, isMutatingMethod } from './requestPolicy';

const configuredBaseUrl = getApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD);

export const apiClient = axios.create({
  baseURL: configuredBaseUrl,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (
    typeof window !== 'undefined' &&
    !isAllowedApiRequestTarget(
      config.url,
      config.baseURL,
      configuredBaseUrl,
      window.location.origin,
    )
  ) {
    return Promise.reject(new Error('A API só aceita chamadas para a origem configurada.'));
  }

  if (isMutatingMethod(config.method)) {
    config.headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalizedError = toApiRequestError(error);
    publishAuthenticationRequired(normalizedError);
    return Promise.reject(normalizedError);
  },
);
