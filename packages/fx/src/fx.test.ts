import { describe, expect, it, vi } from 'vitest';
import { createBleeps, installBleeps } from './bleeps';
import { decodeFrame } from './decode';
import { clampDistortion, createDistortion, distortionScale, nextBurst } from './distortion';
import { barcodeBars, fitCells, frameAccents, frameDetail, framePath, hatchPath, litCells, resolveCorners, rulerPath } from './frame';
import { motionLevel } from './motion';
import { planePoint, project, tacticalRadius, wireModel } from './scene';
import { createStarfield } from './space';

describe('framePath', () => {
  it('draws chamfers only on cut corners', () => {
    expect(framePath(100, 50, { cut: [10, 0, 10, 0] })).toBe('M10 0L100 0L100 40L90 50L0 50L0 10Z');
  });

  it('clamps cuts to half the short side', () => {
    expect(resolveCorners(100, 40, 20)).toEqual([10, 10, 10, 10]);
  });

  it('keeps the diagonal gap equal to the inset', () => {
    const cut = 10;
    const inset = 2;
    const [start] = framePath(100, 100, { cut }, inset).slice(1).split('L');
    const [x] = start!.split(' ').map(Number);
    const innerSum = x! + inset;
    expect((innerSum - cut) / Math.SQRT2).toBeCloseTo(inset, 1);
  });

  it('cuts a notch into the top edge', () => {
    const path = framePath(200, 100, { notch: { offset: 40, width: 60, depth: 6 } });
    expect(path).toContain('L46 6L94 6L100 0');
  });

  it('ignores a notch that cannot fit and empty boxes', () => {
    expect(framePath(100, 50, { notch: { offset: 95, width: 60, depth: 6 } })).toBe('M0 0L100 0L100 50L0 50Z');
    expect(framePath(0, 0)).toBe('');
    expect(frameAccents(0, 0)).toBe('');
  });
});

describe('detail geometry', () => {
  it('draws a major tick every nth step', () => {
    expect(rulerPath(12, { step: 6, majorEvery: 2, minor: 2, major: 5 })).toBe('M0 0v5M6 0v2M12 0v5');
  });

  it('fits hatch strokes inside the box', () => {
    expect(hatchPath(0, 0, 8, 3, 4)).toBe('M0 3L3 0M4 3L7 0');
  });

  it('drops detail that would crowd a small frame', () => {
    expect(frameDetail(60, 30).inner).toBe('');
    const small = frameDetail(120, 60);
    expect(small.inner).not.toBe('');
    expect(small.ticks).toBe('');
    expect(frameDetail(400, 200).ticks).not.toBe('');
  });

  it('builds a stable barcode for a value', () => {
    expect(barcodeBars('VSP-0417')).toEqual(barcodeBars('VSP-0417'));
    expect(barcodeBars('VSP-0417')).not.toEqual(barcodeBars('VSP-0418'));
  });
});

describe('bar cells', () => {
  it('fits whole cells and their gaps into a width', () => {
    expect(fitCells(78, 6, 2)).toBe(10);
    expect(fitCells(79, 6, 2)).toBe(10);
    expect(fitCells(4, 6, 2)).toBe(1);
    expect(fitCells(0, 6, 2)).toBe(0);
  });

  it('lights whole cells, keeping empty and complete distinct', () => {
    expect(litCells(0.55, 10)).toBe(6);
    expect(litCells(0, 10)).toBe(0);
    expect(litCells(0.001, 10)).toBe(1);
    expect(litCells(0.999, 10)).toBe(9);
    expect(litCells(1, 10)).toBe(10);
  });
});

