'use client';
import * as React from 'react';
import {
  createStarfield,
  createTicker,
  cssColorToRgb,
  drawHologram,
  drawTactical,
  motionLevel,
  observeSize,
  wireModel,
  type ModelName,
  type Size,
  type Starfield as StarfieldHandle,
  type TacticalContact as DrawnContact,
  type TacticalPoint,
  type WireModel,
} from '@monohud/fx';
import { Reticle, type RadarContact } from './hud';
import { useMonohud } from './provider';
import { cx } from './utils';

/** Keeps a canvas sized to its box at device resolution and repaints it every frame. */
function useCanvasPaint(
  ref: React.RefObject<HTMLCanvasElement | null>,
  paint: (context: CanvasRenderingContext2D, size: Size, time: number) => void,
) {
  const latest = React.useRef(paint);
  latest.current = paint;
  const { motion } = useMonohud();

  React.useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    let size: Size = { width: canvas.clientWidth, height: canvas.clientHeight };
    const repaint = (time: number) => {
      if (size.width === 0) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      latest.current(context, size, time);
    };
    const resize = (next: Size) => {
      size = next;
      canvas.width = Math.round(next.width * ratio);
      canvas.height = Math.round(next.height * ratio);
      repaint(performance.now());
    };
    resize(size);
    const stopObserving = observeSize(canvas, resize);
    const stopTicking = motionLevel(canvas) === 'off' ? undefined : createTicker(canvas, repaint);
    return () => {
      stopObserving();
      stopTicking?.();
    };
  }, [ref, motion]);
}

function useInkColors(ref: React.RefObject<Element | null>) {
  const { theme, alert } = useMonohud();
  const [colors, setColors] = React.useState({ color: '#fff', faint: '#888', danger: '#f44', warn: '#f90', ok: '#6e9', font: 'monospace' });
  React.useEffect(() => {
    if (!ref.current) return;
    const styles = getComputedStyle(ref.current);
    const read = (name: string) => styles.getPropertyValue(name).trim();
    setColors({
      color: read('--mh-accent'),
      faint: read('--mh-line'),
      danger: read('--mh-danger'),
      warn: read('--mh-warn'),
      ok: read('--mh-ok'),
      font: read('--mh-font-data'),
    });
  }, [ref, theme, alert]);
  return colors;
}

/* Starfield */

export type StarfieldProps = React.ComponentProps<'div'> & {
  /** 0 is cruising, 1 is full warp. Change it freely; the stars ease towards it. */
  warp?: number;
  /** Brings a lit planet limb into view, from 0 to 1. */
  body?: number;
  /** Change this value to fire a white-out, for arrivals and impacts. */
  flash?: number;
};

/** Deep-space backdrop in WebGL2. Without WebGL2 it falls back to a plain dark surface. */
export function Starfield({ warp = 0, body = 0, flash = 0, className, ...props }: StarfieldProps) {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const handle = React.useRef<StarfieldHandle | null>(null);
  const state = React.useRef({ warp, body });
  state.current = { warp, body };
  const { motion, theme } = useMonohud();

  React.useEffect(() => {
    if (!canvas.current) return undefined;
    const instance = createStarfield(canvas.current, () => state.current);
    handle.current = instance;
    return () => {
      instance?.dispose();
      handle.current = null;
    };
    // The context stays alive across motion changes; remounting would lose nothing but stars.
  }, [motion]);

  React.useEffect(() => {
    if (!canvas.current) return;
    handle.current?.setAccent(cssColorToRgb(getComputedStyle(canvas.current).getPropertyValue('--mh-accent').trim()));
  }, [theme, motion]);

  const fired = React.useRef(flash);
  React.useEffect(() => {
    if (fired.current !== flash) handle.current?.flash();
    fired.current = flash;
  }, [flash]);

  return (
    <div {...props} aria-hidden="true" className={cx('mh-starfield', className)}>
      <canvas ref={canvas} />
    </div>
  );
}

/* Hologram */

export type HologramProps = Omit<React.ComponentProps<'canvas'>, 'width' | 'height'> & {
  /** A built-in hull, or your own vertices and edges. */
  model: ModelName | WireModel;
  label: string;
  /** 1 is intact. Lower values break up the hull in the danger colour. */
  integrity?: number;
};

