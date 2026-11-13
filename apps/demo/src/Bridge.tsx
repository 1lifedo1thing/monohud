import * as React from 'react';
import {
  Barcode,
  Button,
  Cockpit,
  DataList,
  DecodeText,
  Dialog,
  Gauge,
  Hatch,
  Hologram,
  LogStream,
  Menu,
  Meter,
  Panel,
  Progress,
  Readout,
  Select,
  Slider,
  Status,
  Switch,
  TacticalVolume,
  Tag,
  Tape,
  Tooltip,
  Waveform,
  Wing,
  useToast,
  type LogEntry,
  type TacticalVolumeContact,
  type Theme,
} from '@monohud/react';
import type { ModelName } from '@monohud/fx';
import type { Settings } from './App';

type Contact = TacticalVolumeContact & {
  name: string;
  distance: number;
  threat: 'High' | 'Medium' | 'None';
  hull: string;
  model: ModelName;
  speed: number;
  heading: string;
  signature: string;
};

type Location = { name: string; sector: string; body: number; contacts: Contact[] };

const SCOPE_RANGE = 660;

const LOCATIONS: Location[] = [
  {
    name: 'Dubhe Lane',
    sector: '7-G / Ursa',
    body: 0.8,
    contacts: [
      { id: 'k7', code: 'K-7', bearing: 38, range: 0.62, elevation: 0.7, kind: 'hostile', label: 'Marauder K-7', name: 'Marauder K-7', distance: 412, threat: 'High', hull: 'Corvette', model: 'corvette', speed: 318, heading: '214', signature: '0.82' },
      { id: 'hx', code: 'HX-2', bearing: 121, range: 0.44, elevation: -0.45, kind: 'neutral', label: 'Freighter Hermes', name: 'Freighter Hermes', distance: 226, threat: 'None', hull: 'Bulk hauler', model: 'freighter', speed: 94, heading: '307', signature: '1.40' },
      { id: 'ws', code: 'SEL-1', bearing: 214, range: 0.8, elevation: 0.3, kind: 'friendly', label: 'Wingman Selene', name: 'Wingman Selene', distance: 533, threat: 'None', hull: 'Frigate', model: 'frigate', speed: 240, heading: '041', signature: '0.65' },
      { id: 'r3', code: 'R-3', bearing: 306, range: 0.5, elevation: -0.8, kind: 'hostile', label: 'Drone Swarm R-3', name: 'Drone Swarm R-3', distance: 334, threat: 'Medium', hull: 'Swarm x14', model: 'swarm', speed: 402, heading: '128', signature: '0.21' },
    ],
  },
  {
    name: 'Mizar Anchorage',
    sector: '4-C / Ursa',
    body: 1.2,
    contacts: [
      { id: 'mz', code: 'MZ-9', bearing: 342, range: 0.72, elevation: 0.2, kind: 'neutral', label: 'Mizar traffic control', name: 'Mizar Control', distance: 475, threat: 'None', hull: 'Station tender', model: 'freighter', speed: 12, heading: '162', signature: '2.10' },
      { id: 'ws', code: 'SEL-1', bearing: 96, range: 0.36, elevation: 0.5, kind: 'friendly', label: 'Wingman Selene', name: 'Wingman Selene', distance: 238, threat: 'None', hull: 'Frigate', model: 'frigate', speed: 210, heading: '041', signature: '0.65' },
      { id: 'q4', code: 'Q-4', bearing: 188, range: 0.86, elevation: -0.6, kind: 'hostile', label: 'Raider Q-4', name: 'Raider Q-4', distance: 568, threat: 'High', hull: 'Corvette', model: 'corvette', speed: 344, heading: '012', signature: '0.77' },
    ],
  },
];

const WEAPONS = [
  { value: 'rail', label: 'Railgun', hint: '12 rds' },
  { value: 'pulse', label: 'Pulse laser', hint: 'Charged' },
  { value: 'torp', label: 'Plasma torpedo', hint: '3 rds' },
  { value: 'emp', label: 'EMP', hint: 'Offline', disabled: true },
];

