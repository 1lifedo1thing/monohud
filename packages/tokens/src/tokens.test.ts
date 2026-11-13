import { describe, expect, it } from 'vitest';
import { palette, renderTokensCss, themes } from './index';

const chroma = (value: string) => Number(value.match(/oklch\([\d.]+ ([\d.]+)/)?.[1]);

describe('monochrome default', () => {
  it('keeps every non-status colour at zero chroma', () => {
    const { ok, warn, danger, ...neutral } = palette;
    expect(Object.values(neutral).map(chroma)).toEqual(Object.values(neutral).map(() => 0));
    expect(chroma(themes.mono.accent)).toBe(0);
    expect([ok, warn, danger].every((value) => chroma(value) > 0)).toBe(true);
  });

  it('emits the mono accent on :root', () => {
    expect(renderTokensCss()).toContain(`--mh-accent: ${themes.mono.accent};`);
  });
});
