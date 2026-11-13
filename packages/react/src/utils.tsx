import * as React from 'react';
import { observeSize, type Size } from '@monohud/fx';

export type Tone = 'accent' | 'ok' | 'info' | 'warn' | 'danger';

/** Joins class names. Accepts Base UI's function form by resolving it against the state. */
export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

export function mergeClass<State>(base: string, className: string | ((state: State) => string | undefined) | undefined) {
  return typeof className === 'function'
    ? (state: State) => cx(base, className(state))
    : cx(base, className);
}

export const Lock = () => <span className="mh-lock" aria-hidden="true" />;

export const ChevronIcon = () => (
  <svg className="mh-icon" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 6l5 5 5-5" />
  </svg>
);

export const CloseIcon = () => (
  <svg className="mh-icon" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3.5 3.5l9 9m0-9l-9 9" />
  </svg>
);

export const useIsomorphicLayoutEffect = typeof document === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function useSize(element: Element | null): Size | null {
  const [size, setSize] = React.useState<Size | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (!element) return undefined;
    const rect = element.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    return observeSize(element, setSize);
  }, [element]);
  return size;
}

export function useMergedStyle(vars: Record<string, string | number | undefined>, style?: React.CSSProperties): React.CSSProperties {
  return { ...(vars as React.CSSProperties), ...style };
}