const THEMES: { value: Theme; label: string }[] = [
  { value: 'mono', label: 'Mono' },
  { value: 'sodium', label: 'Sodium' },
  { value: 'ion', label: 'Ion' },
  { value: 'ember', label: 'Ember' },
];

const CHARGE_STEP = 92;
const TRANSIT_TIME = 3000;

const pad = (value: number, length = 2) => String(value).padStart(length, '0');
const stamp = (seconds: number) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

let logId = 3;

function HeadingTape({ base }: { base: number }) {
  const [value, setValue] = React.useState(base);
  React.useEffect(() => {
    const started = performance.now();
    const timer = setInterval(() => {
      const time = (performance.now() - started) / 1000;
      setValue(base + Math.sin(time / 7) * 6 + Math.sin(time / 2.3) * 1.2);
    }, 80);
    return () => clearInterval(timer);
  }, [base]);
  return <Tape className="scope__heading" label="Ship heading" value={value} span={120} step={5} major={6} wrap={360} format={(mark) => pad(mark, 3)} />;
}

export function Bridge({ settings }: { settings: Settings }) {
  const { setScene } = settings;
  const { toast } = useToast();
  const [clock, setClock] = React.useState(1127);
  const [place, setPlace] = React.useState(0);
  const [contacts, setContacts] = React.useState(LOCATIONS[0]!.contacts);
  const [damage, setDamage] = React.useState<Record<string, number>>({});
  const [targetId, setTargetId] = React.useState('k7');
  const [locked, setLocked] = React.useState(false);
  const [weapon, setWeapon] = React.useState<string | null>('rail');
  const [shield, setShield] = React.useState(72);
  const [engines, setEngines] = React.useState(45);
  const [hull, setHull] = React.useState(88);
  const [cloak, setCloak] = React.useState(false);
  const [charge, setCharge] = React.useState<number | null>(null);
  const [transit, setTransit] = React.useState(false);
  const [underFire, setUnderFire] = React.useState(false);
  const [shot, setShot] = React.useState(0);
  const [log, setLog] = React.useState<LogEntry[]>([
    { id: '1', time: stamp(1094), text: 'Cleared Dubhe Gate' },
    { id: '2', time: stamp(1108), text: 'Selene reports the lane is clear', level: 'ok' },
    { id: '3', time: stamp(1121), text: 'Long-range array found two hostile signals', level: 'warn' },
  ]);
  const clockRef = React.useRef(clock);
  clockRef.current = clock;

  const location = LOCATIONS[place]!;
  const destination = LOCATIONS[(place + 1) % LOCATIONS.length]!;
  const target = contacts.find((contact) => contact.id === targetId) ?? contacts[0]!;
  const integrity = 1 - (damage[target.id] ?? 0);
  const hostiles = contacts.filter((contact) => contact.kind === 'hostile').length;
  const jumping = charge !== null || transit;

  const report = React.useCallback((text: string, level?: LogEntry['level']) => {
    logId += 1;
    const entry = { id: String(logId), time: stamp(clockRef.current), text, level };
    setLog((entries) => [...entries.slice(-40), entry]);
  }, []);

  // Returning from the catalog restarts the bridge, so the scene has to follow it.
  React.useEffect(() => setScene({ warp: 0, body: LOCATIONS[0]!.body, alert: 'none' }), [setScene]);

  React.useEffect(() => {
    const timer = setInterval(() => setClock((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const reactor = Math.min(100, Math.round(shield * 0.5 + engines * 0.6 + (cloak ? 20 : 0)));
  const overloaded = reactor >= 85;

  React.useEffect(() => {
    setScene({ alert: underFire || hull < 40 ? 'red' : locked || overloaded || charge !== null ? 'caution' : 'none' });
  }, [underFire, hull, locked, overloaded, charge, setScene]);

  React.useEffect(() => {
    if (charge === null) return undefined;
    if (charge >= 100) {
      setCharge(null);
      setTransit(true);
      setScene((scene) => ({ warp: 1, body: 0, flash: scene.flash + 1, surge: 0.5 }));
      report(`Jump engaged, bound for ${destination.name}`, 'warn');
      return undefined;
    }
    setScene({ warp: (charge / 100) ** 2 * 0.3, surge: (charge / 100) * 0.24 });
    const timer = setTimeout(() => setCharge(charge + 4), CHARGE_STEP);
    return () => clearTimeout(timer);
  }, [charge, destination.name, report, setScene]);

  React.useEffect(() => {
    if (!transit) return undefined;
    const timer = setTimeout(() => {
      setPlace((value) => (value + 1) % LOCATIONS.length);
      setContacts(destination.contacts);
      setDamage({});
      setTargetId(destination.contacts[0]!.id);
      setLocked(false);
      setTransit(false);
      setHull((value) => Math.min(100, value + 6));
      setScene((scene) => ({ warp: 0, body: destination.body, flash: scene.flash + 1, surge: 0.42 }));
      report(`Arrived at ${destination.name}`, 'ok');
      toast({ title: 'Jump complete', description: `Arrived at ${destination.name}`, type: 'ok' });
    }, TRANSIT_TIME);
    return () => clearTimeout(timer);
  }, [transit, destination, report, setScene, toast]);

  const selectContact = (contact: TacticalVolumeContact) => {
    const next = contacts.find((item) => item.id === contact.id);
    if (!next || next.id === target.id) return;
    setTargetId(next.id);
    setLocked(false);
    report(`Target changed: ${next.name}`);
  };

  const toggleLock = () => {
    setLocked(!locked);
    report(locked ? `Lock released on ${target.name}` : `Locked on ${target.name}`, locked ? undefined : 'warn');
  };

  const fire = () => {
    const name = WEAPONS.find((item) => item.value === weapon)?.label ?? 'Weapon';
    const struck = target;
    const taken = (damage[struck.id] ?? 0) + 0.26;
    setShot((value) => value + 1);
    setScene((scene) => ({ surge: Math.max(scene.surge, 0.12) }));

    if (taken >= 1) {
      const rest = contacts.filter((contact) => contact.id !== struck.id);
      setContacts(rest);
      setLocked(false);
      if (rest[0]) setTargetId(rest[0].id);
      report(`${struck.name} destroyed`, 'ok');
      toast({ title: 'Target destroyed', description: struck.name, type: 'ok', timeout: 3000 });
      return;
    }

    setDamage((values) => ({ ...values, [struck.id]: taken }));
    report(`${name} hit ${struck.name}, ${Math.round((1 - taken) * 100)}% hull left`, 'warn');
    if (struck.kind !== 'hostile') return;

    // Hostiles answer, so firing has a cost. Shields take most of it.
    setTimeout(() => {
      setUnderFire(true);
      setShield((value) => Math.max(0, value - 9));
      setHull((value) => Math.max(0, value - 5));
      setScene({ surge: 0.75 });
      report(`Return fire from ${struck.name}`, 'danger');
      toast({ title: 'Hull impact', description: `${struck.name} returned fire`, type: 'danger', timeout: 2600 });
      setTimeout(() => setUnderFire(false), 2600);
    }, 720);
  };

  const threatTone = target.threat === 'High' ? 'danger' : target.threat === 'Medium' ? 'warn' : 'ok';

  return (
    <Cockpit className="bridge" data-transit={transit ? '' : undefined}>
      <header className="bridge__head">
        <div className="bridge__id">
          <h1 className="bridge__ship">
            <DecodeText text="VESPER" duration={900} />
          </h1>
          <Barcode value="VSP-0417" />
          <Status tone={underFire ? 'danger' : locked ? 'warn' : 'ok'} pulse={locked || underFire}>
            {underFire ? 'Under fire' : locked ? 'Weapons free' : 'Cruising'}
          </Status>
        </div>
        <div className="bridge__facts">
          <Readout label="Mission clock" value={stamp(clock)} size="sm" />
          <Readout label="Sector" value={location.sector} size="sm" />
          <Readout label="Position" value={location.name} size="sm" />
          <Menu.Root>
            <Menu.Trigger render={<Button size="sm" />}>Settings</Menu.Trigger>
            <Menu.Content align="end">
              {THEMES.map((theme) => (
                <Menu.Item key={theme.value} onClick={() => settings.setTheme(theme.value)} hint={settings.theme === theme.value ? 'Active' : undefined}>
                  {theme.label} palette
                </Menu.Item>
              ))}
              <Menu.Separator />
              <Menu.Item onClick={() => settings.setMotion(settings.motion === 'full' ? 'subtle' : 'full')}>
                {settings.motion === 'full' ? 'Reduce motion' : 'Restore full motion'}
              </Menu.Item>
            </Menu.Content>
          </Menu.Root>
        </div>
      </header>

      <Wing side="left" className="bridge__wing" key={`left-${place}`}>
        <Panel title="Ship systems" meta="SYS-01" footer={['BUS A / NOMINAL', `LOAD ${reactor}%`]} enterDelay={200}>
          <div className="stack">
            <Meter label="Shields" value={shield} tone="info" hideScale />
            <Meter label="Hull integrity" value={hull} tone={hull < 40 ? 'danger' : 'ok'} hideScale />
            <Meter label="Reactor load" value={reactor} tone={overloaded ? 'warn' : 'accent'} hideScale />
            <hr className="rule" />
            <Slider label="Shield power" value={shield} hideScale onValueChange={(value) => setShield(value as number)} />
            <Slider label="Engine power" value={engines} hideScale onValueChange={(value) => setEngines(value as number)} />
            <div className="row row--between">
              <Switch checked={cloak} onCheckedChange={setCloak}>
                Cloak field
              </Switch>
              <Tag tone={cloak ? 'accent' : 'idle'}>{cloak ? 'ACTIVE' : 'STBY'}</Tag>
            </div>
          </div>
        </Panel>
        <Panel title="Power" meta="PWR-03" enterDelay={320}>
          <div className="power">
            <Gauge label="Main capacitor" unit="cap" value={100 - Math.round(reactor / 2)} size={112} tone={overloaded ? 'warn' : 'accent'} />
            <div className="stack stack--tight">
              <span className="mh-label">Comms carrier</span>
              <Waveform label="Comms carrier signal" amplitude={0.45 + engines / 200} />
            </div>
          </div>
        </Panel>
        <Panel title="Bridge log" meta={`${log.length} entries`} className="bridge__log" enterDelay={440}>
          <LogStream entries={log} label="Bridge log" className="bridge__logstream" />
        </Panel>
      </Wing>

      <section className="scope" aria-label="Tactical display">
        <HeadingTape base={place === 0 ? 42 : 188} />
        <Tape className="scope__speed" vertical label="Velocity" value={120 + engines * 6} span={400} step={20} major={5} />
        <Tape className="scope__range" vertical label="Target range" value={target.distance} span={300} step={10} major={5} />
        <TacticalVolume
          className="scope__volume"
          contacts={contacts}
          label="Tactical volume. Select a contact, drag or use arrow keys to orbit"
          range={SCOPE_RANGE}
          selected={target.id}
          locked={locked}
          shot={shot}
          onSelect={selectContact}
        />
        <span className="scope__note scope__note--left mh-micro">
          {SCOPE_RANGE} KM SCOPE
          <br />
          {contacts.length} CONTACTS / {hostiles} HOSTILE
        </span>
        <span className="scope__note scope__note--right mh-micro">
          TGT {target.code}
          <br />
          BRG {pad(target.bearing, 3)} / EL {Math.round((target.elevation ?? 0) * 45)}
        </span>
      </section>

      <div className="command">
        <DataList
          className="command__data"
          rows={[
            { label: 'Destination', value: destination.name.toUpperCase() },
            { label: 'Distance', value: '4.2 LY' },
          ]}
        />
        <div className="command__action">
          <Hatch className="command__hatch" hazard={charge !== null} tone={charge !== null ? 'warn' : undefined} />
          {charge === null ? (
            <Dialog.Root>
              <Dialog.Trigger render={<Button variant="primary" size="lg" disabled={transit} />}>Start jump</Dialog.Trigger>
              <Dialog.Content
                code={`JMP-CONFIRM / ${destination.name.toUpperCase()}`}
                title={`Confirm jump to ${destination.name}`}
                description="Shields drop for about 12 seconds during the jump. Hostile signals are active and you will lose wingman cover."
              >
                <DataList
                  rows={[
                    { label: 'Fuel cost', value: '22%' },
                    { label: 'Charge time', value: '2.3 S' },
                    { label: 'Hostiles in range', value: hostiles, tone: hostiles ? 'danger' : 'ok' },
                  ]}
                />
                <Dialog.Actions>
                  <Dialog.Close render={<Button variant="ghost" data-mh-bleep="back" />}>Cancel</Dialog.Close>
                  <Dialog.Close
                    render={<Button variant="primary" />}
                    onClick={() => {
                      setCharge(0);
                      report('Jump drive charging', 'warn');
                    }}
                  >
                    Start charging
                  </Dialog.Close>
                </Dialog.Actions>
              </Dialog.Content>
            </Dialog.Root>
          ) : (
            <Progress className="command__charge" label="Jump charge" value={charge} tone="warn" />
          )}
          <Hatch className="command__hatch" hazard={charge !== null} tone={charge !== null ? 'warn' : undefined} />
        </div>
        <DataList
          className="command__data"
          rows={[
            { label: 'Fuel', value: '78%' },
            { label: 'Drive temp', value: `${412 + (charge ?? 0) * 6} K`, tone: charge !== null ? 'warn' : undefined },
          ]}
        />
      </div>

      <Wing side="right" className="bridge__wing" key={`right-${place}`}>
        <Panel title="Target" meta={`TRK-${target.id.toUpperCase()}`} footer={[target.hull.toUpperCase(), `SIG ${target.signature}`]} className="bridge__target" enterDelay={260}>
          <div className="stack">
            <Hologram key={target.id} model={target.model} integrity={integrity} label={`Wireframe scan of ${target.name}`} />
            <div className="row row--between">
              <p className="target-name">
                <DecodeText key={target.id} text={target.name} duration={420} />
              </p>
              <Tag tone={threatTone}>{target.kind?.toUpperCase()}</Tag>
            </div>
            <div className="target-stats">
              <Readout label="Range" value={target.distance} unit="km" note={`BRG ${pad(target.bearing, 3)}`} />
              <Readout label="Threat" value={target.threat} tone={threatTone} note={`HULL ${Math.round(integrity * 100)}%`} />
            </div>
            <DataList
              rows={[
                { label: 'Speed', value: `${target.speed} M/S` },
                { label: 'Vector', value: target.heading },
                { label: 'Time to contact', value: stamp(Math.round((target.distance * 1000) / target.speed)) },
              ]}
            />
            <Select label="Weapon" items={WEAPONS} value={weapon} onValueChange={setWeapon} />
            <div className="row">
              <Button variant={locked ? 'secondary' : 'primary'} disabled={jumping} onClick={toggleLock}>
                {locked ? 'Release lock' : 'Lock target'}
              </Button>
              <Tooltip content={locked ? 'Fire on target' : 'Lock a target before firing'}>
                <Button variant="danger" disabled={!locked || jumping} focusableWhenDisabled onClick={fire}>
                  Fire
                </Button>
              </Tooltip>
            </div>
          </div>
        </Panel>
      </Wing>

      {transit && (
        <div className="transit" role="status">
          <p className="transit__title">
            <DecodeText text="IN TRANSIT" duration={700} />
          </p>
          <p className="mh-micro">{destination.name.toUpperCase()} / 4.2 LY</p>
        </div>
      )}
    </Cockpit>
  );
}
