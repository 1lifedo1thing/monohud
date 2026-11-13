export type ThemeName = 'mono' | 'sodium' | 'ion' | 'ember';

/** Dark hull surfaces, cold instrument lines, one warm signal per theme. */
/**
 * Surfaces, lines and text carry zero chroma. Colour is reserved for status:
 * green, orange and red. `info` stays neutral so it never reads as an alert.
 */
export const palette = {
  'bg-0': 'oklch(0.1 0 0)',
  'bg-1': 'oklch(0.15 0 0)',
  'bg-2': 'oklch(0.2 0 0)',
  'bg-3': 'oklch(0.27 0 0)',
  line: 'oklch(0.52 0 0)',
  'line-strong': 'oklch(0.74 0 0)',
  fg: 'oklch(0.95 0 0)',
  'fg-muted': 'oklch(0.77 0 0)',
  'fg-faint': 'oklch(0.63 0 0)',
  info: 'oklch(0.84 0 0)',
  ok: 'oklch(0.84 0.15 155)',
  warn: 'oklch(0.78 0.16 62)',
  danger: 'oklch(0.68 0.21 27)',
  'danger-fg': 'oklch(0.15 0 0)',
} as const;

export const themes: Record<ThemeName, { accent: string; 'accent-fg': string; 'accent-dim': string }> = {
  mono: {
    accent: 'oklch(0.96 0 0)',
    'accent-fg': 'oklch(0.14 0 0)',
    'accent-dim': 'oklch(0.96 0 0 / 0.14)',
  },
  sodium: {
    accent: 'oklch(0.82 0.16 78)',
    'accent-fg': 'oklch(0.2 0.04 70)',
    'accent-dim': 'oklch(0.82 0.16 78 / 0.16)',
  },
  ion: {
    accent: 'oklch(0.85 0.12 182)',
    'accent-fg': 'oklch(0.2 0.04 190)',
    'accent-dim': 'oklch(0.85 0.12 182 / 0.16)',
  },
  ember: {
    accent: 'oklch(0.74 0.18 40)',
    'accent-fg': 'oklch(0.18 0.04 40)',
    'accent-dim': 'oklch(0.74 0.18 40 / 0.18)',
  },
};

export const scale = {
  'space-1': '4px',
  'space-2': '8px',
  'space-3': '12px',
  'space-4': '16px',
  'space-5': '24px',
  'space-6': '32px',
  'cut-sm': '5px',
  'cut-md': '9px',
  'cut-lg': '16px',
  'text-2xs': '0.6875rem',
  'text-xs': '0.75rem',
  'text-sm': '0.875rem',
  'text-md': '1rem',
  'text-lg': '1.25rem',
  'text-xl': '1.75rem',
  'text-2xl': '2.75rem',
  'ease-snap': 'cubic-bezier(0.16, 1, 0.3, 1)',
  'dur-fast': '120ms',
  'dur-med': '240ms',
  'dur-slow': '520ms',
  'z-overlay': '100',
  /* Light bleeding from emissive type and lines, tinted by whatever colour it sits on. */
  glow: '0 0 12px color-mix(in oklch, currentColor 42%, transparent)',
  'glow-strong': '0 0 6px color-mix(in oklch, currentColor 60%, transparent), 0 0 22px color-mix(in oklch, currentColor 36%, transparent)',
} as const;

const mono = `'Geist Mono Variable', 'Geist Mono', ui-monospace, 'SF Mono', Menlo, Consolas, 'PingFang SC', 'Noto Sans SC', monospace`;

/** One typeface throughout. The three roles stay separate so a developer can override any of them. */
export const fonts = {
  'font-display': mono,
  'font-body': mono,
  'font-data': mono,
} as const;

const declarations = (values: Record<string, string>) =>
  Object.entries(values)
    .map(([name, value]) => `  --mh-${name}: ${value};`)
    .join('\n');

export function renderTokensCss(): string {
  const themeBlocks = (Object.keys(themes) as ThemeName[])
    .map((name) => `[data-mh-theme='${name}'] {\n${declarations(themes[name])}\n}`)
    .join('\n\n');
  return `@layer mh.tokens {\n:root {\n${declarations({ ...palette, ...scale, ...fonts, ...themes.mono })}\n}\n\n${themeBlocks}\n}\n`;
}
