import { createTicker, motionLevel } from './motion';

export type SpaceState = {
  /** 0 is cruising, 1 is full warp. Eased towards, so it can be set abruptly. */
  warp: number;
  /** 0 hides the planet, 1 shows its limb low in the frame, and above 1 it fills more. Eased towards. */
  body: number;
};

export type Rgb = [number, number, number];

const VERTEX_QUAD = `#version 300 es
out vec2 v;
void main() {
  v = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0;
  gl_Position = vec4(v, 0.0, 1.0);
}`;

/* Rendered small and rarely: the nebula is soft and slow, so it never needs full resolution. */
const FRAGMENT_SKY = `#version 300 es
precision highp float;
in vec2 v;
out vec4 color;
uniform float uTime;
uniform vec2 uAspect;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float value = 0.0, amplitude = 0.5;
  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    amplitude *= 0.5;
  }
  return value;
}
void main() {
  vec2 p = v * uAspect * 1.7;
  float t = uTime * 0.006;
  float warpField = fbm(p + vec2(t, -t * 0.6));
  float density = fbm(p * 1.3 + warpField * 2.4 - vec2(t * 0.5, 0.0));
  float lanes = fbm(p * 3.4 + warpField * 1.6);
  float cloud = smoothstep(0.38, 0.82, density) * (0.42 + 0.58 * lanes);
  color = vec4(cloud, density, lanes, 1.0);
}`;

const FRAGMENT_COMPOSE = `#version 300 es
precision highp float;
in vec2 v;
out vec4 color;
uniform sampler2D uSky;
uniform vec2 uAspect;
uniform vec3 uAccent;
uniform vec3 uPlanet;
uniform float uWarp;
uniform float uBody;
uniform float uFlash;
void main() {
  vec2 p = v * uAspect;
  float radius = length(p);
  vec3 sky = texture(uSky, v * 0.5 + 0.5).rgb;
  vec3 c = vec3(0.016) + vec3(sky.r) * 0.2;
  c += uAccent * uWarp * uWarp * (0.3 * exp(-radius * 2.2) + 0.03);
  if (uBody > 0.001) {
    vec2 toCentre = p - uPlanet.xy;
    float d = length(toCentre);
    float R = uPlanet.z;
    vec3 sun = normalize(vec3(-0.62, 0.56, 0.5));
    if (d < R) {
      float z = sqrt(R * R - d * d) / R;
      vec3 n = vec3(toCentre / R, z);
      float light = max(dot(n, sun), 0.0);
      vec3 surface = texture(uSky, n.xy * 0.42 / (0.55 + z) + 0.5).rgb;
      float terrain = 0.1 + 0.42 * surface.g + 0.5 * surface.r;
      float rim = pow(1.0 - z, 3.0);
      c = mix(c, vec3(0.006), uBody);
      c += vec3(terrain * pow(light, 1.3) * 0.72 + rim * light * 1.5) * uBody;
    } else {
      float lit = max(dot(toCentre / d, sun.xy), 0.0);
      c += vec3(exp(-(d - R) * 26.0) * (0.12 + lit) * 0.62 + exp(-(d - R) * 6.0) * lit * 0.09) * uBody;
    }
  }
  c *= 1.0 - smoothstep(0.7, 1.9, radius) * 0.72;
  c += vec3(uFlash);
  color = vec4(c, 1.0);
}`;

const VERTEX_STARS = `#version 300 es
in vec3 aStar;
in float aMagnitude;
in float aHead;
uniform float uTravel;
uniform float uStreak;
uniform float uPixel;
uniform vec2 uAspect;
out float vBright;
out vec2 vPosition;
void main() {
  float z = fract(aStar.z - uTravel);
  float depth = max(0.012, z + (1.0 - aHead) * uStreak);
  vec2 p = aStar.xy * 0.34 / depth;
  vPosition = p;
  vBright = smoothstep(1.0, 0.72, z) * smoothstep(0.0, 0.05, z) * (0.3 + aMagnitude * 0.7);
  gl_PointSize = (1.0 + aMagnitude * aMagnitude * 2.1 + (1.0 - z) * 1.1) * uPixel;
  gl_Position = vec4(p / uAspect, 0.0, 1.0);
}`;

