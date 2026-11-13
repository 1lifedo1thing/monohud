# @monohud/css

The Monohud stylesheet: plain CSS with no framework dependency. [`@monohud/react`](https://www.npmjs.com/package/@monohud/react) renders the markup these styles expect, so most projects install both.

## Install

```bash
npm install @monohud/css
```

## Usage

Import it once, in a bundler that handles CSS:

```ts
import '@monohud/css';
```

Styles apply inside an element with the `mh-root` class, which `MonohudProvider` renders for you. Without React, set it up yourself:

```html
<div class="mh-root" data-mh-theme="mono" data-mh-motion="full">
  <button class="mh-button mh-cut" data-variant="primary">Start jump</button>
</div>
```

- **Themes:** `data-mh-theme` takes `mono`, `sodium`, `ion` or `ember`.
- **Motion:** `data-mh-motion` takes `off`, `subtle` or `full`. `prefers-reduced-motion` always turns motion off.
- **Custom properties:** every design token is a `--mh-*` variable, such as `--mh-accent`, so you can override one on any element.
- **Cascade layers:** rules sit in `mh.tokens`, `mh.base` and `mh.components`, so your own unlayered CSS wins without `!important`.

Class names follow the markup that `@monohud/react` produces. They may change between minor versions until 1.0.

Full documentation: [github.com/jshguo-labs/monohud](https://github.com/jshguo-labs/monohud#readme)

## License

MIT
