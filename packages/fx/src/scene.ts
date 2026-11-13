/** Wireframe 3D for Canvas 2D: no matrices or GPU, because these scenes are only lines. */

export type Vec3 = readonly [number, number, number];

export type Camera = {
  /** Radians around the vertical axis. */
  yaw: number;
  /** Radians. 0 looks along the plane, π/2 looks straight down. */
  pitch: number;
  distance: number;
  /** Pixels per unit at the origin, multiplied by `distance`. */
  focal: number;
};

export type Projected = { x: number; y: number; depth: number; scale: number };

export function project([x, y, z]: Vec3, camera: Camera, centerX: number, centerY: number): Projected {
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const rx = x * cosYaw + z * sinYaw;
  const rz = -x * sinYaw + z * cosYaw;
  const ry = y * cosPitch + rz * sinPitch;
  const depth = -y * sinPitch + rz * cosPitch;
  const scale = camera.focal / (camera.distance + depth);
  return { x: centerX + rx * scale, y: centerY - ry * scale, depth, scale };
}

/** Plane position for a bearing in degrees clockwise from north, at `range` from the centre. */
export function planePoint(bearing: number, range: number, height = 0): Vec3 {
  const angle = (bearing * Math.PI) / 180;
  return [Math.sin(angle) * range, height, Math.cos(angle) * range];
}

export type WireModel = { vertices: Vec3[]; edges: (readonly [number, number])[] };

const empty = (): WireModel => ({ vertices: [], edges: [] });

function merge(...models: WireModel[]): WireModel {
  const result = empty();
  for (const model of models) {
    const base = result.vertices.length;
    result.vertices.push(...model.vertices);
    result.edges.push(...model.edges.map(([a, b]) => [a + base, b + base] as const));
  }
  return result;
}

type Section = readonly [z: number, halfWidth: number, halfHeight: number, lift?: number];

/** Skins elliptical sections along the z axis. */
function loft(sections: Section[], sides = 8, offset: Vec3 = [0, 0, 0]): WireModel {
  const model = empty();
  sections.forEach(([z, width, height, lift = 0], ring) => {
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2 + Math.PI / sides;
      model.vertices.push([Math.cos(angle) * width + offset[0], Math.sin(angle) * height + lift + offset[1], z + offset[2]]);
      const current = ring * sides + side;
      model.edges.push([current, ring * sides + ((side + 1) % sides)]);
      if (ring > 0) model.edges.push([current, current - sides]);
    }
  });
  return model;
}

