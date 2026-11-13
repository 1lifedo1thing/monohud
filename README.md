# Monohud

Sci-fi React components for game and immersive interfaces. Behaviour, keyboard support and accessibility come from [Base UI](https://base-ui.com).

## Install

```bash
npm install @monohud/react @monohud/css
```

Requires React 18 or 19.

## Usage

```tsx
import '@monohud/css';
import { Button, Panel, MonohudProvider } from '@monohud/react';

export function App() {
  return (
    <MonohudProvider motion="full">
      <Panel title="Ship systems">
        <Button variant="primary">Start jump</Button>
      </Panel>
    </MonohudProvider>
  );
}
```

The default theme is monochrome, with colour reserved for status. Pass `theme="sodium"`, `"ion"` or `"ember"` for a coloured accent. Overlays render inside `MonohudProvider`, so theme and motion settings reach them too. Fonts are not bundled: load Geist Mono (for example from `@fontsource-variable/geist-mono`), or the system monospace fallback applies.

`distortion` on `MonohudProvider` sets a signal fault across the whole interface, from `0` (off) to `1`, and defaults to `0.15`. It is a number so game state can drive it, for example `distortion={1 - hull}`. `alert` sets the ship condition to `none`, `caution` or `red`, and tints the frame lines and display edge everywhere. While the filter runs, `position: fixed` elements inside your own content are positioned against the provider's direct child; `Dialog`, other overlays and `Starfield` are not affected.

A full scene puts `Starfield` first inside the provider, then wraps the layout in `Cockpit`:

```tsx
<MonohudProvider alert={underFire ? 'red' : 'none'}>
  <Starfield warp={jumping ? 1 : 0} body={1} flash={arrivals} />
  <Cockpit>
    <Wing side="left">{/* panels */}</Wing>
    <TacticalVolume contacts={contacts} label="Tactical volume" selected={target} onSelect={select} />
    <Wing side="right">
      <Hologram model="corvette" integrity={0.7} label="Target scan" />
    </Wing>
  </Cockpit>
</MonohudProvider>
```

`Starfield` needs WebGL2 and shows a plain dark surface without it. `Hologram` accepts a built-in hull (`corvette`, `frigate`, `freighter`, `swarm`) or your own `{ vertices, edges }`. `TacticalVolume` contacts stay real buttons, and the view orbits by drag or arrow keys. It starts tilted to show the stalks; `defaultView="top"` starts face-on.

`Progress` and `Meter` draw real cells. `cells="auto"` is the default: the count fits the width, and the value lights whole cells only, so nothing shows part-filled. Only an empty bar shows no cells, and only a complete one shows them all. Pass a number for a fixed count, which fills smoothly through its cells. `gap` sets the space between cells in pixels in both modes, and `cellWidth` sets the smallest cell in `auto`.

```tsx
<Progress label="Jump charge" value={64} cells={12} gap={4} />
<Progress label="Jump charge" value={64} gap={1} />
```

## Accessibility

Base UI handles keyboard support and focus. The kit adds the visual layer on top, so motion is the part to check for your players:

- `prefers-reduced-motion` always wins and turns motion off.
- `Starfield`'s white-out only runs at `motion="full"`, and the red alert only pulses at `motion="full"`.
- Your code decides how often `flash` and `alert` fire. Keep full-screen flashes under three per second, and offer a setting for `motion` and `distortion` in your game.
- Tears make text briefly unreadable. Do not put the only copy of critical information behind a high `distortion`.

## Development

```bash
pnpm install
```

```bash
pnpm dev
```

```bash
pnpm test
```

```bash
pnpm typecheck
```

```bash
pnpm build
```

The demo runs at `http://127.0.0.1:5180`, with a playable bridge screen and a component catalog.

## Packages

| Package | Contents |
|---|---|
| `@monohud/tokens` | Design tokens and themes |
| `@monohud/css` | Plain CSS with no framework dependency |
| `@monohud/fx` | Zero-dependency engine: WebGL starfield, wireframe 3D, chamfer paths, signal distortion, decode text, waveform, synthesised sound |
| `@monohud/react` | React components |

## Components

- **Core:** Button, Input, Field, Form, Checkbox, Switch, Radio, RadioGroup, Slider, Select, Tabs, Dialog, Tooltip, Menu, Progress, Meter, and toasts through `useToast`.
- **HUD:** Frame, Panel, DecodeText, Readout, Status, Gauge, Radar, Waveform, LogStream, Reticle, GridBackground.
- **Scene and volume:** Starfield, TacticalVolume, Hologram, Tape, Cockpit, Wing.
- **Detail primitives:** Ruler, Hatch, Barcode, Tag, DataList.

## License

[MIT](LICENSE)
