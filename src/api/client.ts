import axios from 'axios';
import { getApiBaseUrl } from './config';
import { toApiRequestError } from './problemDetails';

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD),
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiRequestError(error)),
);
