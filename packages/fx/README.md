# @monohud/fx

The effects engine behind [Monohud](https://github.com/jshguo-labs/monohud#readme). Framework-free TypeScript with no dependencies. Use it directly to drive the same effects from Vue, Svelte or plain JavaScript.

## Install

```bash
npm install @monohud/fx
```

## What it contains

- **Starfield:** `createStarfield(canvas, state)` draws nebula, stars, a planet limb and warp in WebGL2. It returns `null` without WebGL2, recovers from context loss, and frees its GPU resources on `dispose()`.
- **Wireframe 3D:** `drawTactical` and `drawHologram` paint a stalk radar and turning hulls on a 2D canvas. `wireModel(name)` returns the built-in hulls.
- **Frames:** `framePath`, `frameAccents` and `frameDetail` build SVG paths for chamfered outlines with notches.
- **Signal distortion:** `createDistortion(filter, root, amount)` drives an SVG filter that tears the picture in bursts.
- **Decode text:** `decode({ text, onFrame })` resolves text from scrambled glyphs.
- **Waveform:** `drawWaveform` paints a live signal trace.
- **Sound:** `createBleeps()` synthesises interface sounds with WebAudio, and `installBleeps(root, bleeps)` plays them for controls through event delegation.
- **Motion:** `motionLevel(element)` reads the nearest `data-mh-motion` and respects `prefers-reduced-motion`.

## Example

```ts
import { createStarfield } from '@monohud/fx';

const starfield = createStarfield(canvas, () => ({ warp: 0, body: 1 }));
starfield?.flash();
// later
starfield?.dispose();
```

Full documentation: [github.com/jshguo-labs/monohud](https://github.com/jshguo-labs/monohud#readme)

## License

MIT
