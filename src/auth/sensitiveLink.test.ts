import { describe, expect, it, vi } from 'vitest';
import {
  captureSensitiveLinkToken,
  clearSensitiveLinkTokenForFlow,
  sensitiveLinkFlowForPathname,
} from './sensitiveLink';

function createHistory() {
  return {
    state: { navigation: 'existing' },
    replaceState: vi.fn(),
  };
}

describe('captureSensitiveLinkToken', () => {
  it('captures a reset token and removes it from the visible URL immediately', () => {
    const history = createHistory();
    const link = captureSensitiveLinkToken(
      'https://web.example.test/redefinir-senha?token=synthetic-reset&source=email#form',
      history,
    );

    expect(link).toEqual({ flow: 'password-reset', token: 'synthetic-reset' });
    expect(history.replaceState).toHaveBeenCalledWith(
      history.state,
      '',
      '/redefinir-senha?source=email#form',
    );
    expect(history.replaceState.mock.calls[0]?.[2]).not.toContain('synthetic-reset');
  });

  it('captures activation links and treats missing, empty, or repeated tokens as invalid', () => {
    expect(
      captureSensitiveLinkToken(
        'https://web.example.test/ativar-conta?token=synthetic-activation',
        createHistory(),
      ),
    ).toEqual({ flow: 'activation', token: 'synthetic-activation' });
    expect(
      captureSensitiveLinkToken('https://web.example.test/redefinir-senha', createHistory()),
    ).toEqual({ flow: 'password-reset', token: null });
    expect(
      captureSensitiveLinkToken(
        'https://web.example.test/redefinir-senha?token=first&token=second',
        createHistory(),
      ),
    ).toEqual({ flow: 'password-reset', token: null });
    expect(
      captureSensitiveLinkToken('https://web.example.test/ativar-conta?token=', createHistory()),
    ).toEqual({ flow: 'activation', token: null });
  });

  it('removes tokens found on an unapproved route without retaining them', () => {
    const history = createHistory();

    expect(
      captureSensitiveLinkToken('https://web.example.test/qualquer-rota?token=synthetic', history),
    ).toBeNull();
    expect(history.replaceState.mock.calls[0]?.[2]).toBe('/qualquer-rota');
  });
});

describe('sensitive link lifecycle', () => {
  it('maps only the approved reset and activation paths to token flows', () => {
    expect(sensitiveLinkFlowForPathname('/redefinir-senha')).toBe('password-reset');
    expect(sensitiveLinkFlowForPathname('/ativar-conta')).toBe('activation');
    expect(sensitiveLinkFlowForPathname('/')).toBeNull();
  });

  it('clears the matching parent token state without changing a different flow', () => {
    expect(
      clearSensitiveLinkTokenForFlow(
        { flow: 'password-reset', token: 'synthetic-reset' },
        'password-reset',
      ),
    ).toBeNull();
    expect(
      clearSensitiveLinkTokenForFlow(
        { flow: 'activation', token: 'synthetic-activation' },
        'password-reset',
      ),
    ).toEqual({ flow: 'activation', token: 'synthetic-activation' });
  });
});