/** A slowly turning wireframe with a scan plane passing through the hull. */
export function Hologram({ model, label, integrity = 1, className, ...props }: HologramProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const ink = useInkColors(ref);
  const wire = typeof model === 'string' ? wireModel(model) : model;
  const born = React.useRef({ model: wire, time: 0 });
  useCanvasPaint(ref, (context, size, time) => {
    if (born.current.model !== wire || !born.current.time) born.current = { model: wire, time };
    const off = motionLevel(ref.current) === 'off';
    drawHologram(context, size.width, size.height, off ? 0 : time, {
      model: wire,
      color: ink.color,
      damageColor: ink.danger,
      integrity,
      age: off ? 1000 : time - born.current.time,
    });
  });
  return <canvas {...props} ref={ref} role="img" aria-label={label} className={cx('mh-hologram', className)} />;
}

/* TacticalVolume */

export type TacticalVolumeContact = RadarContact & {
  /** -1 below the ship's plane to 1 above it. */
  elevation?: number;
};

export type TacticalVolumeProps = Omit<React.ComponentProps<'div'>, 'onSelect'> & {
  contacts: TacticalVolumeContact[];
  label: string;
  /** Scope radius in your own units; labels the range rings. */
  range?: number;
  /** Id of the contact carrying the reticle. */
  selected?: string;
  locked?: boolean;
  /** Change this value to draw a weapon beam to the selected contact. */
  shot?: number;
  onSelect?: (contact: TacticalVolumeContact) => void;
  /** The starting camera: `tilted` shows the stalks, `top` looks straight down at the disc. */
  defaultView?: 'tilted' | 'top';
};

const SWEEP_PERIOD = 4000;
const PITCH_LIMITS = [0.5, Math.PI / 2] as const;
const VIEW_PITCH = { tilted: 1.02, top: Math.PI / 2 };

/**
 * A stalk radar in perspective: each contact stands on a line above or below the ship's plane.
 * Contacts stay real buttons, moved over the canvas every frame. Drag or use the arrow keys to
 * orbit the view.
 */
export function TacticalVolume({ contacts, label, range, selected, locked, shot = 0, onSelect, defaultView = 'tilted', className, onKeyDown, ...props }: TacticalVolumeProps) {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const blips = React.useRef(new Map<string, HTMLElement>());
  const view = React.useRef({ yaw: 0, pitch: VIEW_PITCH[defaultView], born: 0, beamUntil: 0, shot });
  const ink = useInkColors(canvas);
  const toneFor = (contact: TacticalVolumeContact) =>
    contact.kind === 'hostile' ? ink.danger : contact.kind === 'friendly' ? ink.ok : contact.kind === 'target' ? ink.color : ink.faint;

  useCanvasPaint(canvas, (context, size, time) => {
    const state = view.current;
    const off = motionLevel(canvas.current) === 'off';
    if (!state.born) state.born = time;
    if (shot !== state.shot) {
      state.shot = shot;
      state.beamUntil = time + 420;
    }
    const drawn: DrawnContact[] = contacts.map((contact) => ({
      id: contact.id,
      bearing: contact.bearing,
      range: contact.range,
      elevation: contact.elevation,
      color: toneFor(contact),
    }));
    const points = drawTactical(context, size.width, size.height, off ? 0 : time, {
      contacts: drawn,
      selected,
      color: ink.color,
      faint: ink.faint,
      font: ink.font,
      yaw: state.yaw,
      pitch: state.pitch,
      age: off ? 2000 : time - state.born,
      range,
      beam: Math.max(0, (state.beamUntil - time) / 420),
      period: SWEEP_PERIOD,
      beamColor: ink.danger,
    });
    place(points);
  });

  const place = (points: Map<string, TacticalPoint>) => {
    for (const [id, point] of points) {
      const element = blips.current.get(id);
      if (!element) continue;
      element.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
      element.style.setProperty('--_echo', point.echo.toFixed(2));
    }
  };

  const orbit = (deltaYaw: number, deltaPitch: number) => {
    const state = view.current;
    state.yaw += deltaYaw;
    state.pitch = Math.min(PITCH_LIMITS[1], Math.max(PITCH_LIMITS[0], state.pitch + deltaPitch));
  };

  const drag = React.useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      {...props}
      role="group"
      aria-label={label}
      tabIndex={0}
      className={cx('mh-tactical', className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        const step = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[event.key];
        if (!step || event.target !== event.currentTarget) return;
        event.preventDefault();
        orbit(step[0]!, step[1]!);
      }}
      onPointerDown={(event) => {
        if (event.target !== canvas.current) return;
        drag.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        orbit((event.clientX - drag.current.x) * 0.006, (event.clientY - drag.current.y) * 0.004);
        drag.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <canvas ref={canvas} className="mh-tactical__canvas" aria-hidden="true" />
      {contacts.map((contact) => {
        const isSelected = contact.id === selected;
        const content = (
          <>
            {isSelected && (
              <Reticle className="mh-tactical__reticle" size={92} locked={locked} note={locked ? 'LOCKED' : 'TRACKING'} />
            )}
            {contact.code != null && (
              <span className="mh-radar__tag" aria-hidden="true">
                {contact.code}
              </span>
            )}
          </>
        );
        const shared = {
          ref: (element: HTMLElement | null) => {
            if (element) blips.current.set(contact.id, element);
            else blips.current.delete(contact.id);
          },
          className: 'mh-radar__blip mh-tactical__blip',
          'data-tone': contact.kind,
          'data-selected': isSelected ? '' : undefined,
          'aria-label': contact.label,
        };
        return onSelect ? (
          <button key={contact.id} {...shared} type="button" aria-pressed={isSelected} onClick={() => onSelect(contact)}>
            {content}
          </button>
        ) : (
          <span key={contact.id} {...shared} role="img">
            {content}
          </span>
        );
      })}
    </div>
  );
}

/* Tape */

export type TapeProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  value: number;
  label: string;
  /** Length of the visible window, in value units. */
  span?: number;
  /** Units between small ticks. */
  step?: number;
  /** Small ticks between numbered ticks. */
  major?: number;
  /** Wraps values at this modulus, as for a compass. */
  wrap?: number;
  vertical?: boolean;
  format?: (value: number) => string;
};