function box([x, y, z]: Vec3, [width, height, length]: Vec3): WireModel {
  const vertices: Vec3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) vertices.push([x + sx * width, y + sy * height, z + sz * length]);
  const edges: (readonly [number, number])[] = [
    [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  return { vertices, edges };
}

/** A closed flat outline, mirrored across the centreline when `mirror` is set. */
function plate(points: Vec3[], mirror = true): WireModel {
  const single: WireModel = { vertices: [...points], edges: points.map((_, index) => [index, (index + 1) % points.length] as const) };
  if (!mirror) return single;
  return merge(single, { vertices: points.map(([x, y, z]) => [-x, y, z] as const), edges: single.edges });
}

function ring(z: number, radius: number, sides = 20): WireModel {
  return loft(
    [
      [z - 0.03, radius, radius],
      [z + 0.03, radius, radius],
    ],
    sides,
  );
}

const MODELS = {
  corvette: () =>
    merge(
      loft([[-0.96, 0.1, 0.06], [-0.74, 0.21, 0.11, 0.02], [-0.28, 0.27, 0.14, 0.04], [0.2, 0.19, 0.11, 0.02], [0.66, 0.09, 0.05], [1, 0.012, 0.01, -0.02]]),
      loft([[-0.5, 0.06, 0.05, 0.13], [-0.22, 0.09, 0.07, 0.15], [0.06, 0.03, 0.03, 0.12]], 6),
      loft([[-1.04, 0.075, 0.075], [-0.7, 0.085, 0.085], [-0.22, 0.05, 0.05]], 8, [0.36, -0.03, 0]),
      loft([[-1.04, 0.075, 0.075], [-0.7, 0.085, 0.085], [-0.22, 0.05, 0.05]], 8, [-0.36, -0.03, 0]),
      plate([[0.24, -0.02, 0.22], [0.86, -0.1, -0.5], [0.86, -0.1, -0.74], [0.24, -0.02, -0.56]]),
      plate([[0.4, -0.02, -0.06], [0.68, -0.07, -0.4], [0.5, -0.05, -0.56]]),
      plate([[0.05, 0.14, -0.42], [0.04, 0.38, -0.82], [0.04, 0.38, -0.94], [0.05, 0.12, -0.8]]),
    ),
  frigate: () =>
    merge(
      loft([[-0.92, 0.05, 0.05], [0.92, 0.05, 0.05]], 6),
      loft([[0.5, 0.1, 0.08], [0.72, 0.17, 0.12], [0.94, 0.09, 0.07], [1.02, 0.02, 0.02]]),
      box([0, 0.13, 0.62], [0.08, 0.05, 0.14]),
      ring(0.05, 0.42, 28),
      ring(0.16, 0.42, 28),
      loft([[-1, 0.12, 0.12], [-0.82, 0.17, 0.17], [-0.5, 0.13, 0.13]], 10),
      box([0.28, 0, 0.1], [0.14, 0.02, 0.02]),
      box([-0.28, 0, 0.1], [0.14, 0.02, 0.02]),
      box([0, 0.28, 0.1], [0.02, 0.14, 0.02]),
      box([0, -0.28, 0.1], [0.02, 0.14, 0.02]),
      loft([[-0.98, 0.06, 0.06], [-0.46, 0.07, 0.07], [-0.3, 0.03, 0.03]], 6, [0.27, 0.16, 0]),
      loft([[-0.98, 0.06, 0.06], [-0.46, 0.07, 0.07], [-0.3, 0.03, 0.03]], 6, [-0.27, 0.16, 0]),
    ),
  freighter: () => {
    const parts: WireModel[] = [
      loft([[-1, 0.09, 0.09], [1, 0.05, 0.05]], 6),
      loft([[0.72, 0.16, 0.13, 0.08], [0.9, 0.17, 0.14, 0.08], [1.04, 0.07, 0.07, 0.05]], 8),
      loft([[-1.04, 0.14, 0.14], [-0.84, 0.2, 0.2], [-0.72, 0.13, 0.13]], 10),
    ];
    for (let row = 0; row < 5; row += 1) {
      const z = 0.5 - row * 0.28;
      for (const x of [-0.2, 0.2]) for (const y of [-0.12, 0.13]) parts.push(box([x, y, z], [0.13, 0.08, 0.11]));
    }
    return merge(...parts);
  },
  swarm: () => {
    const parts: WireModel[] = [];
    // Fixed golden-angle spiral, so the formation stays stable between renders.
    for (let index = 0; index < 14; index += 1) {
      const angle = index * 2.399963;
      const radius = 0.2 + Math.sqrt(index / 14) * 0.72;
      const center: Vec3 = [Math.cos(angle) * radius, Math.sin(index * 1.7) * 0.32, Math.sin(angle) * radius];
      const size = 0.11;
      const [x, y, z] = center;
      parts.push({
        vertices: [[x, y, z + size * 1.5], [x - size, y - size * 0.4, z - size], [x + size, y - size * 0.4, z - size], [x, y + size * 0.6, z - size * 0.8]],
        edges: [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]],
      });
    }
    return merge(...parts);
  },
} satisfies Record<string, () => WireModel>;

export type ModelName = keyof typeof MODELS;

const cache = new Map<ModelName, WireModel>();

export function wireModel(name: ModelName): WireModel {
  let model = cache.get(name);
  if (!model) {
    model = MODELS[name]();
    cache.set(name, model);
  }
  return model;
}

const circle = (radius: number, height: number, steps = 96): Vec3[] =>
  Array.from({ length: steps + 1 }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    return [Math.sin(angle) * radius, height, Math.cos(angle) * radius] as const;
  });

