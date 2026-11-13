import * as React from 'react';
import {
  Barcode,
  Button,
  Checkbox,
  DataList,
  DecodeText,
  Dialog,
  Field,
  Form,
  Frame,
  Gauge,
  Hatch,
  Hologram,
  Input,
  LogStream,
  Menu,
  Meter,
  Panel,
  Progress,
  Radar,
  Radio,
  RadioGroup,
  Readout,
  Reticle,
  Ruler,
  Select,
  Slider,
  Status,
  Switch,
  Tabs,
  TacticalVolume,
  Tag,
  Tape,
  Tooltip,
  Waveform,
  useToast,
} from '@monohud/react';
import type { ModelName } from '@monohud/fx';
import type { Settings } from './App';

const HULLS: ModelName[] = ['corvette', 'frigate', 'freighter', 'swarm'];

export function Catalog({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const [locked, setLocked] = React.useState(false);
  const [text, setText] = React.useState('COURSE CONFIRMED');
  const [tape, setTape] = React.useState(46);

  return (
    <div className="catalog">
      <h1 className="catalog__title">Components</h1>

      <Section title="Volume">
        <div className="catalog__space">
          <div className="catalog__tactical">
            <TacticalVolume
              label="Sample tactical volume. Drag or use arrow keys to orbit"
              range={300}
              defaultView="top"
              selected="a"
              locked={locked}
              contacts={[
                { id: 'a', code: 'A-1', bearing: 52, range: 0.66, elevation: 0.7, kind: 'hostile', label: 'Hostile A-1' },
                { id: 'b', code: 'B-2', bearing: 196, range: 0.48, elevation: -0.5, kind: 'friendly', label: 'Friendly B-2' },
                { id: 'c', code: 'C-3', bearing: 300, range: 0.8, elevation: 0.2, kind: 'neutral', label: 'Neutral C-3' },
              ]}
            />
          </div>
          <div className="catalog__holograms">
            {HULLS.map((hull) => (
              <figure key={hull} className="catalog__hologram">
                <Hologram model={hull} label={`Wireframe ${hull}`} integrity={hull === 'corvette' ? 0.72 : 1} />
                <figcaption className="mh-micro">{hull.toUpperCase()}</figcaption>
              </figure>
            ))}
          </div>
          <div className="catalog__tapes">
            <Tape label="Heading" value={tape} span={120} wrap={360} format={(mark) => String(mark).padStart(3, '0')} />
            <Slider label="Heading" hideScale min={0} max={359} value={tape} onValueChange={(value) => setTape(value as number)} />
          </div>
          <div className="catalog__alert">
            <span className="mh-label">Provider alert</span>
            <div className="row">
              <Button size="sm" onClick={() => settings.setScene({ alert: 'none' })}>
                None
              </Button>
              <Button size="sm" onClick={() => settings.setScene({ alert: 'caution' })}>
                Caution
              </Button>
              <Button size="sm" variant="danger" onClick={() => settings.setScene({ alert: 'red' })}>
                Red alert
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="row">
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Unavailable</Button>
          <Button loading>Working</Button>
          <Button size="sm">Small</Button>
          <Button size="lg" variant="primary">
            Large
          </Button>
        </div>
      </Section>

      <Section title="Form">
        <Form className="catalog__form" onFormSubmit={(values) => toast({ title: 'Callsign registered', description: String(values.callsign), type: 'ok' })}>
          <Field name="callsign" label="Pilot callsign" description="Shown on the fleet channel" error="Enter a callsign">
            <Input required placeholder="e.g. Morningstar" />
          </Field>
          <Field name="pin" label="Unavailable field" disabled>
            <Input defaultValue="Locked" />
          </Field>
          <Select
            label="Fleet"
            placeholder="Choose a fleet"
            items={[
              { value: 'n', label: 'Ursa' },
              { value: 's', label: 'Sagitta' },
              { value: 'x', label: 'Lyra (closed)', disabled: true },
            ]}
          />
          <Slider label="Sensitivity" defaultValue={60} />
          <div className="row">
            <Button variant="primary" type="submit">
              Submit
            </Button>
          </div>
        </Form>
        <div className="stack">
          <Checkbox defaultChecked>Auto evade</Checkbox>
          <Checkbox indeterminate>Some subsystems online</Checkbox>
          <Checkbox disabled>Unavailable option</Checkbox>
          <Switch defaultChecked>Autopilot</Switch>
          <Switch disabled>Unavailable switch</Switch>
          <RadioGroup defaultValue="b" aria-label="Difficulty">
            <Radio value="a">Recruit</Radio>
            <Radio value="b">Veteran</Radio>
            <Radio value="c" disabled>
              Legend (locked)
            </Radio>
          </RadioGroup>
        </div>
      </Section>

      <Section title="Overlays and feedback">
        <div className="row">
          <Menu.Root>
            <Menu.Trigger render={<Button />}>Open menu</Menu.Trigger>
            <Menu.Content>
              <Menu.Item hint="F5">Quick save</Menu.Item>
              <Menu.Item hint="F9">Load save</Menu.Item>
              <Menu.Item disabled>Cloud sync</Menu.Item>
              <Menu.Separator />
              <Menu.Item tone="danger">Quit mission</Menu.Item>
            </Menu.Content>
          </Menu.Root>
          <Tooltip content="Shields take 8 seconds to recover">
            <Button>Hover hint</Button>
          </Tooltip>
          <Dialog.Root>
            <Dialog.Trigger render={<Button variant="danger" />}>Abandon mission</Dialog.Trigger>
            <Dialog.Content tone="danger" title="Abandon this mission?" description="All mission progress and loot will be lost. This can't be undone.">
              <Dialog.Actions>
                <Dialog.Close render={<Button variant="ghost" data-mh-bleep="back" />}>Keep playing</Dialog.Close>
                <Dialog.Close render={<Button variant="danger" />}>Abandon mission</Dialog.Close>
              </Dialog.Actions>
            </Dialog.Content>
          </Dialog.Root>
          <Button onClick={() => toast({ title: 'Achievement unlocked', description: 'First jump completed', type: 'ok' })}>Success toast</Button>
          <Button onClick={() => toast({ title: 'Low fuel', description: 'One jump remaining', type: 'warn' })}>Warning toast</Button>
          <Button onClick={() => toast({ title: 'Under fire', description: 'Shields down 20%', type: 'danger' })}>Danger toast</Button>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs.Root defaultValue="ship">
          <Tabs.List aria-label="Hangar">
            <Tabs.Tab value="ship">Ship</Tabs.Tab>
            <Tabs.Tab value="crew">Crew</Tabs.Tab>
            <Tabs.Tab value="cargo" disabled>
              Cargo
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="ship">Vesper-class frigate, refitted three times.</Tabs.Panel>
          <Tabs.Panel value="crew">42 crew on duty.</Tabs.Panel>
        </Tabs.Root>
      </Section>

      <Section title="Readouts">
        <div className="catalog__bars">
          <Progress label="Downloading supply data" value={64} />
          <Progress label="Calibrating" value={null} tone="info" />
          <Progress label="Fixed: 12 cells, 4px gap" value={64} cells={12} gap={4} hideScale />
          <Progress label="Auto: 1px gap, whole cells" value={64} gap={1} hideScale />
          <Meter label="Shields" value={30} tone="danger" />
          <Meter label="Fuel" value={78} tone="ok" />
        </div>
        <div className="row">
          <Gauge label="Speed" value={72} unit="kn" size={140} />
          <Gauge label="Temperature" value={91} unit="deg" size={140} tone="danger" />
          <Readout label="Credits" value="48,210" size="lg" tone="accent" />
          <div className="stack">
            <Status tone="ok">Online</Status>
            <Status tone="warn">Degraded</Status>
            <Status tone="danger" pulse>
              Under attack
            </Status>
            <Status>Standby</Status>
          </div>
        </div>
      </Section>

      <Section title="HUD components">
        <div className="catalog__hud">
          <Frame className="catalog__frame">
            <div className="catalog__frame-body">Frame: a chamfered outline drawn to the measured size</div>
          </Frame>
          <Panel title="Panel" meta="Notched title">
            The notch in the top edge follows the title as its length changes.
          </Panel>
          <div className="stack">
            <span className="mh-label">Decode text</span>
            <p className="catalog__decode">
              <DecodeText text={text} />
            </p>
            <div className="row">
              <Button size="sm" onClick={() => setText('JUMP COORDINATES LOCKED')}>
                Phrase 1
              </Button>
              <Button size="sm" onClick={() => setText('SIGNAL ACQUIRED 0x7F')}>
                Phrase 2
              </Button>
            </div>
          </div>
          <div className="catalog__reticle">
            <Reticle locked={locked} size={120} />
            <Button size="sm" onClick={() => setLocked(!locked)}>
              {locked ? 'Release lock' : 'Lock'}
            </Button>
          </div>
          <div className="catalog__radar">
            <Radar
              label="Sample radar"
              range={300}
              contacts={[
                { id: 'a', bearing: 60, range: 0.6, kind: 'hostile', label: 'Hostile' },
                { id: 'b', bearing: 200, range: 0.4, kind: 'friendly', label: 'Friendly' },
                { id: 'c', bearing: 300, range: 0.8, kind: 'target', label: 'Target' },
              ]}
            />
          </div>
          <div className="stack">
            <span className="mh-label">Waveform</span>
            <Waveform label="Sample waveform" seed={3} />
            <LogStream
              label="Sample log"
              entries={[
                { id: '1', time: '00:01', text: 'Self-test passed', level: 'ok' },
                { id: '2', time: '00:04', text: 'Coolant pressure low', level: 'warn' },
                { id: '3', time: '00:09', text: 'Bay 2 depressurised', level: 'danger' },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Detail primitives">
        <div className="stack">
          <Ruler marks={['0', '250', '500', '750', '1000']} />
          <Hatch />
          <Hatch hazard tone="warn" />
          <div className="row">
            <Tag>STBY</Tag>
            <Tag tone="accent">ACTIVE</Tag>
            <Tag tone="ok">NOMINAL</Tag>
            <Tag tone="warn">DEGRADED</Tag>
            <Tag tone="danger">BREACH</Tag>
          </div>
        </div>
        <div className="stack">
          <Barcode value="VSP-0417" />
          <DataList
            rows={[
              { label: 'Registry', value: 'VSP-0417' },
              { label: 'Class', value: 'Frigate' },
              { label: 'Crew', value: 42, tone: 'ok' },
            ]}
          />
        </div>
      </Section>

      <p className="catalog__note">Active palette: {settings.theme}. Change it from the Bridge settings menu.</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="catalog__section">
      <h2 className="catalog__heading">{title}</h2>
      <div className="catalog__grid">{children}</div>
    </section>
  );
}
