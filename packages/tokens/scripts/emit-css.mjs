import { mkdirSync, writeFileSync } from 'node:fs';
import { renderTokensCss } from '../src/index.ts';

const css = renderTokensCss();
const root = new URL('../', import.meta.url);
mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/tokens.css', root), css);
writeFileSync(new URL('../css/src/tokens.generated.css', root), css);
