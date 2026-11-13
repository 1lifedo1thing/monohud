import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: true,
  outDir: 'dist',
  fixedExtension: false,
  external: ['react', 'react-dom'],
  // Bundling drops per-file directives, and this whole package needs the client.
  outputOptions: { banner: (chunk) => (chunk.fileName.endsWith('.d.ts') ? '' : "'use client';") },
});