describe('decodeFrame', () => {
  it('is blank-padded at the start and exact at the end', () => {
    expect(decodeFrame('LOCK', 1)).toBe('LOCK');
    expect(Array.from(decodeFrame('ABCDEFGHIJ', 0, () => 0, 2)).slice(2).join('')).toBe(' '.repeat(8));
  });

  it('keeps wide characters wide while they resolve', () => {
    const frame = decodeFrame('\u8DC3\u8FC1\u5C31\u7EEA', 0.5, () => 0);
    expect(frame.startsWith('\u8DC3\u8FC1')).toBe(true);
    expect(Array.from(frame)).toHaveLength(4);
    expect(frame).toContain('\u56DE');
  });

  it('preserves spaces', () => {
    expect(decodeFrame('A B', 0, () => 0)[1]).toBe(' ');
  });
});

describe('motionLevel', () => {
  it('reads the nearest data attribute', () => {
    document.body.innerHTML = '<div data-mh-motion="subtle"><span id="x"></span></div>';
    expect(motionLevel(document.getElementById('x'))).toBe('subtle');
  });
});

describe('distortion', () => {
  it('clamps amounts and treats bad input as off', () => {
    expect(clampDistortion(4)).toBe(1);
    expect(clampDistortion(-1)).toBe(0);
    expect(clampDistortion(Number.NaN)).toBe(0);
  });

  it('scales bursts above the resting tear', () => {
    expect(distortionScale(0)).toBe(0);
    expect(distortionScale(0.5, true)).toBeGreaterThan(distortionScale(0.5));
  });

  it('schedules bursts sooner at higher amounts', () => {
    const middle = () => 0.5;
    expect(nextBurst(0, 1, middle).start).toBeLessThan(nextBurst(0, 0.1, middle).start);
    const burst = nextBurst(1000, 0.5, middle);
    expect(burst.start).toBeGreaterThan(1000);
    expect(burst.end).toBeGreaterThan(burst.start);
  });

  it('sets --mh-warp only while a low amount is bursting', () => {
    document.body.innerHTML = `<div id="root" data-mh-motion="off"><svg><filter id="f"><feTurbulence></feTurbulence><feDisplacementMap></feDisplacementMap></filter></svg></div>`;
    const root = document.getElementById('root')!;
    const filter = document.getElementById('f') as unknown as SVGFilterElement;
    const quiet = createDistortion(filter, root, 0.15);
    expect(root.style.getPropertyValue('--mh-warp')).toBe('');
    quiet();
    const loud = createDistortion(filter, root, 0.6);
    expect(root.style.getPropertyValue('--mh-warp')).toContain('#f');
    loud();
    expect(root.style.getPropertyValue('--mh-warp')).toBe('');
  });

  it('holds one still frame when motion is off', () => {
    document.body.innerHTML = `<div id="root" data-mh-motion="off"><svg><filter id="f"><feTurbulence seed="1"></feTurbulence><feDisplacementMap></feDisplacementMap></filter></svg></div>`;
    const filter = document.getElementById('f') as unknown as SVGFilterElement;
    const stop = createDistortion(filter, document.getElementById('root')!, 0.5);
    expect(filter.querySelector('feDisplacementMap')?.getAttribute('scale')).toBe(String(distortionScale(0.5)));
    stop();
  });
});

describe('scene', () => {
  const camera = { yaw: 0, pitch: Math.PI / 2, distance: 4, focal: 400 };

  it('looks straight down at a north-up plane', () => {
    const north = project(planePoint(0, 1), camera, 0, 0);
    const east = project(planePoint(90, 1), camera, 0, 0);
    expect(north.y).toBeLessThan(0);
    expect(Math.abs(north.x)).toBeLessThan(1e-6);
    expect(east.x).toBeGreaterThan(0);
  });

  it('shrinks with depth', () => {
    const near = project([0, 0, -1], { ...camera, pitch: 0 }, 0, 0);
    const far = project([0, 0, 1], { ...camera, pitch: 0 }, 0, 0);
    expect(near.scale).toBeGreaterThan(far.scale);
  });

  it('builds every hull with edges that reference real vertices', () => {
    for (const name of ['corvette', 'frigate', 'freighter', 'swarm'] as const) {
      const { vertices, edges } = wireModel(name);
      expect(edges.length).toBeGreaterThan(20);
      expect(edges.every(([a, b]) => a < vertices.length && b < vertices.length)).toBe(true);
    }
  });

  it('fits the scope and its bezel inside narrow boxes', () => {
    expect(tacticalRadius(345, 800) * 1.15).toBeLessThan(345 / 2);
    expect(tacticalRadius(1000, 400) * 1.15).toBeCloseTo(200);
    expect(tacticalRadius(1000, 400, 1.02)).toBeGreaterThan(tacticalRadius(1000, 400));
  });
});

