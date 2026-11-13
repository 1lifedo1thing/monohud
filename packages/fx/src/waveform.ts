export type WaveformStyle = { color: string; grid: string; amplitude: number; seed: number };

/** Layered sines with a slow envelope: reads as a live carrier signal, never repeats visibly. */
export function waveformSample(x: number, time: number, seed: number): number {
  const t = time / 1000;
  const envelope = 0.55 + 0.45 * Math.sin(x * 2.1 + t * 0.7 + seed);
  return (
    envelope *
    (0.58 * Math.sin(x * 19 + t * 3.1 + seed) +
      0.28 * Math.sin(x * 47 - t * 5.3 + seed * 2) +
      0.14 * Math.sin(x * 113 + t * 9.7))
  );
}

export function drawWaveform(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  { color, grid, amplitude, seed }: WaveformStyle,
): void {
  const middle = height / 2;
  context.clearRect(0, 0, width, height);
  context.strokeStyle = grid;
  context.lineWidth = 1;
  context.globalAlpha = 0.28;
  context.beginPath();
  for (let division = 1; division < 10; division += 1) {
    const x = Math.round((width * division) / 10) + 0.5;
    context.moveTo(x, 0);
    context.lineTo(x, height);
  }
  for (const y of [0.25, 0.75]) {
    context.moveTo(0, Math.round(height * y) + 0.5);
    context.lineTo(width, Math.round(height * y) + 0.5);
  }
  context.stroke();
  context.globalAlpha = 1;
  context.beginPath();
  context.moveTo(0, Math.round(middle) + 0.5);
  context.lineTo(width, Math.round(middle) + 0.5);
  for (let x = 0; x <= width; x += width / 50) {
    const tick = Math.round(x) + 0.5;
    context.moveTo(tick, middle - 2);
    context.lineTo(tick, middle + 3);
  }
  context.stroke();
  context.strokeStyle = color;
  context.lineWidth = 1.25;
  context.beginPath();
  let endY = middle;
  for (let x = 0; x <= width; x += 2) {
    endY = middle + waveformSample(x / width, time, seed) * amplitude * (middle - 2);
    if (x === 0) context.moveTo(x, endY);
    else context.lineTo(x, endY);
  }
  context.stroke();
  context.fillStyle = color;
  context.fillRect(width - 3, endY - 1.5, 3, 3);
}
