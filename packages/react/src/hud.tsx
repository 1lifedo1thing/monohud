'use client';
import * as React from 'react';
import {
  barcodeBars,
  createTicker,
  decode,
  drawWaveform,
  frameAccents,
  frameDetail,
  framePath,
  motionLevel,
  observeSize,
  type FrameSpec,
  type Notch,
  type Size,
} from '@monohud/fx';
import { useMonohud } from './provider';
import { cx, useIsomorphicLayoutEffect, useMergedStyle, useSize, type Tone } from './utils';

/* Frame */

export type FrameProps = React.ComponentProps<'div'> &
  FrameSpec & {
    /** Plays the line-draw entrance on mount. */
    enter?: boolean;
    /** Milliseconds, for staggering a group of frames. */
    enterDelay?: number;
  };

export function Frame({ cut = [14, 0, 14, 0], notch, enter = true, enterDelay = 0, className, style, children, ...props }: FrameProps) {
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  const size = useSize(element);
  const { motion } = useMonohud();
  const entering = enter && motion !== 'off';
  const spec: FrameSpec = { cut, notch };
  const path = size ? framePath(size.width, size.height, spec) : '';
  const detail = size ? frameDetail(size.width, size.height, spec) : null;

  return (
    <div
      {...props}
      ref={setElement}
      className={cx('mh-frame', className)}
      data-entering={entering ? '' : undefined}
      style={useMergedStyle({ '--mh-enter-delay': `${enterDelay}ms` }, style)}
    >
      {size && detail && (
        <svg className="mh-frame__art" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
          <path className="mh-frame__fill" d={path} />
          <g className="mh-frame__detail">
            <path className="mh-frame__inner" d={detail.inner} />
            <path className="mh-frame__ticks" d={detail.ticks} />
            <path className="mh-frame__hatch" d={detail.hatch} />
            <path className="mh-frame__marks" d={detail.marks} />
          </g>
          <path className="mh-frame__line" d={path} pathLength={1} />
          <path className="mh-frame__accent" d={frameAccents(size.width, size.height, spec)} />
        </svg>
      )}
      <div className="mh-frame__content">{children}</div>
    </div>
  );
}

/* Panel */

export type PanelProps = Omit<FrameProps, 'title' | 'notch'> & {
  title?: React.ReactNode;
  /** Secondary data, right-aligned in the header. */
  meta?: React.ReactNode;
  /** Micro-labels along the bottom edge, as [left, right]. */
  footer?: [React.ReactNode, React.ReactNode?];
};

export function Panel({ title, meta, footer, className, children, ...props }: PanelProps) {
  const [titleElement, setTitleElement] = React.useState<HTMLHeadingElement | null>(null);
  const titleSize = useSize(titleElement);
  // The notch tracks the rendered title, so long and translated headings keep their seat.
  const notch: Notch | undefined =
    titleSize && titleSize.width > 0 ? { offset: 16 + titleSize.width + 6, width: 64, depth: 4 } : undefined;
  return (
    <Frame {...props} notch={notch} className={cx('mh-panel-frame', className)}>
      <div className="mh-panel" style={{ height: '100%' }}>
        {(title != null || meta != null) && (
          <div className="mh-panel__head">
            <h3 ref={setTitleElement} className="mh-panel__title">
              {title}
            </h3>
            {meta != null && <span className="mh-panel__meta">{meta}</span>}
          </div>
        )}
        <div className="mh-panel__body">{children}</div>
        {footer && (
          <div className="mh-panel__foot mh-micro">
            <span>{footer[0]}</span>
            <span>{footer[1]}</span>
          </div>
        )}
      </div>
    </Frame>
  );
}

/* DecodeText */

export type DecodeTextProps = React.ComponentProps<'span'> & {
  text: string;
  duration?: number;
  delay?: number;
};

