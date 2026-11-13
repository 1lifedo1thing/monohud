# @monohud/tokens

Design tokens for [Monohud](https://github.com/jshguo-labs/monohud#readme): colours, themes, scale and fonts, as JavaScript values and as CSS custom properties. [`@monohud/css`](https://www.npmjs.com/package/@monohud/css) already includes them, so install this only to read the values in code or to use the variables on their own.

## Install

```bash
npm install @monohud/tokens
```

## Usage

As CSS custom properties, all prefixed `--mh-`:

```ts
import '@monohud/tokens/tokens.css';
```

As values:

```ts
import { fonts, palette, scale, themes } from '@monohud/tokens';

themes.sodium.accent;
```

- **`palette`:** ground, line, text and status colours. The default has zero chroma, so only status colours carry hue.
- **`themes`:** `mono`, `sodium`, `ion` and `ember`. Each replaces the accent colours only, and applies through `data-mh-theme`.
- **`scale`:** spacing, type sizes, chamfer sizes, durations and easings.
- **`fonts`:** the display, body and data font stacks.
- **`renderTokensCss()`:** returns the same stylesheet as `tokens.css`, for build scripts.

## License

MIT
