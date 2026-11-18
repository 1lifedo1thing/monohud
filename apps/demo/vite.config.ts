import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@monohud/css': src('../../packages/css/src/index.css'),
      '@monohud/fx': src('../../packages/fx/src/index.ts'),
      '@monohud/react': src('../../packages/react/src/index.ts'),
      '@monohud/tokens': src('../../packages/tokens/src/index.ts'),
    },
  },
});
