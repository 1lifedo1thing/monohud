import * as React from 'react';
import { distortionScale } from '@monohud/fx';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Barcode,
  Button,
  Checkbox,
  DataList,
  DecodeText,
  Dialog,
  Field,
  Gauge,
  Hologram,
  Input,
  LogStream,
  Meter,
  Progress,
  Panel,
  Radar,
  MonohudProvider,
  Starfield,
  Switch,
  TacticalVolume,
  Tape,
  useToast,
} from './index';

const wrap = (node: React.ReactNode) => render(<MonohudProvider motion="off">{node}</MonohudProvider>);

describe('MonohudProvider', () => {
  it('exposes theme and motion as attributes', () => {
    const { container } = render(
      <MonohudProvider theme="ion" motion="subtle">
        x
      </MonohudProvider>,
    );
    expect(container.firstElementChild).toHaveAttribute('data-mh-theme', 'ion');
    expect(container.firstElementChild).toHaveAttribute('data-mh-motion', 'subtle');
  });
});

describe('MonohudProvider defaults', () => {
  it('uses the monochrome theme', () => {
    const { container } = render(<MonohudProvider>x</MonohudProvider>);
    expect(container.firstElementChild).toHaveAttribute('data-mh-theme', 'mono');
  });
});

describe('MonohudProvider distortion', () => {
  it('is on at a low level by default', () => {
    const { container } = render(<MonohudProvider motion="off">x</MonohudProvider>);
    expect(container.firstElementChild).toHaveAttribute('data-mh-distortion');
    expect(container.querySelector('feDisplacementMap')).toHaveAttribute('scale', String(distortionScale(0.15)));
  });

  it('adds no filter at zero', () => {
    const { container } = render(<MonohudProvider distortion={0}>x</MonohudProvider>);
    expect(container.firstElementChild).not.toHaveAttribute('data-mh-distortion');
    expect(container.querySelector('filter')).toBeNull();
  });

  it('points the root at its filter and keeps caller styles', () => {
    const { container } = render(
      <MonohudProvider motion="off" distortion={0.5} style={{ color: 'red' }}>
        x
      </MonohudProvider>,
    );
    const root = container.firstElementChild as HTMLElement;
    const filter = container.querySelector('filter');
    expect(root).toHaveAttribute('data-mh-distortion');
    expect(root.style.getPropertyValue('--mh-warp')).toContain(filter!.id);
    expect(root.style.color).toBe('red');
    expect(filter!.querySelector('feDisplacementMap')).toHaveAttribute('scale');
  });
});

