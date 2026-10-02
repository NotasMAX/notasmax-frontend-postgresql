const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const INVALID_URL_MESSAGE =
  'VITE_API_BASE_URL deve ser uma URL HTTP(S) válida ou um caminho relativo da mesma origem.';

export function getApiBaseUrl(value: string | undefined, isProduction = false): string {
  const baseUrl = value?.trim() ?? '';

  if (baseUrl === '') {
    return '';
  }

  const isAbsoluteUrl = SCHEME_PATTERN.test(baseUrl);

  if (baseUrl.includes('\\') || (!isAbsoluteUrl && baseUrl.startsWith('//'))) {
    throw new Error(INVALID_URL_MESSAGE);
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(baseUrl, 'https://configuration.invalid');
  } catch {
    throw new Error(INVALID_URL_MESSAGE);
  }

  if (!isAbsoluteUrl) {
    return baseUrl;
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(INVALID_URL_MESSAGE);
  }

  if (parsedUrl.username !== '' || parsedUrl.password !== '') {
    throw new Error('VITE_API_BASE_URL não deve conter credenciais.');
  }

  if (isProduction && parsedUrl.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL deve usar HTTPS em produção.');
  }

  return baseUrl;
}
