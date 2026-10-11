const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

export function isMutatingMethod(method: string | undefined): boolean {
  return MUTATING_METHODS.has(method?.toLowerCase() ?? '');
}

export function isAllowedApiRequestTarget(
  requestUrl: string | undefined,
  requestBaseUrl: string | undefined,
  configuredBaseUrl: string,
  pageOrigin: string,
): boolean {
  try {
    const normalizedPageOrigin = new URL(pageOrigin).origin;
    const configuredOrigin = new URL(configuredBaseUrl || '/', normalizedPageOrigin).origin;
    const requestBase = new URL(requestBaseUrl || configuredBaseUrl || '/', normalizedPageOrigin);
    const target = new URL(requestUrl ?? '', requestBase);

    return (
      (target.protocol === 'http:' || target.protocol === 'https:') &&
      target.origin === configuredOrigin
    );
  } catch {
    return false;
  }
}
