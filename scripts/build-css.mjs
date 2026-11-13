import { mkdirSync, writeFileSync } from 'node:fs';
import { bundle } from 'lightningcss';

const { code } = bundle({ filename: 'src/index.css', minify: true });
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.css', code);
