import { readFileSync } from 'node:fs';

// Next.js treats the bundle as server code without this, and a bundler can drop it silently.
const code = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const types = readFileSync(new URL('../dist/index.d.ts', import.meta.url), 'utf8');
if (!code.startsWith("'use client';")) throw new Error("dist/index.js must start with 'use client'");
if (types.includes('use client')) throw new Error("dist/index.d.ts must not contain 'use client'");
