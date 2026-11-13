import { createTicker, motionLevel } from './motion';

const REST_SCALE = 12;
const BURST_SCALE = 56;
const REST_STEP = 160;
const BURST_STEP = 50;
/** Below this the picture rests clean: small sub-pixel tears only soften text, and cost a filter. */
const CLEAN_REST = 0.35;

export function clampDistortion(amount: number): number {
  return Number.isFinite(amount) ? Math.min(1, Math.max(0, amount)) : 0;
}

/** Tear size in px for an amount from 0 to 1. Bursts are stronger but only last a moment. */
export function distortionScale(amount: number, burst = false): number {
  return clampDistortion(amount) * (burst ? BURST_SCALE : REST_SCALE);
}

/** Picks the next burst window. Higher amounts tear more often. */
export function nextBurst(time: number, amount: number, random: () => number = Math.random) {
  const start = time + (1400 + random() * 5000) / (0.4 + clampDistortion(amount));
  return { start, end: start + 90 + random() * 150 };
}

/**
 * Drives the signal filter from `motionLevel(root)`. `full` flickers and bursts, `subtle` holds
 * still between softer bursts, and `off` keeps one still frame. `--mh-warp` is only set on `root`
 * while the filter has something to do.
 */
export function createDistortion(filter: SVGFilterElement, root: HTMLElement, amount: number): () => void {
  const noise = filter.querySelector('feTurbulence');
  const warp = filter.querySelector('feDisplacementMap');
  if (!noise || !warp) return () => {};

  const level = motionLevel(root);
  const setScale = (scale: number) => warp.setAttribute('scale', String(scale));
  const reseed = () => noise.setAttribute('seed', String(1 + Math.floor(Math.random() * 999)));
  const engage = (on: boolean) => {
    if (on) root.style.setProperty('--mh-warp', `url("#${filter.id}")`);
    else root.style.removeProperty('--mh-warp');
  };
  const clean = amount < CLEAN_REST;

  setScale(distortionScale(amount));
  engage(!clean && amount > 0);
  if (level === 'off') return () => engage(false);

  const peak = distortionScale(amount, true) * (level === 'subtle' ? 0.5 : 1);
  let burst = nextBurst(performance.now(), amount);
  let bursting = false;
  let stepped = 0;

  const stop = createTicker(root, (time) => {
    const active = time >= burst.start;
    if (active !== bursting) {
      bursting = active;
      setScale(active ? peak : distortionScale(amount));
      if (clean) engage(active);
      if (level === 'subtle') reseed();
    }
    if (time >= burst.end) burst = nextBurst(time, amount);
    if ((level === 'subtle' || clean) && !active) return;
    if (time - stepped < (active ? BURST_STEP : REST_STEP)) return;
    stepped = time;
    reseed();
  });
  return () => {
    stop();
    engage(false);
  };
}
