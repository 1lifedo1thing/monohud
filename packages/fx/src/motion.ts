export type MotionLevel = 'off' | 'subtle' | 'full';

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Resolves the effective motion level for an element from the nearest `data-mh-motion`. */
export function motionLevel(element?: Element | null): MotionLevel {
  if (prefersReducedMotion()) return 'off';
  const level = element?.closest('[data-mh-motion]')?.getAttribute('data-mh-motion');
  return level === 'off' || level === 'subtle' ? level : 'full';
}

/** Runs `callback` every animation frame while the element is on screen and the tab is visible. */
export function createTicker(element: Element, callback: (time: number) => void): () => void {
  let frame = 0;
  let intersecting = true;
  const loop = (time: number) => {
    frame = 0;
    callback(time);
    schedule();
  };
  const schedule = () => {
    if (!frame && intersecting && !document.hidden) frame = requestAnimationFrame(loop);
  };
  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          intersecting = entries.at(-1)?.isIntersecting ?? true;
          schedule();
        })
      : null;
  observer?.observe(element);
  document.addEventListener('visibilitychange', schedule);
  schedule();
  return () => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    document.removeEventListener('visibilitychange', schedule);
  };
}
