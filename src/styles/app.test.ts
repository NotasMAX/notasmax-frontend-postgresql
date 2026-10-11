// @ts-expect-error Vitest runs this test in Node; production source types stay browser-only.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const appLayout = readFileSync(new URL('../components/AppLayout.tsx', import.meta.url), 'utf8');
const notFoundPage = readFileSync(new URL('../routes/NotFoundPage.tsx', import.meta.url), 'utf8');

const materialTypographyRoles = [
  'display-large',
  'display-medium',
  'display-small',
  'headline-large',
  'headline-medium',
  'headline-small',
  'title-large',
  'title-medium',
  'title-small',
  'body-large',
  'body-medium',
  'body-small',
  'label-large',
  'label-medium',
  'label-small',
] as const;

function themeColor(name: string): string {
  const value = stylesheet.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
  if (!value) {
    throw new Error(`Missing six-digit theme color: ${name}`);
  }
  return value;
}

function linearize(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

function contrastRatio(first: string, second: string): number {
  const luminance = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (luminance[0] + 0.05) / (luminance[1] + 0.05);
}

function blendWithWhite(hex: string, alpha: number): string {
  return `#${[1, 3, 5]
    .map((index) => {
      const channel = Number.parseInt(hex.slice(index, index + 2), 16);
      return Math.round(channel * (1 - alpha) + 255 * alpha)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}

describe('approved visual tokens', () => {
  it('defines all 15 Material 3 typography roles with size, line height, weight, and tracking', () => {
    for (const role of materialTypographyRoles) {
      expect(stylesheet).toMatch(new RegExp(`--text-${role}:\\s*[^;]+;`));
      expect(stylesheet).toMatch(new RegExp(`--text-${role}--line-height:\\s*[^;]+;`));
      expect(stylesheet).toMatch(new RegExp(`--text-${role}--font-weight:\\s*[^;]+;`));
      expect(stylesheet).toMatch(new RegExp(`--text-${role}--letter-spacing:\\s*[^;]+;`));
    }
  });

  it('uses semantic fallback tokens and the approved large-screen shell margin', () => {
    expect(notFoundPage).toContain('text-primary');
    expect(notFoundPage).toContain('text-on-surface');
    expect(notFoundPage).toContain('text-muted');
    expect(notFoundPage).toContain('text-headline-small');
    expect(notFoundPage).toContain('text-body-large');
    expect(notFoundPage).not.toMatch(/text-(?:indigo|slate)-/);
    expect(appLayout).not.toContain('lg:px-8');
    expect(appLayout.match(/lg:px-6/g)).toHaveLength(2);
  });

  it('keeps semantic anchor utilities above the inherited base color and meets AA contrast', () => {
    expect(stylesheet).toMatch(/@layer base\s*\{\s*a\s*\{\s*color:\s*inherit;\s*\}\s*\}/);
    expect(appLayout).toContain('text-on-primary');
    expect(
      contrastRatio(themeColor('--color-on-primary'), themeColor('--color-primary')),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('registers the local Roboto variable font for its supported weight range', () => {
    expect(stylesheet).toMatch(
      /@font-face\s*\{[^}]*font-family:\s*'Roboto'[^}]*font-weight:\s*100\s+900/s,
    );
  });

  it('keeps auth text and links at AA contrast across the blue gradient panel', () => {
    const gradientEnd = stylesheet.match(/--auth-background-end:\s*(#[0-9a-f]{6})/i)?.[1];
    const panelAlpha = stylesheet.match(/--auth-panel-alpha:\s*([\d.]+)/)?.[1];

    expect(gradientEnd).toBeDefined();
    expect(panelAlpha).toBeDefined();
    if (!gradientEnd || panelAlpha === undefined) {
      throw new Error('Missing auth gradient or panel surface token.');
    }
    const panelSurface = blendWithWhite(gradientEnd, Number(panelAlpha));
    expect(contrastRatio(themeColor('--color-on-surface'), panelSurface)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(themeColor('--color-muted'), panelSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(themeColor('--color-primary-hover'), panelSurface)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
