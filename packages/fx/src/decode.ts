const LATIN = 'ABCDEFGHKLMNPQRSTUVXYZ0123456789/#%+=<>';
// Square, even-density ideographs keep the line from reflowing while wide text resolves.
const WIDE = '\u56DE\u7530\u76EE\u65E5\u53E3\u54C1\u5668\u6676\u660C\u56D7\u76BF\u66F0';

const isWide = (char: string) => (char.codePointAt(0) ?? 0) >= 0x2e80;
const isBlank = (char: string) => /\s/.test(char);

export type Random = () => number;

/** The text at `progress` (0–1): resolved prefix, a band of noise, nothing beyond it. */
export function decodeFrame(text: string, progress: number, random: Random = Math.random, band = 6): string {
  const chars = Array.from(text);
  const resolved = Math.floor(chars.length * Math.min(1, Math.max(0, progress)));
  return chars
    .map((char, index) => {
      if (index < resolved || isBlank(char)) return char;
      if (index >= resolved + band) return isWide(char) ? '\u3000' : '\u2007';
      const pool = isWide(char) ? WIDE : LATIN;
      return pool[Math.floor(random() * pool.length)] ?? char;
    })
    .join('');
}

export type DecodeOptions = {
  text: string;
  duration?: number;
  delay?: number;
  onFrame: (value: string) => void;
  onDone?: () => void;
};

/** Plays the reveal and returns a cancel function. Updates at ~30fps, which reads as signal, not as smear. */
export function decode({ text, duration = 700, delay = 0, onFrame, onDone }: DecodeOptions): () => void {
  let frame = 0;
  let start: number | undefined;
  let last = 0;
  const step = (time: number) => {
    start ??= time + delay;
    const progress = (time - start) / duration;
    if (progress >= 1) {
      onFrame(text);
      onDone?.();
      return;
    }
    if (time - last > 33) {
      last = time;
      onFrame(decodeFrame(text, Math.max(0, progress)));
    }
    frame = requestAnimationFrame(step);
  };
  onFrame(decodeFrame(text, 0));
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}