/** A moving-scale instrument, like the heading and airspeed tapes on a fighter HUD. */
export function Tape({ value, label, span = 90, step = 5, major = 6, wrap, vertical, format = String, className, ...props }: TapeProps) {
  const first = Math.ceil((value - span / 2) / step);
  const count = Math.floor((value + span / 2) / step) - first + 1;
  const shown = wrap ? ((value % wrap) + wrap) % wrap : value;
  return (
    <div
      {...props}
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={format(Math.round(shown))}
      className={cx('mh-tape', className)}
      data-vertical={vertical ? '' : undefined}
    >
      <div className="mh-tape__scale" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => {
          const unit = first + index;
          const at = (unit * step - value) / span + 0.5;
          const numbered = unit % major === 0;
          const mark = wrap ? ((unit * step) % wrap + wrap) % wrap : unit * step;
          return (
            <span
              key={unit}
              className="mh-tape__mark"
              data-major={numbered ? '' : undefined}
              style={{ '--_at': `${(vertical ? 1 - at : at) * 100}%`, '--_fade': 1 - Math.abs(at - 0.5) * 1.8 } as React.CSSProperties}
            >
              {numbered && <span className="mh-tape__number">{format(mark)}</span>}
            </span>
          );
        })}
      </div>
      <span className="mh-tape__value">{format(Math.round(shown))}</span>
    </div>
  );
}

/* Cockpit */

export type CockpitProps = React.ComponentProps<'div'>;

/** Gives its `Wing` children depth, and leans them a little towards the pointer. */
export function Cockpit({ className, ...props }: CockpitProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { motion } = useMonohud();

  React.useEffect(() => {
    const element = ref.current;
    if (!element || motion !== 'full' || motionLevel(element) !== 'full') return undefined;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const move = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', move, { passive: true });
    const stop = createTicker(element, () => {
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      element.style.setProperty('--mh-look-x', current.x.toFixed(3));
      element.style.setProperty('--mh-look-y', current.y.toFixed(3));
    });
    return () => {
      window.removeEventListener('pointermove', move);
      stop();
    };
  }, [motion]);

  return <div {...props} ref={ref} className={cx('mh-cockpit', className)} />;
}

export type WingProps = React.ComponentProps<'div'> & { side: 'left' | 'right' };

export function Wing({ side, className, ...props }: WingProps) {
  return <div {...props} className={cx('mh-wing', className)} data-side={side} />;
}