describe('createStarfield', () => {
  const setup = (motion: string) => {
    document.body.innerHTML = `<div data-mh-motion="${motion}"><canvas id="c"></canvas></div>`;
    const canvas = document.getElementById('c') as HTMLCanvasElement;
    const calls: Record<string, number> = {};
    // Any method is callable, so this follows the code without restating the WebGL API.
    const gl = new Proxy(
      {} as Record<string, unknown>,
      {
        get: (spies, name: string) =>
          spies[name] ?? (name === name.toUpperCase()
            ? 1
            : (...args: unknown[]) => {
                calls[name] = (calls[name] ?? 0) + 1;
                return name === 'getProgramParameter' ? args.length > 0 : name.startsWith('get') ? 0 : {};
              }),
      },
    );
    canvas.getContext = (() => gl) as never;
    return { canvas, calls, state: () => ({ warp: 0, body: 0 }) };
  };

  // The ticker never runs here, so a restore forces the one paint that shows the stored flash.
  const flashAt = (motion: string) => {
    const { canvas, state } = setup(motion);
    const values: number[] = [];
    const starfield = createStarfield(canvas, state)!;
    const gl = canvas.getContext('webgl2') as unknown as { uniform1f: (at: unknown, value: number) => void; getUniformLocation: (p: unknown, name: string) => unknown };
    gl.getUniformLocation = (_, name) => name;
    gl.uniform1f = (at, value) => {
      if (at === 'uFlash') values.push(value);
    };
    return { canvas, starfield, values };
  };

  it('only flashes at full motion', () => {
    for (const [motion, lit] of [['full', true], ['subtle', false]] as const) {
      const { canvas, starfield, values } = flashAt(motion);
      starfield.flash(0.9);
      canvas.dispatchEvent(new Event('webglcontextrestored'));
      expect(values.length).toBeGreaterThan(0);
      expect(values.at(-1)! > 0).toBe(lit);
      starfield.dispose();
    }
  });

  it('returns null without WebGL2', () => {
    const { canvas } = setup('off');
    canvas.getContext = (() => null) as never;
    expect(createStarfield(canvas, () => ({ warp: 0, body: 0 }))).toBeNull();
  });

  it('asks to keep a lost context and rebuilds when it returns', () => {
    const { canvas, calls, state } = setup('off');
    const starfield = createStarfield(canvas, state)!;
    expect(calls.createProgram).toBe(3);
    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    const drawn = calls.drawArrays;
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(calls.createProgram).toBe(6);
    expect(calls.drawArrays).toBeGreaterThan(drawn!);
    starfield.dispose();
  });

  it('frees GPU objects and stops listening on dispose', () => {
    const { canvas, calls, state } = setup('off');
    createStarfield(canvas, state)!.dispose();
    expect(calls.deleteProgram).toBe(3);
    expect(calls.deleteBuffer).toBe(1);
    expect(calls.deleteTexture).toBe(1);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(calls.createProgram).toBe(3);
  });
});

describe('installBleeps', () => {
  it('plays for enabled controls and honours data-mh-bleep', () => {
    document.body.innerHTML = '<button id="a">a</button><button id="b" data-mh-bleep="back">b</button><button id="c" disabled>c</button>';
    const bleeps = { ...createBleeps(), play: vi.fn() };
    const uninstall = installBleeps(document.body, bleeps);
    const click = (id: string) => document.getElementById(id)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    click('a');
    click('b');
    click('c');
    expect(bleeps.play.mock.calls).toEqual([['confirm'], ['back']]);
    uninstall();
  });
});
