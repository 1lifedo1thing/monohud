# @monohud/react

Sci-fi React components for game and immersive interfaces. Behaviour, keyboard support and accessibility come from [Base UI](https://base-ui.com); Monohud adds the look, motion, sound and game-specific components.

## Install

```bash
npm install @monohud/react @monohud/css
```

Requires React 18 or 19. Fonts are not bundled: load Geist Mono (for example from `@fontsource-variable/geist-mono`), or the system monospace fallback applies.

## Usage

```tsx
import '@monohud/css';
import { Button, MonohudProvider, Panel } from '@monohud/react';

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

Every component must render inside `MonohudProvider`. It sets `theme`, `motion`, `detail`, `distortion`, `alert` and `sound` for everything below it, and overlays render inside it too. The package is marked `'use client'`, so it works from a Next.js server component page.

## Components

- **Core:** Button, Input, Field, Form, Checkbox, Switch, Radio, RadioGroup, Slider, Select, Tabs, Dialog, Tooltip, Menu, Progress, Meter, and toasts through `useToast`.
- **HUD:** Frame, Panel, DecodeText, Readout, Status, Gauge, Radar, Waveform, LogStream, Reticle, GridBackground.
- **Scene and volume:** Starfield, TacticalVolume, Hologram, Tape, Cockpit, Wing.
- **Detail primitives:** Ruler, Hatch, Barcode, Tag, DataList.

Full documentation: [github.com/jshguo-labs/monohud](https://github.com/jshguo-labs/monohud#readme)

## License

MIT
