'use client';
import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Field as BaseField } from '@base-ui/react/field';
import { Form as BaseForm } from '@base-ui/react/form';
import { Input as BaseInput } from '@base-ui/react/input';
import { Meter as BaseMeter } from '@base-ui/react/meter';
import { Progress as BaseProgress } from '@base-ui/react/progress';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { fitCells, litCells } from '@monohud/fx';
import { Lock, cx, mergeClass, useSize, type Tone } from './utils';

export type ButtonProps = BaseButton.Props & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Keeps focus and width, blocks activation and announces the busy state. */
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <BaseButton
      {...props}
      ref={ref}
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      data-loading={loading ? '' : undefined}
      className={mergeClass('mh-button mh-cut mh-lockable', className)}
    >
      {children}
      <Lock />
    </BaseButton>
  );
});

export type InputProps = BaseInput.Props;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <span className="mh-input-shell mh-cut mh-lockable">
      <BaseInput {...props} ref={ref} className={mergeClass('mh-input', className)} />
      <Lock />
    </span>
  );
});

export type FieldProps = Omit<BaseField.Root.Props, 'children'> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** Message for native or custom validation failures. */
  error?: React.ReactNode;
  children: React.ReactNode;
};

export function Field({ label, description, error, className, children, ...props }: FieldProps) {
  return (
    <BaseField.Root {...props} className={mergeClass('mh-field', className)}>
      {label != null && <BaseField.Label className="mh-field__label">{label}</BaseField.Label>}
      {children}
      {description != null && <BaseField.Description className="mh-field__description">{description}</BaseField.Description>}
      <BaseField.Error className="mh-field__error">{error}</BaseField.Error>
    </BaseField.Root>
  );
}

export type FormProps = BaseForm.Props;

export function Form({ className, ...props }: FormProps) {
  return <BaseForm {...props} className={mergeClass('mh-form', className)} />;
}

export type CheckboxProps = BaseCheckbox.Root.Props;

export function Checkbox({ className, children, ...props }: CheckboxProps) {
  const control = (
    <BaseCheckbox.Root {...props} className={mergeClass('mh-checkbox mh-cut mh-lockable', className)}>
      <BaseCheckbox.Indicator className="mh-checkbox__indicator" />
      <Lock />
    </BaseCheckbox.Root>
  );
  return children == null ? control : <label className="mh-choice">{control}{children}</label>;
}

export type SwitchProps = BaseSwitch.Root.Props;

export function Switch({ className, children, ...props }: SwitchProps) {
  const control = (
    <BaseSwitch.Root {...props} className={mergeClass('mh-switch mh-cut mh-lockable', className)}>
      <BaseSwitch.Thumb className="mh-switch__thumb" />
      <span className="mh-switch__mark" aria-hidden="true" />
      <Lock />
    </BaseSwitch.Root>
  );
  return children == null ? control : <label className="mh-choice">{control}{children}</label>;
}

export type RadioGroupProps = BaseRadioGroup.Props;

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <BaseRadioGroup {...props} className={mergeClass('mh-radio-group', className)} />;
}

export type RadioProps = BaseRadio.Root.Props;

export function Radio({ className, children, ...props }: RadioProps) {
  return (
    <label className="mh-choice">
      <BaseRadio.Root {...props} className={mergeClass('mh-radio mh-cut mh-lockable', className)}>
        <BaseRadio.Indicator className="mh-radio__indicator" />
        <Lock />
      </BaseRadio.Root>
      {children}
    </label>
  );
}

export type SliderProps = BaseSlider.Root.Props<number> & {
  label?: React.ReactNode;
  /** Hides the numbered scale, for compact layouts. */
  hideScale?: boolean;
  /** Required when there is no visible `label`. */
  thumbLabel?: string;
};

function Scale({ min = 0, max = 100, className }: { min?: number; max?: number; className: string }) {
  const steps = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(min + (max - min) * ratio));
  return (
    <span className={cx(className, 'mh-micro')} aria-hidden="true">
      {steps.map((step) => (
        <span key={step}>{step}</span>
      ))}
    </span>
  );
}

