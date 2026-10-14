export function requiredResponseEtag(headers: unknown): string {
  if (typeof headers !== 'object' || headers === null) {
    throw new Error('Não foi possível confirmar se os dados estão atualizados.');
  }

  const headerBag = headers as { get?: (name: string) => unknown; etag?: unknown };
  let value: unknown;
  if (typeof headerBag.get === 'function') {
    value = headerBag.get('etag');
  } else {
    value = headerBag.etag;
  }

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Não foi possível confirmar se os dados estão atualizados.');
  }
  return value;
}
