export type Corners = [topLeft: number, topRight: number, bottomRight: number, bottomLeft: number];

export type Notch = {
  /** Distance from the top-left of the top edge to the notch start, in px. */
  offset: number;
  width: number;
  depth: number;
};

export type FrameSpec = {
  cut?: number | Corners;
  /** A recess in the top edge, the usual seat for a panel title. */
  notch?: Notch;
};

const round = (value: number) => Math.round(value * 100) / 100;

export function resolveCorners(cut: FrameSpec['cut'] = 0, width: number, height: number): Corners {
  const corners = typeof cut === 'number' ? ([cut, cut, cut, cut] as Corners) : cut;
  const max = Math.max(0, Math.min(width, height) / 2);
  return corners.map((value) => Math.min(Math.max(0, value), max)) as Corners;
}

function points(width: number, height: number, spec: FrameSpec, inset: number): [number, number][] {
  const [tl, tr, br, bl] = resolveCorners(spec.cut, width, height);
  // Shrinking a chamfered box keeps the diagonal gap at `inset` only if the cut shrinks by (2 - √2)·inset.
  const shrink = (2 - Math.SQRT2) * inset;
  const cut = (value: number) => Math.max(0, value - shrink);
  const [l, t, r, b] = [inset, inset, width - inset, height - inset];
  const path: [number, number][] = [[l + cut(tl), t]];
  if (spec.notch) {
    const { offset, width: notchWidth, depth } = spec.notch;
    const slope = Math.min(depth, notchWidth / 2);
    const start = Math.max(l + cut(tl), offset);
    const end = Math.min(r - cut(tr), offset + notchWidth);
    if (end - start > slope * 2) {
      path.push([start, t], [start + slope, t + depth], [end - slope, t + depth], [end, t]);
    }
  }
  path.push(
    [r - cut(tr), t],
    [r, t + cut(tr)],
    [r, b - cut(br)],
    [r - cut(br), b],
    [l + cut(bl), b],
    [l, b - cut(bl)],
    [l, t + cut(tl)],
  );
  return path.filter(([x, y], index, all) => {
    // Square corners collapse a chamfer to a repeated point; the last point may repeat the first.
    const previous = index === all.length - 1 && all[0]?.[0] === x && all[0]?.[1] === y ? all[0] : all[index - 1];
    return !previous || previous[0] !== x || previous[1] !== y;
  });
}

/** SVG path for a chamfered, optionally notched rectangle. */
export function framePath(width: number, height: number, spec: FrameSpec = {}, inset = 0): string {
  if (width <= 0 || height <= 0) return '';
  const [first, ...rest] = points(width, height, spec, inset);
  if (!first) return '';
  return `M${round(first[0])} ${round(first[1])}${rest.map(([x, y]) => `L${round(x)} ${round(y)}`).join('')}Z`;
}

/** Short heavy strokes that hug each cut corner, drawn over the hairline border. */
export function frameAccents(width: number, height: number, spec: FrameSpec = {}, length = 14): string {
  if (width <= 0 || height <= 0) return '';
  const [tl, tr, br, bl] = resolveCorners(spec.cut, width, height);
  const segments: string[] = [];
  const add = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
    segments.push(`M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}L${round(x3)} ${round(y3)}`);
  if (tl) add(0, tl + length, 0, tl, tl, 0);
  if (tr) add(width - tr, 0, width, tr, width, tr + length);
  if (br) add(width, height - br - length, width, height - br, width - br, height);
  if (bl) add(bl, height, 0, height - bl, 0, height - bl - length);
  return segments.join('');
}

export type RulerOptions = {
  x?: number;
  y?: number;
  step?: number;
  /** Every nth tick is a major tick. */
  majorEvery?: number;
  minor?: number;
  major?: number;
  vertical?: boolean;
  /** Which side of the axis ticks grow toward. */
  direction?: 1 | -1;
};

/** A tick ruler along one axis. */
export function rulerPath(
  length: number,
  { x = 0, y = 0, step = 6, majorEvery = 5, minor = 2, major = 4, vertical = false, direction = 1 }: RulerOptions = {},
): string {
  const segments: string[] = [];
  const count = Math.floor(length / step);
  for (let index = 0; index <= count; index += 1) {
    const size = (index % majorEvery === 0 ? major : minor) * direction;
    const offset = index * step;
    segments.push(
      vertical
        ? `M${round(x)} ${round(y + offset)}h${size}`
        : `M${round(x + offset)} ${round(y)}v${size}`,
    );
  }
  return segments.join('');
}

/** Parallel slanted strokes filling a box. */
export function hatchPath(x: number, y: number, width: number, height: number, gap = 4): string {
  const segments: string[] = [];
  for (let offset = 0; offset + height <= width; offset += gap) {
    segments.push(`M${round(x + offset)} ${round(y + height)}L${round(x + offset + height)} ${round(y)}`);
  }
  return segments.join('');
}

export function crossPath(x: number, y: number, size = 3): string {
  return `M${round(x - size)} ${round(y)}h${size * 2}M${round(x)} ${round(y - size)}v${size * 2}`;
}

export type FrameDetail = { inner: string; ticks: string; hatch: string; marks: string };

const INNER_INSET = 5;

/** Secondary linework: an inner rule, edge rulers, a hatch strip and registration crosses. */
export function frameDetail(width: number, height: number, spec: FrameSpec = {}): FrameDetail {
  const empty = { inner: '', ticks: '', hatch: '', marks: '' };
  if (width < 96 || height < 48) return empty;
  const [, tr, br, bl] = resolveCorners(spec.cut, width, height);
  const inner = framePath(width, height, { cut: spec.cut }, INNER_INSET);
  if (width < 160 || height < 72) return { ...empty, inner };
  const bottom = height - INNER_INSET;
  const right = width - INNER_INSET;
  const ticks =
    rulerPath(Math.min(width * 0.28, 150), { x: Math.max(bl, 0) + 18, y: bottom, direction: -1 }) +
    rulerPath(Math.min(height * 0.28, 120), { x: right, y: Math.max(tr, 0) + 24, vertical: true, direction: -1 });
  const hatchWidth = Math.min(72, width * 0.18);
  const hatch = hatchPath(width - br - 10 - hatchWidth, height - 4, hatchWidth, 3, 4);
  const marks = (tr === 0 ? crossPath(right, INNER_INSET) : '') + (bl === 0 ? crossPath(INNER_INSET, bottom) : '');
  return { inner, ticks, hatch, marks };
}

/** Bar widths for a decorative code, stable for a given value. */
/** How many cells of at least `cellWidth` fit in `width` with `gap` between them. */
export function fitCells(width: number, cellWidth: number, gap: number): number {
  if (width <= 0) return 0;
  return Math.max(1, Math.floor((width + gap) / (cellWidth + gap)));
}

/** Whole cells to light for a 0-1 ratio. Only empty shows none, and only complete shows all. */
export function litCells(ratio: number, count: number): number {
  if (ratio <= 0) return 0;
  if (ratio >= 1) return count;
  return Math.min(count - 1, Math.max(1, Math.round(ratio * count)));
}

export function barcodeBars(value: string, count = 28): number[] {
  let hash = 2166136261;
  return Array.from({ length: count }, (_, index) => {
    hash ^= value.charCodeAt(index % Math.max(1, value.length)) + index;
    hash = Math.imul(hash, 16777619);
    return ((hash >>> 8) % 3) + 1;
  });
}
