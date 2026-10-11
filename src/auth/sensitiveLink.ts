export type SensitiveLinkFlow = 'password-reset' | 'activation';

export interface SensitiveLinkToken {
  readonly flow: SensitiveLinkFlow;
  readonly token: string | null;
}

export function sensitiveLinkFlowForPathname(pathname: string): SensitiveLinkFlow | null {
  return pathname === '/redefinir-senha'
    ? 'password-reset'
    : pathname === '/ativar-conta'
      ? 'activation'
      : null;
}

export function clearSensitiveLinkTokenForFlow(
  current: SensitiveLinkToken | null,
  flow: SensitiveLinkFlow,
): SensitiveLinkToken | null {
  return current?.flow === flow ? null : current;
}

interface HistoryWriter {
  readonly state: unknown;
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

export function captureSensitiveLinkToken(
  href: string,
  history: HistoryWriter,
): SensitiveLinkToken | null {
  const url = new URL(href);
  const routeFlow = sensitiveLinkFlowForPathname(url.pathname);
  const tokenValues = url.searchParams.getAll('token');

  if (tokenValues.length === 0 && routeFlow === null) {
    return null;
  }

  if (tokenValues.length > 0) {
    url.searchParams.delete('token');
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  if (routeFlow === null) {
    return null;
  }

  const token = tokenValues.length === 1 && tokenValues[0] !== '' ? tokenValues[0] : null;
  return { flow: routeFlow, token };
}