export function Slider({ label, thumbLabel, hideScale, className, ...props }: SliderProps) {
  return (
    <BaseSlider.Root {...props} className={mergeClass('mh-slider', className)}>
      {label != null && <BaseSlider.Label className="mh-label">{label}</BaseSlider.Label>}
      <BaseSlider.Value className="mh-slider__value" />
      <BaseSlider.Control className="mh-slider__control">
        <BaseSlider.Track className="mh-slider__track">
          <BaseSlider.Indicator className="mh-slider__indicator" />
          <BaseSlider.Thumb aria-label={thumbLabel} className="mh-slider__thumb mh-cut mh-lockable">
            <Lock />
          </BaseSlider.Thumb>
        </BaseSlider.Track>
      </BaseSlider.Control>
      {!hideScale && <Scale className="mh-slider__scale" min={props.min} max={props.max} />}
    </BaseSlider.Root>
  );
}

type BarProps = {
  label?: React.ReactNode;
  tone?: Tone;
  /** Hides the numeric readout. */
  hideValue?: boolean;
  /** Hides the numbered scale under the bar. */
  hideScale?: boolean;
} & BarCellOptions;

type BarCellOptions = {
  /** A number fills smoothly through that many cells. `'auto'` fits cells to the width and lights whole cells only. */
  cells?: number | 'auto';
  /** Pixels between cells. */
  gap?: number;
  /** Smallest cell width in pixels when `cells` is `'auto'`. */
  cellWidth?: number;
};

function barRatio(value: number | null | undefined, min = 0, max = 100) {
  return value == null ? null : Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** Props for a bar's track. The cells replace Base UI's indicator, which can only show a width. */
function useBarTrack({ cells = 'auto', gap = 2, cellWidth = 6 }: BarCellOptions, ratio: number | null) {
  const [track, setTrack] = React.useState<HTMLDivElement | null>(null);
  const auto = cells === 'auto';
  const size = useSize(auto ? track : null);
  const count = auto ? fitCells(size?.width ?? 0, cellWidth, gap) : Math.max(1, Math.round(cells));
  const scaled = (ratio ?? 0) * count;
  const lit = auto ? litCells(ratio ?? 0, count) : Math.floor(scaled);
  const partial = auto ? 0 : scaled - lit;
  const cellStyle = (index: number) => {
    if (ratio === null) return { '--mh-cell-index': index } as React.CSSProperties;
    return index === lit && partial > 0 ? ({ '--mh-cell-fill': `${partial * 100}%` } as React.CSSProperties) : undefined;
  };
  return {
    ref: setTrack,
    style: { '--mh-bar-cells': count, '--mh-bar-gap': `${gap}px` } as React.CSSProperties,
    children: Array.from({ length: count }, (_, index) => (
      <span key={index} className="mh-bar__cell" data-on={index < lit ? '' : undefined} style={cellStyle(index)} />
    )),
  };
}

export type ProgressProps = BaseProgress.Root.Props & BarProps;

export function Progress({ label, tone = 'accent', hideValue, hideScale, cells, gap, cellWidth, className, ...props }: ProgressProps) {
  const track = useBarTrack({ cells, gap, cellWidth }, barRatio(props.value, props.min, props.max));
  return (
    <BaseProgress.Root {...props} data-tone={tone} className={mergeClass('mh-bar', className)}>
      {label != null ? <BaseProgress.Label className="mh-label">{label}</BaseProgress.Label> : <span />}
      {!hideValue && <BaseProgress.Value className="mh-bar__value" />}
      <BaseProgress.Track {...track} className="mh-bar__track" />
      {!hideScale && <Scale className="mh-bar__scale" />}
    </BaseProgress.Root>
  );
}

export type MeterProps = BaseMeter.Root.Props & BarProps;

export function Meter({ label, tone = 'accent', hideValue, hideScale, cells, gap, cellWidth, className, ...props }: MeterProps) {
  const track = useBarTrack({ cells, gap, cellWidth }, barRatio(props.value, props.min, props.max));
  return (
    <BaseMeter.Root {...props} data-tone={tone} className={mergeClass('mh-bar', className)}>
      {label != null ? <BaseMeter.Label className="mh-label">{label}</BaseMeter.Label> : <span />}
      {!hideValue && <BaseMeter.Value className="mh-bar__value" />}
      <BaseMeter.Track {...track} className="mh-bar__track" />
      {!hideScale && <Scale className="mh-bar__scale" min={props.min} max={props.max} />}
    </BaseMeter.Root>
  );
}
