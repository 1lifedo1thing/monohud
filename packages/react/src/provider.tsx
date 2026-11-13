'use client';
import * as React from 'react';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import {
  clampDistortion,
  createBleeps,
  createDistortion,
  installBleeps,
  type BleepName,
  type Bleeps,
  type MotionLevel,
} from '@monohud/fx';
import { cx } from './utils';
import { ToastLayer } from './toast';

export type Theme = 'mono' | 'sodium' | 'ion' | 'ember';

export type Alert = 'none' | 'caution' | 'red';

type MonohudContextValue = {
  theme: Theme;
  motion: MotionLevel;
  alert: Alert;
  /** Portals render here so that theme and motion attributes reach floating layers. */
  container: HTMLElement | null;
  play: (name: BleepName) => void;
};

const MonohudContext = React.createContext<MonohudContextValue>({
  theme: 'mono',
  motion: 'full',
  alert: 'none',
  container: null,
  play: () => {},
});

export const useMonohud = () => React.useContext(MonohudContext);

export type MonohudProviderProps = React.ComponentProps<'div'> & {
  theme?: Theme;
  motion?: MotionLevel;
  /** `minimal` hides etched marks and micro-labels, for dense layouts or very small screens. */
  detail?: 'full' | 'minimal';
  /**
   * Signal distortion across the whole interface, from 0 (off) to 1. Defaults to 0.15. Animates
   * with `motion`, and can be driven from game state such as hull damage.
   */
  distortion?: number;
  /** Ship condition. `caution` warms the display edge; `red` floods it and pulses. */
  alert?: Alert;
  /** Interface sound. Off by default; players should opt in. */
  sound?: boolean;
  volume?: number;
};

/** Slips rows of the picture sideways and leaves a faint echo. Uses no hue, so mono stays mono. */
function DistortionFilter({ id, amount, root }: { id: string; amount: number; root: HTMLElement | null }) {
  const filter = React.useRef<SVGFilterElement>(null);
  const { motion } = useMonohud();

  React.useEffect(() => {
    if (!filter.current || !root) return undefined;
    return createDistortion(filter.current, root, amount);
  }, [amount, motion, root]);

  return (
    <svg className="mh-distortion" width="0" height="0" aria-hidden="true">
      <filter ref={filter} id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.0008 0.06" numOctaves={2} seed={1} result="noise" />
        <feColorMatrix in="noise" type="matrix" values="2.4 0 0 0 -0.7  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 1" />
        <feComponentTransfer result="tears">
          <feFuncR type="discrete" tableValues="0.24 0.5 0.5 0.5 0.5 0.5 0.7" />
        </feComponentTransfer>
        <feDisplacementMap in="SourceGraphic" in2="tears" xChannelSelector="R" yChannelSelector="G" result="picture" />
        <feOffset in="picture" dx={1 + amount * 3} result="shifted" />
        <feColorMatrix
          in="shifted"
          type="matrix"
          values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${0.12 + amount * 0.22} 0`}
          result="echo"
        />
        <feBlend in="picture" in2="echo" mode="lighten" />
      </filter>
    </svg>
  );
}

export function MonohudProvider({
  theme = 'mono',
  motion = 'full',
  detail = 'full',
  distortion = 0.15,
  alert = 'none',
  sound = false,
  volume = 0.5,
  className,
  style,
  children,
  ...props
}: MonohudProviderProps) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  const bleeps = React.useRef<Bleeps | null>(null);
  const filterId = React.useId();
  const amount = clampDistortion(distortion);

  React.useEffect(() => {
    if (!sound || !container) return undefined;
    const instance = createBleeps(volume);
    bleeps.current = instance;
    const uninstall = installBleeps(container, instance);
    return () => {
      uninstall();
      instance.dispose();
      bleeps.current = null;
    };
    // Volume updates go through the effect below without rebuilding the audio graph.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound, container]);

  React.useEffect(() => bleeps.current?.setVolume(volume), [volume]);

  const value = React.useMemo<MonohudContextValue>(
    () => ({ theme, motion, alert, container, play: (name) => bleeps.current?.play(name) }),
    [theme, motion, alert, container],
  );

  return (
    <div
      {...props}
      ref={setContainer}
      style={style}
      className={cx('mh-root', className)}
      data-mh-theme={theme}
      data-mh-motion={motion}
      data-mh-detail={detail}
      data-mh-distortion={amount > 0 ? '' : undefined}
      data-mh-alert={alert}
    >
      <MonohudContext.Provider value={value}>
        {amount > 0 && <DistortionFilter id={filterId} amount={amount} root={container} />}
        <BaseToast.Provider>
          <BaseTooltip.Provider delay={250}>
            {children}
            <ToastLayer />
          </BaseTooltip.Provider>
        </BaseToast.Provider>
        <span className="mh-screen" aria-hidden="true" />
      </MonohudContext.Provider>
    </div>
  );
}