function polyline(context: CanvasRenderingContext2D, points: Vec3[], camera: Camera, centerX: number, centerY: number) {
  points.forEach((point, index) => {
    const { x, y } = project(point, camera, centerX, centerY);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
}

const fract = (value: number) => value - Math.floor(value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (value: number) => 1 - (1 - clamp01(value)) ** 3;

/** Lines drawn twice, wide and faint under thin and bright, read as phosphor without a blur pass. */
function glowStroke(context: CanvasRenderingContext2D, alpha: number, width: number) {
  context.globalAlpha = alpha * 0.16;
  context.lineWidth = width * 4;
  context.stroke();
  context.globalAlpha = alpha;
  context.lineWidth = width;
  context.stroke();
}

export type HologramOptions = {
  model: WireModel;
  color: string;
  /** Damaged edges flicker in this colour. */
  damageColor: string;
  /** 0 to 1. Below 1, a share of the hull breaks up. */
  integrity: number;
  /** Milliseconds since this model appeared, for the build-in scan. */
  age: number;
};

export function drawHologram(context: CanvasRenderingContext2D, width: number, height: number, time: number, options: HologramOptions) {
  const { model, color, damageColor, integrity, age } = options;
  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = 'lighter';
  context.lineCap = 'round';
  const unit = Math.min(width / 2.5, height / 1.5);
  const camera: Camera = { yaw: time / 5200 + 0.7, pitch: 0.34, distance: 4, focal: unit * 4 };
  const centerX = width / 2;
  const centerY = height * 0.47;
  const place = (point: Vec3) => project(point, camera, centerX, centerY);

  // Projector plinth, turning against the model.
  const plinth: Camera = { ...camera, yaw: -time / 7000 };
  context.strokeStyle = color;
  for (const [radius, alpha] of [
    [0.78, 0.38],
    [1.04, 0.2],
  ] as const) {
    context.beginPath();
    polyline(context, circle(radius, -0.58, 64), plinth, centerX, centerY);
    context.globalAlpha = alpha;
    context.lineWidth = 1;
    context.stroke();
  }
  context.beginPath();
  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 48) * 360;
    const from = project(planePoint(angle, 0.86, -0.58), plinth, centerX, centerY);
    const to = project(planePoint(angle, index % 4 === 0 ? 0.98 : 0.91, -0.58), plinth, centerX, centerY);
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
  }
  context.globalAlpha = 0.3;
  context.stroke();

  const reveal = -1.1 + easeOut(age / 900) * 2.3;
  const scan = age < 900 ? reveal : Math.sin(time / 1500) * 1.02;
  const buckets: [number, number][][] = [[], [], [], []];
  const hot: [number, number][] = [];
  const damaged: [number, number][] = [];
  const crossings: Projected[] = [];
  const flicker = Math.floor(time / 90);

  for (let index = 0; index < model.edges.length; index += 1) {
    const [a, b] = model.edges[index]!;
    const from = model.vertices[a]!;
    const to = model.vertices[b]!;
    if (Math.max(from[2], to[2]) > reveal + 0.02 && age < 900) continue;
    const start = place(from);
    const end = place(to);
    if ((from[2] - scan) * (to[2] - scan) < 0) {
      const mix = (scan - from[2]) / (to[2] - from[2]);
      crossings.push(place([from[0] + (to[0] - from[0]) * mix, from[1] + (to[1] - from[1]) * mix, scan]));
    }
    const segment: [number, number][] = [
      [start.x, start.y],
      [end.x, end.y],
    ];
    const noise = fract(Math.sin(index * 91.7) * 4375.5);
    if (noise > integrity) {
      if (fract(Math.sin(index * 13.1 + flicker) * 917.3) > 0.45) damaged.push(...segment);
      continue;
    }
    const nearScan = Math.abs((from[2] + to[2]) / 2 - scan);
    if (nearScan < 0.14) hot.push(...segment);
    else buckets[Math.min(3, Math.max(0, Math.floor(((start.depth + end.depth) / 2 + 1.05) * 1.9)))]!.push(...segment);
  }

  const strokeSegments = (segments: [number, number][]) => {
    context.beginPath();
    for (let index = 0; index < segments.length; index += 2) {
      context.moveTo(segments[index]![0], segments[index]![1]);
      context.lineTo(segments[index + 1]![0], segments[index + 1]![1]);
    }
  };

  context.strokeStyle = color;
  buckets.forEach((segments, index) => {
    strokeSegments(segments);
    glowStroke(context, [0.92, 0.66, 0.42, 0.24][index]!, 1);
  });
  strokeSegments(hot);
  glowStroke(context, 1, 1.25);

  context.strokeStyle = damageColor;
  strokeSegments(damaged);
  glowStroke(context, 0.9, 1);

  // The scan plane: a bright slice through the hull and the outline of its sweep.
  context.strokeStyle = color;
  context.fillStyle = color;
  context.globalAlpha = 1;
  for (const point of crossings) context.fillRect(point.x - 1, point.y - 1, 2, 2);
  context.beginPath();
  polyline(
    context,
    [[-1.02, -0.5, scan], [1.02, -0.5, scan], [1.02, 0.5, scan], [-1.02, 0.5, scan], [-1.02, -0.5, scan]],
    camera,
    centerX,
    centerY,
  );
  context.globalAlpha = 0.14;
  context.lineWidth = 1;
  context.stroke();

  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
}

export type TacticalContact = {
  id: string;
  bearing: number;
  /** 0 at the centre, 1 at the rim. */
  range: number;
  /** -1 below the plane to 1 above it. */
  elevation?: number;
  color: string;
};

export type TacticalOptions = {
  contacts: TacticalContact[];
  /** Id of the contact the lead line runs to. */
  selected?: string;
  color: string;
  faint: string;
  font: string;
  yaw: number;
  pitch: number;
  /** Milliseconds since mount, for the rings' power-on. */
  age: number;
  /** Scope radius in caller units, for labels. */
  range?: number;
  /** 0 to 1 while a weapon beam is on screen. */
  beam: number;
  period: number;
  beamColor: string;
};

export type TacticalPoint = { x: number; y: number; echo: number; depth: number };

const STALK_HEIGHT = 0.46;

/** Radius in pixels of a scope that fits the box, bezel included, at this camera pitch. */
export const tacticalRadius = (width: number, height: number, pitch = Math.PI / 2) =>
  Math.min(width * (width < 520 ? 0.39 : 0.45), height / (2.3 * Math.sin(pitch)));

export function drawTactical(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  options: TacticalOptions,
): Map<string, TacticalPoint> {
  const { contacts, selected, color, faint, font, yaw, pitch, age, range, beam, period, beamColor } = options;
  context.clearRect(0, 0, width, height);
  context.lineCap = 'round';
  const radius = tacticalRadius(width, height, pitch);
  const camera: Camera = { yaw, pitch, distance: 3.4, focal: radius * 3.4 };
  const centerX = width / 2;
  // Lifts the near rim into view when tilted, and centres the disc when face-on.
  const centerY = height * 0.5 + radius * 0.115 * Math.cos(pitch);
  const stroke = (points: Vec3[]) => polyline(context, points, camera, centerX, centerY);
  const place = (point: Vec3) => project(point, camera, centerX, centerY);

  const power = easeOut(age / 1500);
  const rings = [0.25, 0.5, 0.75, 1];
  context.globalCompositeOperation = 'lighter';

  // Faint decks above and below give the plane a volume to sit in.
  context.strokeStyle = faint;
  context.lineWidth = 1;
  for (const deck of [-STALK_HEIGHT, STALK_HEIGHT]) {
    context.beginPath();
    stroke(circle(power * 0.82, deck, 72));
    context.globalAlpha = 0.16;
    context.stroke();
  }

  // Disc tint, sweep and rings, far to near.
  const sweepAngle = fract(time / period) * 360;
  const trail = 64;
  const slices = 28;
  for (let index = 0; index < slices; index += 1) {
    const from = sweepAngle - (index * trail) / slices;
    const to = sweepAngle - ((index + 1) * trail) / slices;
    context.beginPath();
    const middle = place([0, 0, 0]);
    context.moveTo(middle.x, middle.y);
    for (let step = 0; step <= 4; step += 1) {
      const point = place(planePoint(from + ((to - from) * step) / 4, power, 0));
      context.lineTo(point.x, point.y);
    }
    context.closePath();
    context.fillStyle = color;
    context.globalAlpha = 0.14 * (1 - index / slices) ** 2;
    context.fill();
  }
  const edge = place(planePoint(sweepAngle, power, 0));
  const hub = place([0, 0, 0]);
  context.beginPath();
  context.moveTo(hub.x, hub.y);
  context.lineTo(edge.x, edge.y);
  context.strokeStyle = color;
  glowStroke(context, 0.9, 1);

  context.strokeStyle = color;
  rings.forEach((ratio, index) => {
    context.beginPath();
    stroke(circle(ratio * power, 0));
    glowStroke(context, index === 3 ? 0.8 : 0.32, 1);
  });

  context.beginPath();
  for (let degrees = 0; degrees < 360; degrees += 30) {
    const from = place(planePoint(degrees, 0.06, 0));
    const to = place(planePoint(degrees, power, 0));
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
  }
  context.globalAlpha = degreesAlpha(power);
  context.lineWidth = 1;
  context.setLineDash([2, 6]);
  context.stroke();
  context.setLineDash([]);

  context.beginPath();
  for (let degrees = 0; degrees < 360; degrees += 2) {
    const major = degrees % 30 === 0;
    const minor = degrees % 10 === 0;
    const from = place(planePoint(degrees, power * 1.008, 0));
    const to = place(planePoint(degrees, power * (major ? 1.05 : minor ? 1.032 : 1.018), 0));
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
  }
  context.globalAlpha = 0.72;
  context.stroke();

  // Bezel labels foreshorten with the plane, which is what sells the volume.
  context.globalCompositeOperation = 'source-over';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  for (let degrees = 0; degrees < 360; degrees += 30) {
    const at = place(planePoint(degrees, power * 1.095, 0));
    const scale = at.scale / camera.focal * camera.distance;
    context.font = `${Math.round(11 * Math.max(0.82, scale))}px ${font}`;
    context.globalAlpha = 0.78 * Math.min(1, scale) * power;
    context.fillText(String(degrees).padStart(3, '0'), at.x, at.y);
  }
  if (range != null) {
    context.font = `11px ${font}`;
    context.globalAlpha = 0.6 * power;
    for (const ratio of rings.slice(1)) {
      const at = place(planePoint(0, ratio * power, 0));
      context.fillText(String(Math.round(range * ratio)), at.x + 18, at.y + 8);
    }
  }
  context.globalCompositeOperation = 'lighter';

  // Own ship.
  const nose = place(planePoint(0, 0.055, 0));
  const left = place(planePoint(142, 0.05, 0));
  const right = place(planePoint(218, 0.05, 0));
  context.beginPath();
  context.moveTo(nose.x, nose.y);
  context.lineTo(left.x, left.y);
  context.lineTo(hub.x, hub.y);
  context.lineTo(right.x, right.y);
  context.closePath();
  context.fillStyle = color;
  context.globalAlpha = 0.95;
  context.fill();

  const points = new Map<string, TacticalPoint>();
  for (const contact of contacts) {
    const elevation = (contact.elevation ?? 0) * STALK_HEIGHT;
    const base = place(planePoint(contact.bearing, contact.range * power, 0));
    const top = place(planePoint(contact.bearing, contact.range * power, elevation));
    const behind = fract((sweepAngle - contact.bearing) / 360);
    points.set(contact.id, { x: top.x, y: top.y, depth: top.depth, echo: Math.max(0, 1 - behind * 1.25) });

    context.strokeStyle = contact.color;
    context.beginPath();
    context.moveTo(base.x, base.y);
    context.lineTo(top.x, top.y);
    glowStroke(context, 0.82, 1);
    context.beginPath();
    stroke(circle(0.018, 0).map(([x, , z]) => {
      const [px, , pz] = planePoint(contact.bearing, contact.range * power, 0);
      return [px + x, 0, pz + z] as const;
    }));
    context.globalAlpha = 0.85;
    context.lineWidth = 1;
    context.stroke();

    // Sonar ping on the plane as the sweep passes.
    if (behind < 0.14) {
      const ping = behind / 0.14;
      context.beginPath();
      stroke(circle(0.018 + ping * 0.1, 0, 32).map(([x, , z]) => {
        const [px, , pz] = planePoint(contact.bearing, contact.range * power, 0);
        return [px + x, 0, pz + z] as const;
      }));
      context.globalAlpha = (1 - ping) * 0.7;
      context.stroke();
    }

    if (contact.id === selected) {
      context.beginPath();
      context.moveTo(hub.x, hub.y);
      context.lineTo(base.x, base.y);
      context.setLineDash([6, 5]);
      context.lineDashOffset = -time / 40;
      context.globalAlpha = 0.72;
      context.stroke();
      context.setLineDash([]);
      context.lineDashOffset = 0;

      if (beam > 0) {
        context.strokeStyle = beamColor;
        context.beginPath();
        context.moveTo(hub.x, hub.y);
        context.lineTo(top.x, top.y);
        glowStroke(context, beam, 2.5);
      }
    }
  }

  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  return points;
}

const degreesAlpha = (power: number) => 0.28 * power;