const FRAGMENT_STARS = `#version 300 es
precision highp float;
in float vBright;
in vec2 vPosition;
out vec4 color;
uniform vec3 uTint;
uniform vec3 uPlanet;
uniform float uBody;
uniform float uRound;
void main() {
  if (uBody > 0.5 && distance(vPosition, uPlanet.xy) < uPlanet.z) discard;
  float shape = 1.0;
  if (uRound > 0.5) {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    shape = smoothstep(1.0, 0.1, d);
  }
  color = vec4(uTint * vBright * shape, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram | null {
  const program = gl.createProgram();
  const shaders = ([
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const).map(([type, source]) => {
    const shader = gl.createShader(type);
    if (shader) {
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
    }
    return shader;
  });
  gl.linkProgram(program);
  // A linked program keeps its own copy, so the shader objects can go straight away.
  for (const shader of shaders) gl.deleteShader(shader);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

type Resources = {
  sky: WebGLProgram;
  compose: WebGLProgram;
  stars: WebGLProgram;
  vao: WebGLVertexArrayObject;
  starData: WebGLBuffer;
  texture: WebGLTexture;
  skyBuffer: WebGLFramebuffer;
};

/** Everything tied to the context. A restored context starts empty, so this runs again then. */
function createResources(gl: WebGL2RenderingContext): Resources | null {
  const sky = compile(gl, VERTEX_QUAD, FRAGMENT_SKY);
  const compose = compile(gl, VERTEX_QUAD, FRAGMENT_COMPOSE);
  const stars = compile(gl, VERTEX_STARS, FRAGMENT_STARS);
  if (!sky || !compose || !stars) return null;

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const starData = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starData);
  gl.bufferData(gl.ARRAY_BUFFER, starBuffer(), gl.STATIC_DRAW);
  const attribute = (name: string, size: number, offset: number) => {
    const location = gl.getAttribLocation(stars, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 20, offset);
  };
  attribute('aStar', 3, 0);
  attribute('aMagnitude', 1, 12);
  attribute('aHead', 1, 16);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  return { sky, compose, stars, vao, starData, texture, skyBuffer: gl.createFramebuffer() };
}

function deleteResources(gl: WebGL2RenderingContext, resources: Resources) {
  gl.deleteProgram(resources.sky);
  gl.deleteProgram(resources.compose);
  gl.deleteProgram(resources.stars);
  gl.deleteVertexArray(resources.vao);
  gl.deleteBuffer(resources.starData);
  gl.deleteTexture(resources.texture);
  gl.deleteFramebuffer(resources.skyBuffer);
}

const STAR_COUNT = 1500;

function starBuffer(): Float32Array {
  const data = new Float32Array(STAR_COUNT * 2 * 5);
  for (let index = 0; index < STAR_COUNT; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.04 + Math.sqrt(Math.random()) * 1.7;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const phase = Math.random();
    const magnitude = Math.random() ** 3;
    data.set([x, y, phase, magnitude, 0, x, y, phase, magnitude, 1], index * 10);
  }
  return data;
}

/** Resolves any CSS colour, including `oklch()`, to linear-ish 0–1 RGB. */
export function cssColorToRgb(value: string): Rgb {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [1, 1, 1];
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [red = 255, green = 255, blue = 255] = context.getImageData(0, 0, 1, 1).data;
  return [red / 255, green / 255, blue / 255];
}

export type Starfield = {
  /** Updates the theme colour used by warp light. */
  setAccent: (rgb: Rgb) => void;
  /** Fires a white-out that decays over about half a second. */
  flash: (strength?: number) => void;
  dispose: () => void;
};

/**
 * WebGL2 backdrop: a nebula, 1500 stars drawn as points that stretch into warp lines, and a lit
 * planet limb. Returns `null` without WebGL2, so the caller's CSS background stands in.
 */
export function createStarfield(canvas: HTMLCanvasElement, state: () => SpaceState): Starfield | null {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;

  let resources = createResources(gl);
  if (!resources) return null;
  const uniform = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);

  const level = motionLevel(canvas);
  let accent: Rgb = [1, 1, 1];
  let width = 0;
  let height = 0;
  let pixel = 1;
  let warp = state().warp;
  let body = state().body;
  let flash = 0;
  let travel = Math.random();
  let last = 0;
  let frames = 0;

  const resize = () => {
    if (!resources) return;
    const { texture, skyBuffer } = resources;
    pixel = Math.min(1.5, window.devicePixelRatio || 1);
    width = Math.max(1, Math.round(canvas.clientWidth * pixel));
    height = Math.max(1, Math.round(canvas.clientHeight * pixel));
    canvas.width = width;
    canvas.height = height;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width >> 2, height >> 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, skyBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    frames = 0;
  };

  const paint = (time: number) => {
    if (!width || !resources) return;
    const { sky, compose, stars, skyBuffer } = resources;
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
    last = time;
    const target = state();
    const pace = level === 'off' ? 1 : 1 - Math.exp(-dt * (target.warp > warp ? 2.4 : 5));
    warp += (target.warp - warp) * pace;
    body += (target.body - body) * (level === 'off' ? 1 : 1 - Math.exp(-dt * 1.6));
    flash *= Math.exp(-dt * 5);
    travel += dt * (0.0035 + warp * warp * warp * 1.3);

    const aspect = width / height;
    const scale: [number, number] = [aspect, 1];
    // Sits low and right so the limb frames the scope instead of crossing it.
    const planetY = -2.02 - (1 - body) * 1.4;
    const planet: [number, number, number] = [aspect * 0.34, planetY, 1.58];

    gl.disable(gl.BLEND);
    if (frames % 24 === 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, skyBuffer);
      gl.viewport(0, 0, width >> 2, height >> 2);
      gl.useProgram(sky);
      gl.uniform1f(uniform(sky, 'uTime'), time / 1000);
      gl.uniform2fv(uniform(sky, 'uAspect'), scale);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    frames += 1;

    gl.viewport(0, 0, width, height);
    gl.useProgram(compose);
    gl.uniform2fv(uniform(compose, 'uAspect'), scale);
    gl.uniform3fv(uniform(compose, 'uAccent'), accent);
    gl.uniform3fv(uniform(compose, 'uPlanet'), planet);
    gl.uniform1f(uniform(compose, 'uWarp'), warp);
    gl.uniform1f(uniform(compose, 'uBody'), body);
    gl.uniform1f(uniform(compose, 'uFlash'), flash);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(stars);
    gl.uniform2fv(uniform(stars, 'uAspect'), scale);
    gl.uniform3fv(uniform(stars, 'uPlanet'), planet);
    gl.uniform1f(uniform(stars, 'uBody'), body);
    gl.uniform1f(uniform(stars, 'uTravel'), travel);
    gl.uniform1f(uniform(stars, 'uPixel'), pixel);
    const tint: Rgb = [0, 1, 2].map((channel) => 1 + (accent[channel as 0]! - 1) * warp * 0.6) as Rgb;

    gl.uniform3fv(uniform(stars, 'uTint'), tint.map((value) => value * (1 - warp * 0.7)));
    gl.uniform1f(uniform(stars, 'uRound'), 1);
    gl.uniform1f(uniform(stars, 'uStreak'), 0);
    gl.drawArrays(gl.POINTS, 0, STAR_COUNT * 2);
    if (warp > 0.01) {
      gl.uniform3fv(uniform(stars, 'uTint'), tint.map((value) => value * Math.min(1, warp * 3)));
      gl.uniform1f(uniform(stars, 'uRound'), 0);
      gl.uniform1f(uniform(stars, 'uStreak'), warp * warp * 0.34);
      gl.drawArrays(gl.LINES, 0, STAR_COUNT * 2);
    }
  };

  const onLost = (event: Event) => {
    // Without this the browser never offers the context back.
    event.preventDefault();
    resources = null;
  };
  const onRestored = () => {
    resources = createResources(gl);
    resize();
    paint(performance.now());
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
    resize();
    paint(performance.now());
  }) : null;
  observer?.observe(canvas);
  resize();
  paint(performance.now());
  const stop = level === 'off' ? undefined : createTicker(canvas, paint);

  return {
    setAccent(rgb) {
      accent = rgb;
      if (level === 'off') paint(performance.now());
    },
    flash(strength = 0.9) {
      // A full-screen flash is a hazard for some players, so it only runs at full motion.
      if (level === 'full') flash = strength;
    },
    dispose() {
      stop?.();
      observer?.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      // Not loseContext(): the canvas hands this same context to the next effect run.
      if (resources) deleteResources(gl, resources);
      resources = null;
    },
  };
}