/** Text that resolves out of noise. Screen readers always receive the final string. */
export function DecodeText({ text, duration, delay, className, ...props }: DecodeTextProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [shown, setShown] = React.useState(text);
  useIsomorphicLayoutEffect(() => {
    if (motionLevel(ref.current) !== 'full') {
      setShown(text);
      return undefined;
    }
    return decode({ text, duration, delay, onFrame: setShown });
  }, [text, duration, delay]);
  return (
    <span {...props} ref={ref} className={cx('mh-decode', className)}>
      <span className="mh-visually-hidden">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}

/* Readout */

export type ReadoutProps = React.ComponentProps<'div'> & {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  /** A secondary line, such as a trend or limit. */
  note?: React.ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
};

export function Readout({ label, value, unit, note, tone, size = 'md', className, ...props }: ReadoutProps) {
  return (
    <div {...props} className={cx('mh-readout', className)} data-tone={tone} data-size={size}>
      <span className="mh-label">{label}</span>
      <span className="mh-readout__row">
        <span className="mh-readout__value">{value}</span>
        {unit != null && <span className="mh-readout__unit">{unit}</span>}
      </span>
      {note != null && <span className="mh-micro">{note}</span>}
    </div>
  );
}

/* Status */

export type StatusProps = React.ComponentProps<'span'> & {
  tone?: Tone | 'idle';
  /** Blinks the mark. Reserve for conditions that need the player's attention. */
  pulse?: boolean;
};

export function Status({ tone = 'idle', pulse, className, children, ...props }: StatusProps) {
  return (
    <span {...props} className={cx('mh-status', className)} data-tone={tone} data-pulse={pulse ? '' : undefined}>
      <span className="mh-status__mark" aria-hidden="true" />
      {children}
    </span>
  );
}

/* Gauge */

export type GaugeProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  value: number;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
  tone?: Tone;
  size?: number;
  ticks?: number;
};