describe('MonohudProvider alert', () => {
  it('exposes the ship condition and keeps a display layer out of the a11y tree', () => {
    const { container } = render(<MonohudProvider alert="red">x</MonohudProvider>);
    expect(container.firstElementChild).toHaveAttribute('data-mh-alert', 'red');
    expect(container.querySelector('.mh-screen')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('space components', () => {
  it('keeps tactical contacts as real, labelled buttons', () => {
    const onSelect = vi.fn();
    wrap(
      <TacticalVolume
        label="Scope"
        selected="a"
        onSelect={onSelect}
        contacts={[
          { id: 'a', bearing: 10, range: 0.5, elevation: 0.4, kind: 'hostile', label: 'Raider' },
          { id: 'b', bearing: 90, range: 0.7, label: 'Tender' },
        ]}
      />,
    );
    const raider = screen.getByRole('button', { name: 'Raider' });
    expect(raider).toHaveAttribute('aria-pressed', 'true');
    expect(raider.querySelector('.mh-reticle')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tender' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  });

  it('wraps tape values and reports them to assistive tech', () => {
    wrap(<Tape label="Heading" value={-10} wrap={360} format={(mark) => String(mark).padStart(3, '0')} />);
    const tape = screen.getByRole('meter', { name: 'Heading' });
    expect(tape).toHaveAttribute('aria-valuenow', '350');
    expect(tape).toHaveAttribute('aria-valuetext', '350');
  });

  it('renders a labelled hologram and a decorative starfield without a GPU', () => {
    const { container } = wrap(
      <>
        <Starfield />
        <Hologram model="corvette" label="Scan" />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Scan' })).toBeInTheDocument();
    expect(container.querySelector('.mh-starfield')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Button', () => {
  it('renders variant hooks and hides the lock brackets from assistive tech', () => {
    wrap(<Button variant="primary">Launch</Button>);
    const button = screen.getByRole('button', { name: 'Launch' });
    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button.querySelector('.mh-lock')).toHaveAttribute('aria-hidden', 'true');
  });

  it('blocks clicks but stays focusable while loading', () => {
    const onClick = vi.fn();
    wrap(
      <Button loading onClick={onClick}>
        Process
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Process' });
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).not.toHaveAttribute('disabled');
  });
});

describe('form controls', () => {
  it('toggles a labelled switch', () => {
    wrap(<Switch>Cloak field</Switch>);
    const control = screen.getByRole('switch', { name: 'Cloak field' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    // The root forwards clicks to a hidden input; happy-dom drops that forwarded click.
    fireEvent.click(control.parentElement!.querySelector('input')!);
    expect(control).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles a labelled checkbox', () => {
    wrap(<Checkbox defaultChecked>Auto evade</Checkbox>);
    expect(screen.getByRole('checkbox', { name: 'Auto evade' })).toHaveAttribute('aria-checked', 'true');
  });

  it('links a field label to its input', () => {
    wrap(
      <Field label="Callsign">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Callsign').tagName).toBe('INPUT');
  });
});

describe('Field', () => {
  it('keeps the error hidden until validation fails', () => {
    wrap(
      <Field label="Callsign" error="Enter a callsign">
        <Input required />
      </Field>,
    );
    expect(screen.queryByText('Enter a callsign')).not.toBeInTheDocument();
  });
});

describe('Dialog', () => {
  it('opens with an accessible title and description', async () => {
    wrap(
      <Dialog.Root>
        <Dialog.Trigger render={<Button />}>Open</Dialog.Trigger>
        <Dialog.Content title="Confirm jump" description="Shields drop" />
      </Dialog.Root>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Confirm jump' })).toBeInTheDocument());
    expect(screen.getByRole('dialog').closest('.mh-root')).not.toBeNull();
  });
});

describe('useToast', () => {
  it('returns the same object across renders, so effects that use it do not restart', () => {
    const seen = new Set<unknown>();
    function Probe() {
      const [, setTick] = React.useState(0);
      seen.add(useToast());
      return <button onClick={() => setTick((tick) => tick + 1)}>Tick</button>;
    }
    wrap(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'Tick' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tick' }));
    expect(seen.size).toBe(1);
  });
});

describe('Dialog trigger', () => {
  function Gate() {
    const [busy, setBusy] = React.useState(true);
    return (
      <Dialog.Root>
        <button onClick={() => setBusy(false)}>Ready</button>
        <Dialog.Trigger render={<Button disabled={busy} />}>Open</Dialog.Trigger>
        <Dialog.Content title="Confirm jump" />
      </Dialog.Root>
    );
  }

  it('follows a disabled Button passed through render, and opens once enabled', async () => {
    wrap(<Gate />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
    expect(trigger).toBeEnabled();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Confirm jump' })).toBeInTheDocument());
  });
});

describe('HUD components', () => {
  it('reports meter values', () => {
    wrap(<Meter label="Shields" value={30} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '30');
  });

  it('hides the switch state mark from assistive technology', () => {
    const { container } = wrap(<Switch aria-label="Cloak" defaultChecked />);
    expect(screen.getByRole('switch', { name: 'Cloak' })).toBeChecked();
    expect(container.querySelector('.mh-switch__mark')).toHaveAttribute('aria-hidden', 'true');
  });

  it('fills smoothly through a fixed cell count', () => {
    const { container } = wrap(<Meter label="Fuel" value={55} cells={10} gap={3} />);
    const cells = container.querySelectorAll<HTMLElement>('.mh-bar__cell');
    expect(cells).toHaveLength(10);
    expect(container.querySelectorAll('.mh-bar__cell[data-on]')).toHaveLength(5);
    expect(cells[5]!.style.getPropertyValue('--mh-cell-fill')).toBe('50%');
    expect((container.querySelector('.mh-bar__track') as HTMLElement).style.getPropertyValue('--mh-bar-gap')).toBe('3px');
  });

  it('lights whole cells when the count is automatic', () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 78, height: 12 } as DOMRect);
    const { container } = wrap(<Progress label="Sync" value={14} max={40} />);
    rect.mockRestore();
    expect(container.querySelectorAll('.mh-bar__cell')).toHaveLength(10);
    expect(container.querySelectorAll('.mh-bar__cell[data-on]')).toHaveLength(4);
    expect(container.querySelector('[style*="--mh-cell-fill"]')).toBeNull();
  });

  it('stands the gauge needle on the last lit tick', () => {
    const { container } = wrap(<Gauge label="Capacitor" value={68} ticks={49} />);
    const lit = container.querySelectorAll('.mh-gauge__tick[data-on]');
    const tick = lit[lit.length - 1]!;
    const needle = container.querySelector('.mh-gauge__needle')!;
    const angle = (line: Element) => Math.atan2(Number(line.getAttribute('y2')) - 100, Number(line.getAttribute('x2')) - 100);
    expect(lit).toHaveLength(34);
    expect(angle(needle)).toBeCloseTo(angle(tick), 5);
  });

  it('exposes a gauge as a meter and clamps lit ticks', () => {
    const { container } = wrap(<Gauge label="Temperature" value={500} max={100} ticks={10} />);
    expect(screen.getByRole('meter', { name: 'Temperature' })).toBeInTheDocument();
    expect(container.querySelectorAll('.mh-gauge__tick[data-on]')).toHaveLength(10);
  });

  it('gives assistive tech the final decoded text', () => {
    wrap(<DecodeText text="Course confirmed" />);
    expect(document.querySelector('.mh-visually-hidden')).toHaveTextContent('Course confirmed');
  });

  it('selects a radar contact', () => {
    const onSelect = vi.fn();
    const contact = { id: 'a', bearing: 0, range: 0.5, label: 'Hostile' };
    wrap(<Radar label="Radar" contacts={[contact]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hostile' }));
    expect(onSelect).toHaveBeenCalledWith(contact);
  });

  it('exposes data rows as a description list', () => {
    wrap(<DataList rows={[{ label: 'Class', value: 'Frigate' }]} />);
    expect(screen.getByRole('term')).toHaveTextContent('Class');
    expect(screen.getByRole('definition')).toHaveTextContent('Frigate');
  });

  it('hides decorative primitives from assistive tech', () => {
    const { container } = wrap(<Barcode value="VSP-0417" />);
    expect(container.querySelector('.mh-barcode')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the panel footer', () => {
    wrap(
      <Panel title="Systems" footer={['BUS A', 'LOAD 63%']}>
        x
      </Panel>,
    );
    expect(screen.getByText('LOAD 63%')).toBeInTheDocument();
  });

  it('announces log entries politely', () => {
    wrap(<LogStream label="Log" entries={[{ id: '1', time: '00:01', text: 'Self-test passed' }]} />);
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
  });
});