const SWEEP = 270;
const polar = (radius: number, degrees: number, center = 100): [number, number] => {
  const angle = ((degrees - 90) * Math.PI) / 180;
  return [center + Math.cos(angle) * radius, center + Math.sin(angle) * radius];
};
const arc = (radius: number, from: number, to: number) => {
  const [x1, y1] = polar(radius, from);
  const [x2, y2] = polar(radius, to);
  return `M${x1} ${y1}A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

export function Gauge({ value, min = 0, max = 100, label, unit, tone = 'accent', size = 160, ticks = 49, className, style, ...props }: GaugeProps) {
  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
  // The needle stands on the last lit tick, so the two can never disagree.
  const head = Math.round(ratio * (ticks - 1));
  const start = -SWEEP / 2;
  const tickAngle = (index: number) => start + (SWEEP * index) / (ticks - 1);
  const [tipX, tipY] = polar(97, tickAngle(head));
  const [tailX, tailY] = polar(66, tickAngle(head));
  const showScale = size >= 150;
  return (
    <div
      {...props}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cx('mh-gauge', className)}
      data-tone={tone}
      style={useMergedStyle({ '--mh-gauge-size': `${size}px` }, style)}
    >
      <svg className="mh-gauge__svg" viewBox="0 0 200 200" aria-hidden="true">
        <path className="mh-gauge__rim" d={arc(98, start, -start)} />
        {Array.from({ length: ticks }, (_, index) => {
          const degrees = tickAngle(index);
          const [x1, y1] = polar(84, degrees);
          const [x2, y2] = polar(index % 6 === 0 ? 96 : 93, degrees);
          return <line key={index} className="mh-gauge__tick" data-on={index <= head ? '' : undefined} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        <path className="mh-gauge__inner" d={arc(66, start, -start)} />
        {showScale &&
          [0, 0.25, 0.5, 0.75, 1].map((step) => {
            const [x, y] = polar(73, start + SWEEP * step);
            return (
              <text key={step} className="mh-gauge__scale" x={x} y={y} textAnchor="middle" dominantBaseline="central">
                {Math.round(min + (max - min) * step)}
              </text>
            );
          })}
        <line className="mh-gauge__needle" x1={tailX} y1={tailY} x2={tipX} y2={tipY} />
      </svg>
      <div className="mh-gauge__center">
        <span className="mh-gauge__value">{value}</span>
        <span className="mh-label">{unit ?? label}</span>
      </div>
    </div>
  );
}

/* Radar */

export type RadarContact = {
  id: string;
  /** Degrees clockwise from north. */
  bearing: number;
  /** 0 at the centre, 1 at the rim. */
  range: number;
  kind?: 'hostile' | 'friendly' | 'neutral' | 'target';
  label: string;
  /** Short callout drawn beside the contact. */
  code?: string;
};

export type RadarProps = Omit<React.ComponentProps<'div'>, 'onSelect'> & {
  contacts: RadarContact[];
  label: string;
  /** Scope radius in your own units; labels the range rings. */
  range?: number;
  onSelect?: (contact: RadarContact) => void;
};

const SCOPE = 41;

/** Position of a contact in percent of the radar's box, for overlays such as `Reticle`. */
export function radarPoint(bearing: number, range: number): { x: number; y: number } {
  const angle = (bearing * Math.PI) / 180;
  return { x: 50 + Math.sin(angle) * range * SCOPE, y: 50 - Math.cos(angle) * range * SCOPE };
}

export function Radar({ contacts, label, range, onSelect, className, ...props }: RadarProps) {
  const point = (degrees: number, radius: number) => {
    const { x, y } = radarPoint(degrees, radius / SCOPE);
    return [x, y] as const;
  };
  return (
    <div {...props} role="group" aria-label={label} className={cx('mh-radar', className)}>
      <svg className="mh-radar__svg" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="mh-radar__rim" cx="50" cy="50" r="49.4" />
        <g className="mh-radar__fine">
          {[1 / 6, 1 / 2, 5 / 6].map((ratio) => (
            <circle key={ratio} className="mh-radar__ring" cx="50" cy="50" r={SCOPE * ratio} strokeDasharray="0.4 1.2" />
          ))}
          {[30, 60, 120, 150].map((degrees) => {
            const [x1, y1] = point(degrees, SCOPE);
            const [x2, y2] = point(degrees + 180, SCOPE);
            return <line key={degrees} className="mh-radar__ring" x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="0.4 1.2" />;
          })}
        </g>
        {[1 / 3, 2 / 3, 1].map((ratio) => (
          <circle key={ratio} className="mh-radar__ring" cx="50" cy="50" r={SCOPE * ratio} />
        ))}
        <path className="mh-radar__ring" d={`M50 ${50 - SCOPE}V${50 + SCOPE}M${50 - SCOPE} 50H${50 + SCOPE}`} />
        {Array.from({ length: 72 }, (_, index) => {
          const degrees = index * 5;
          const major = degrees % 30 === 0;
          const [x1, y1] = point(degrees, SCOPE + 0.6);
          const [x2, y2] = point(degrees, SCOPE + (major ? 3 : degrees % 10 === 0 ? 2 : 1.3));
          return <line key={degrees} className="mh-radar__tick" data-major={major ? '' : undefined} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        <g className="mh-radar__fine">
          {Array.from({ length: 12 }, (_, index) => {
            const degrees = index * 30;
            const [x, y] = point(degrees, SCOPE + 5.2);
            return (
              <text key={degrees} className="mh-radar__label" x={x} y={y} textAnchor="middle" dominantBaseline="central">
                {String(degrees).padStart(3, '0')}
              </text>
            );
          })}
          {range != null &&
            [1 / 3, 2 / 3, 1].map((ratio) => (
              <text key={ratio} className="mh-radar__label" x={50.8} y={50 - SCOPE * ratio + 2.4}>
                {Math.round(range * ratio)}
              </text>
            ))}
        </g>
        <path className="mh-radar__ship" d="M50 47.8L51.7 52L50 51.2L48.3 52Z" />
      </svg>
      <div className="mh-radar__sweep" aria-hidden="true" />
      {contacts.map((contact) => {
        const { x, y } = radarPoint(contact.bearing, contact.range);
        const blipStyle = { left: `${x}%`, top: `${y}%`, '--_angle': contact.bearing } as React.CSSProperties;
        const tag = contact.code != null && (
          <span className="mh-radar__tag" aria-hidden="true">
            {contact.code}
          </span>
        );
        return onSelect ? (
          <button
            key={contact.id}
            type="button"
            className="mh-radar__blip"
            data-tone={contact.kind}
            aria-label={contact.label}
            style={blipStyle}
            onClick={() => onSelect(contact)}
          >
            {tag}
          </button>
        ) : (
          <span key={contact.id} className="mh-radar__blip" data-tone={contact.kind} role="img" aria-label={contact.label} style={blipStyle}>
            {tag}
          </span>
        );
      })}
    </div>
  );
}

/* Waveform */

export type WaveformProps = Omit<React.ComponentProps<'canvas'>, 'width' | 'height'> & {
  /** 0–1 */
  amplitude?: number;
  seed?: number;
  label: string;
};

export function Waveform({ amplitude = 0.8, seed = 1, label, className, ...props }: WaveformProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const amplitudeRef = React.useRef(amplitude);
  amplitudeRef.current = amplitude;

  React.useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const styles = getComputedStyle(canvas);
    const color = styles.getPropertyValue('--mh-accent').trim();
    const grid = styles.getPropertyValue('--mh-line').trim();
    let size: Size = { width: canvas.clientWidth, height: canvas.clientHeight };

    const paint = (time: number) => {
      if (size.width === 0) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawWaveform(context, size.width, size.height, time, { color, grid, seed, amplitude: amplitudeRef.current });
    };
    const resize = (next: Size) => {
      size = next;
      canvas.width = Math.round(next.width * ratio);
      canvas.height = Math.round(next.height * ratio);
      paint(performance.now());
    };
    resize(size);
    const stopObserving = observeSize(canvas, resize);
    const stopTicking = motionLevel(canvas) === 'off' ? undefined : createTicker(canvas, paint);
    return () => {
      stopObserving();
      stopTicking?.();
    };
  }, [seed]);

  return <canvas {...props} ref={ref} role="img" aria-label={label} className={cx('mh-waveform', className)} />;
}

/* LogStream */

export type LogEntry = { id: string; time: string; text: string; level?: 'info' | 'ok' | 'warn' | 'danger' };

export type LogStreamProps = React.ComponentProps<'ol'> & { entries: LogEntry[]; label: string };

const LEVEL_TAGS = { info: 'INF', ok: 'OK', warn: 'WRN', danger: 'ERR' } as const;

export function LogStream({ entries, label, className, ...props }: LogStreamProps) {
  const ref = React.useRef<HTMLOListElement>(null);
  React.useEffect(() => {
    const list = ref.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [entries]);
  return (
    <ol {...props} ref={ref} role="log" aria-label={label} aria-live="polite" tabIndex={0} className={cx('mh-log', className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="mh-log__entry" data-level={entry.level}>
          <time className="mh-log__time">{entry.time}</time>
          <span className="mh-log__tag">{LEVEL_TAGS[entry.level ?? 'info']}</span>
          <span className="mh-log__text">{entry.text}</span>
        </li>
      ))}
    </ol>
  );
}

/* Reticle */

export type ReticleProps = React.ComponentProps<'div'> & {
  locked?: boolean;
  size?: number;
  /** Micro-label beside the top-left bracket. */
  label?: React.ReactNode;
  /** Micro-label beside the bottom-right bracket. */
  note?: React.ReactNode;
};

export function Reticle({ locked = false, size = 180, label, note, className, style, children, ...props }: ReticleProps) {
  return (
    <div
      {...props}
      className={cx('mh-reticle', className)}
      data-locked={locked ? '' : undefined}
      style={useMergedStyle({ '--mh-reticle-size': `${size}px` }, style)}
    >
      <svg className="mh-reticle__svg" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="mh-reticle__ring" cx="50" cy="50" r="38" strokeDasharray="10 5 2 5" vectorEffect="non-scaling-stroke" />
        <circle className="mh-reticle__ring" data-reverse="" cx="50" cy="50" r="31" strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
        <g className="mh-reticle__brackets" strokeWidth="1.5">
          <path vectorEffect="non-scaling-stroke" d="M6 20V6H20M80 6H94V20M94 80V94H80M20 94H6V80" />
        </g>
        <path vectorEffect="non-scaling-stroke" d="M50 2V10M50 90V98M2 50H10M90 50H98" />
        <path vectorEffect="non-scaling-stroke" d="M50 26V42M50 58V74M26 50H42M58 50H74" />
        <path className="mh-reticle__fine" vectorEffect="non-scaling-stroke" d="M34 49V51M38 49V51M62 49V51M66 49V51M49 34H51M49 38H51M49 62H51M49 66H51" />
      </svg>
      {label != null && <span className="mh-reticle__label mh-micro">{label}</span>}
      {note != null && <span className="mh-reticle__note mh-micro">{note}</span>}
      {children}
    </div>
  );
}

/* GridBackground */

export type GridBackgroundProps = React.ComponentProps<'div'> & { scanlines?: boolean };

export function GridBackground({ scanlines = true, className, ...props }: GridBackgroundProps) {
  return <div {...props} aria-hidden="true" className={cx('mh-grid', className)} data-scanlines={scanlines ? '' : undefined} />;
}

/* Detail primitives */

export type RulerProps = React.ComponentProps<'div'> & {
  /** Numbers or labels spaced evenly along the ruler. */
  marks?: React.ReactNode[];
};

export function Ruler({ marks, className, ...props }: RulerProps) {
  return (
    <div {...props} aria-hidden="true" className={cx('mh-ruler', className)}>
      {marks && (
        <span className="mh-ruler__marks mh-micro">
          {marks.map((mark, index) => (
            <span key={index}>{mark}</span>
          ))}
        </span>
      )}
    </div>
  );
}

export type HatchProps = React.ComponentProps<'div'> & {
  tone?: Tone;
  /** Black-and-yellow style warning stripes, wider and bolder. */
  hazard?: boolean;
};

export function Hatch({ tone, hazard, className, ...props }: HatchProps) {
  return <div {...props} aria-hidden="true" className={cx('mh-hatch', className)} data-tone={tone} data-hazard={hazard ? '' : undefined} />;
}

export type BarcodeProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  value: string;
  /** Prints the value under the bars. */
  showValue?: boolean;
};

export function Barcode({ value, showValue = true, className, ...props }: BarcodeProps) {
  const bars = React.useMemo(() => barcodeBars(value), [value]);
  return (
    <div {...props} aria-hidden="true" className={cx('mh-barcode', className)}>
      <span className="mh-barcode__bars">
        {bars.map((width, index) => (
          <span key={index} style={{ width }} />
        ))}
      </span>
      {showValue && <span className="mh-micro">{value}</span>}
    </div>
  );
}

export type TagProps = React.ComponentProps<'span'> & { tone?: Tone | 'idle' };

export function Tag({ tone = 'idle', className, ...props }: TagProps) {
  return <span {...props} className={cx('mh-tag mh-cut', className)} data-tone={tone} />;
}

export type DataRow = { label: React.ReactNode; value: React.ReactNode; tone?: Tone };

export type DataListProps = React.ComponentProps<'dl'> & { rows: DataRow[] };

export function DataList({ rows, className, ...props }: DataListProps) {
  return (
    <dl {...props} className={cx('mh-datalist', className)}>
      {rows.map((row, index) => (
        <div key={index} className="mh-datalist__row" data-tone={row.tone}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
